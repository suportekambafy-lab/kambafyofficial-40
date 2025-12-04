import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUSPEND-EXPIRED] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Cron job started");

    const today = new Date().toISOString().split('T')[0];

    // Buscar assinaturas manuais ativas que venceram
    const { data: expiredSubs, error: subError } = await supabaseClient
      .from('customer_subscriptions')
      .select('*, products(*)')
      .eq('renewal_type', 'manual')
      .eq('status', 'active')
      .lt('current_period_end', today);

    if (subError) {
      throw new Error(`Error fetching expired subscriptions: ${subError.message}`);
    }

    logStep(`Found ${expiredSubs?.length || 0} expired subscriptions`);

    let suspended = 0;

    for (const sub of expiredSubs || []) {
      const config = sub.products?.subscription_config || {};
      const gracePeriodDays = config.grace_period_days || 0;
      
      const gracePeriodEnd = gracePeriodDays > 0
        ? new Date(Date.now() + gracePeriodDays * 86400000).toISOString()
        : null;

      logStep(`Suspending subscription ${sub.id}`, {
        customerEmail: sub.customer_email,
        gracePeriodDays,
        gracePeriodEnd
      });

      // Atualizar assinatura para past_due
      const { error: updateError } = await supabaseClient
        .from('customer_subscriptions')
        .update({
          status: 'past_due',
          suspension_date: new Date().toISOString(),
          grace_period_end: gracePeriodEnd
        })
        .eq('id', sub.id);

      if (updateError) {
        logStep(`Error updating subscription ${sub.id}`, updateError);
        continue;
      }

      // Bloquear acesso
      await supabaseClient
        .from('customer_access')
        .update({ is_active: false })
        .eq('customer_email', sub.customer_email)
        .eq('product_id', sub.product_id);

      // 📢 DISPARAR WEBHOOK subscription.payment_failed
      logStep(`Triggering subscription.payment_failed webhook for ${sub.customer_email}`);
      
      try {
        const webhookPayload = {
          event: 'subscription.payment_failed',
          user_id: sub.products?.user_id,
          product_id: sub.product_id,
          subscription_id: sub.id,
          // Dados do cliente
          customer_email: sub.customer_email,
          customer_name: sub.customer_name,
          // Dados da assinatura
          product_name: sub.products?.name,
          subscription_interval: config.interval || 'month',
          subscription_interval_count: config.interval_count || 1,
          // Status e datas
          status: 'past_due',
          expired_at: sub.current_period_end,
          suspension_date: new Date().toISOString(),
          grace_period_days: gracePeriodDays,
          grace_period_end: gracePeriodEnd,
          // Ação recomendada
          action_required: 'payment_renewal',
          message: `Assinatura expirada. ${gracePeriodDays > 0 ? `Período de graça: ${gracePeriodDays} dias.` : 'Acesso bloqueado.'}`
        };

        const { error: webhookError } = await supabaseClient.functions.invoke('trigger-webhooks', {
          body: webhookPayload
        });

        if (webhookError) {
          logStep(`Error triggering webhook for ${sub.id}`, webhookError);
        } else {
          logStep(`✅ Webhook subscription.payment_failed triggered for ${sub.customer_email}`);
        }
      } catch (webhookErr) {
        logStep(`Error in webhook trigger`, webhookErr);
      }

      // Gerar token de reativação
      const { data: token } = await supabaseClient
        .rpc('generate_renewal_token', { p_subscription_id: sub.id });

      const reactivationLink = `${req.headers.get("origin") || "https://kambafy.com"}/renovar/${token}`;
      const discountPercentage = config.reactivation_discount_percentage || 0;

      // Enviar email de reativação
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Kambafy <noreply@kambafy.com>',
              to: sub.customer_email,
              subject: `Sua assinatura expirou - Reative agora${discountPercentage > 0 ? ` com ${discountPercentage}% de desconto` : ''}`,
              html: `
                <h2>Olá ${sub.customer_name},</h2>
                <p>Sua assinatura do <strong>${sub.products.name}</strong> expirou.</p>
                ${gracePeriodDays > 0 ? `<p>Você tem um período de graça de <strong>${gracePeriodDays} dias</strong> para reativar sua assinatura.</p>` : ''}
                ${discountPercentage > 0 ? `<p><strong>🎉 Desconto especial de ${discountPercentage}% para reativar!</strong></p>` : ''}
                <p><a href="${reactivationLink}" style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reativar Assinatura</a></p>
                <p>Sentimos sua falta! Reative agora e continue aproveitando.</p>
              `
            })
          });
          logStep(`Reactivation email sent to ${sub.customer_email}`);
        } catch (emailError) {
          logStep(`Error sending reactivation email`, emailError);
        }
      }

      suspended++;
    }

    logStep("Cron job completed", { suspended });

    return new Response(
      JSON.stringify({ 
        success: true, 
        suspended,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cron job", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
