import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessReferralRequest {
  referredUserId: string;
  referralCode: string;
  ipAddress?: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { referredUserId, referralCode, ipAddress, userAgent }: ProcessReferralRequest = await req.json();

    console.log('=== PROCESSING SELLER REFERRAL ===');
    console.log('Referred User ID:', referredUserId);
    console.log('Referral Code:', referralCode);

    // 1. Validar código de indicação
    if (!referralCode || referralCode.length < 4) {
      console.log('❌ Invalid referral code');
      return new Response(
        JSON.stringify({ error: 'Código de indicação inválido' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Buscar indicador pelo código
    const { data: referrerProfile, error: referrerError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (referrerError || !referrerProfile) {
      console.log('❌ Referrer not found for code:', referralCode);
      return new Response(
        JSON.stringify({ error: 'Código de indicação não encontrado' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('✅ Referrer found:', referrerProfile.full_name);

    // 3. Verificar se não está indicando a si mesmo
    if (referrerProfile.user_id === referredUserId) {
      console.log('❌ Self-referral attempt blocked');
      return new Response(
        JSON.stringify({ error: 'Não é permitido indicar a si mesmo' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4. Verificar se o usuário já foi indicado
    const { data: existingReferral } = await supabase
      .from('seller_referrals')
      .select('id')
      .eq('referred_id', referredUserId)
      .single();

    if (existingReferral) {
      console.log('❌ User already has a referrer');
      return new Response(
        JSON.stringify({ error: 'Este usuário já possui um indicador' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Verificar se indicador é vendedor ativo (tem pelo menos 1 produto ou venda)
    const { data: referrerProducts } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', referrerProfile.user_id)
      .limit(1);

    const { data: referrerOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', referrerProfile.user_id)
      .eq('status', 'completed')
      .limit(1);

    const isActiveSeller = (referrerProducts && referrerProducts.length > 0) || 
                           (referrerOrders && referrerOrders.length > 0);

    // Por enquanto, permitir qualquer vendedor registrado
    // if (!isActiveSeller) {
    //   console.log('❌ Referrer is not an active seller');
    //   return new Response(
    //     JSON.stringify({ error: 'Indicador não é um vendedor ativo' }),
    //     { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    //   );
    // }

    // 6. Verificações antifraude básicas
    const fraudCheck: Record<string, any> = {
      ipAddress,
      userAgent,
      checkedAt: new Date().toISOString(),
      flags: [],
    };

    // Verificar se mesmo IP foi usado pelo indicador recentemente
    const { data: referrerRecentReferrals } = await supabase
      .from('seller_referrals')
      .select('fraud_check')
      .eq('referrer_id', referrerProfile.user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (referrerRecentReferrals && ipAddress) {
      const sameIpCount = referrerRecentReferrals.filter(r => 
        r.fraud_check?.ipAddress === ipAddress
      ).length;
      
      if (sameIpCount >= 3) {
        fraudCheck.flags.push('multiple_referrals_same_ip');
        console.log('⚠️ Warning: Multiple referrals from same IP');
      }
    }

    // 7. Buscar email do indicado para verificação
    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', referredUserId)
      .single();

    // Verificar emails similares
    if (referredProfile?.email && referrerProfile.email) {
      const referredEmailBase = referredProfile.email.split('@')[0].replace(/[0-9]/g, '');
      const referrerEmailBase = referrerProfile.email.split('@')[0].replace(/[0-9]/g, '');
      
      if (referredEmailBase === referrerEmailBase) {
        fraudCheck.flags.push('similar_email_pattern');
        console.log('⚠️ Warning: Similar email patterns detected');
      }
    }

    // Se muitas flags de fraude, bloquear
    if (fraudCheck.flags.length >= 2) {
      console.log('❌ Blocked due to fraud signals:', fraudCheck.flags);
      return new Response(
        JSON.stringify({ error: 'Indicação bloqueada por segurança' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 8. Verificar limite de indicações ativas do indicador
    const { count: activeReferralsCount } = await supabase
      .from('seller_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', referrerProfile.user_id)
      .in('status', ['pending', 'active']);

    if (activeReferralsCount && activeReferralsCount >= 100) {
      console.log('❌ Referrer has reached maximum referrals limit');
      return new Response(
        JSON.stringify({ error: 'Limite máximo de indicações atingido' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 9. Criar registro de indicação
    const { data: newReferral, error: insertError } = await supabase
      .from('seller_referrals')
      .insert({
        referrer_id: referrerProfile.user_id,
        referred_id: referredUserId,
        referral_code: referralCode.toUpperCase(),
        status: 'pending',
        fraud_check: fraudCheck,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating referral:', insertError);
      throw insertError;
    }

    console.log('✅ Referral created successfully:', newReferral.id);

    // 10. Notificar indicador (opcional - criar notificação)
    try {
      await supabase.from('seller_notifications').insert({
        user_id: referrerProfile.user_id,
        type: 'new_referral',
        title: 'Novo vendedor indicado!',
        message: `Um novo vendedor se registrou usando seu código de indicação.`,
        data: { referral_id: newReferral.id },
      });
    } catch (notifError) {
      // Não falhar se notificação não funcionar
      console.log('Warning: Could not create notification', notifError);
    }

    console.log('=== SELLER REFERRAL PROCESSED ===');

    return new Response(
      JSON.stringify({
        success: true,
        referralId: newReferral.id,
        referrerName: referrerProfile.full_name,
        message: 'Indicação registrada com sucesso',
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("=== ERROR IN PROCESS SELLER REFERRAL ===");
    console.error("Error:", error);

    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao processar indicação',
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
