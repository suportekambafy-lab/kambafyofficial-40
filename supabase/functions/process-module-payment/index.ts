import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('💰 [PROCESS-MODULE-PAYMENT] Request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      moduleId, 
      memberAreaId, 
      studentEmail, 
      paymentMethod, 
      amount,
      phoneNumber,
      transferProofUrl 
    } = await req.json();
    
    console.log('📋 [PROCESS-MODULE-PAYMENT] Request data:', {
      moduleId,
      memberAreaId,
      studentEmail,
      paymentMethod,
      amount
    });

    // Validar dados
    if (!moduleId || !memberAreaId || !studentEmail) {
      throw new Error('Dados inválidos');
    }

    // Buscar informações do módulo
    const { data: moduleData, error: moduleError } = await supabase
      .from('modules')
      .select('*, member_areas(user_id)')
      .eq('id', moduleId)
      .single();

    if (moduleError || !moduleData) {
      console.error('❌ Module not found:', moduleError);
      throw new Error('Módulo não encontrado');
    }

    console.log('📚 [PROCESS-MODULE-PAYMENT] Module found:', {
      moduleId: moduleData.id,
      title: moduleData.title,
      sellerId: moduleData.member_areas?.user_id
    });

    if (paymentMethod === 'express') {
      // Processar pagamento AppyPay
      console.log('💳 [PROCESS-MODULE-PAYMENT] Processing AppyPay Express payment');
      
      // Buscar credenciais AppyPay do vendedor
      const sellerId = moduleData.member_areas?.user_id;
      
      // Gerar order_id único
      const orderId = `MOD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const merchantTransactionId = `TR${Date.now().toString().substr(-10)}`;

      // Chamar função de pagamento AppyPay
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-appypay-charge', {
        body: {
          productId: moduleData.paid_product_id || moduleId, // Usar paid_product_id se existir
          customerEmail: studentEmail,
          customerName: studentEmail.split('@')[0],
          amount: amount,
          currency: 'AOA',
          paymentMethod: 'express',
          phoneNumber: phoneNumber,
          checkoutData: {
            orderId,
            merchantTransactionId,
            moduleId,
            memberAreaId
          }
        }
      });

      if (paymentError || !paymentData?.success) {
        console.error('❌ [PROCESS-MODULE-PAYMENT] Payment failed:', paymentError);
        throw new Error(paymentData?.error || 'Erro ao processar pagamento');
      }

      console.log('✅ [PROCESS-MODULE-PAYMENT] Payment successful');

      // Liberar acesso ao módulo - remover turma dos coming_soon_cohort_ids
      const { data: studentData } = await supabase
        .from('member_area_students')
        .select('cohort_id')
        .eq('member_area_id', memberAreaId)
        .ilike('student_email', studentEmail)
        .single();

      if (studentData?.cohort_id) {
        const currentComingSoonCohorts = moduleData.coming_soon_cohort_ids || [];
        const updatedComingSoonCohorts = currentComingSoonCohorts.filter(
          (id: string) => id !== studentData.cohort_id
        );

        // Atualizar módulo removendo a turma de coming_soon_cohort_ids
        const { error: updateError } = await supabase
          .from('modules')
          .update({
            coming_soon_cohort_ids: updatedComingSoonCohorts.length > 0 ? updatedComingSoonCohorts : null
          })
          .eq('id', moduleId);

        if (updateError) {
          console.error('❌ [PROCESS-MODULE-PAYMENT] Error updating module:', updateError);
        } else {
          console.log('✅ [PROCESS-MODULE-PAYMENT] Module access granted to student');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento processado com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (paymentMethod === 'transfer') {
      // Pagamento por transferência - criar registro pendente
      console.log('🏦 [PROCESS-MODULE-PAYMENT] Processing transfer payment');
      
      // Criar registro de pagamento pendente
      // (Aqui você pode criar uma tabela module_payments para registrar)
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Comprovante recebido, aguardando análise'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Método de pagamento inválido');

  } catch (error: any) {
    console.error('💥 [PROCESS-MODULE-PAYMENT] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
