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
      customerName,
      paymentMethod, 
      amount,
      phoneNumber,
      transferProofUrl,
      country
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

    if (paymentMethod === 'express' || paymentMethod === 'reference') {
      // Processar pagamento AppyPay (Express ou Reference)
      console.log(`💳 [PROCESS-MODULE-PAYMENT] Processing AppyPay ${paymentMethod} payment`);
      
      // Gerar order_id único
      const orderId = `MOD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const merchantTransactionId = `TR${Date.now().toString().substr(-10)}`;

      // Chamar função de pagamento AppyPay
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-appypay-charge', {
        body: {
          amount: parseFloat(amount.toString()),
          productId: moduleData.paid_product_id || moduleId,
          customerData: {
            email: studentEmail,
            name: customerName || studentEmail.split('@')[0],
            phone: phoneNumber
          },
          originalAmount: parseFloat(amount.toString()),
          originalCurrency: 'AOA',
          paymentMethod: paymentMethod,
          phoneNumber: phoneNumber,
          orderData: {
            product_id: moduleData.paid_product_id || moduleId,
            order_id: orderId,
            customer_name: customerName || studentEmail.split('@')[0],
            customer_email: studentEmail,
            customer_phone: phoneNumber,
            amount: amount.toString(),
            currency: 'AOA',
            payment_method: paymentMethod,
            user_id: null,
            seller_commission: parseFloat(amount.toString())
          }
        }
      });

      if (paymentError || !paymentData?.success) {
        console.error('❌ [PROCESS-MODULE-PAYMENT] Payment failed:', paymentError);
        throw new Error(paymentData?.error || 'Erro ao processar pagamento');
      }

      console.log('✅ [PROCESS-MODULE-PAYMENT] Payment successful:', paymentData);

      // Registrar pagamento na tabela module_payments
      const paymentStatus = paymentMethod === 'express' && paymentData.payment_status === 'completed' 
        ? 'completed' 
        : 'pending';

      const { error: modulePaymentError } = await supabase
        .from('module_payments')
        .insert({
          module_id: moduleId,
          member_area_id: memberAreaId,
          student_email: studentEmail,
          student_name: customerName || studentEmail.split('@')[0],
          cohort_id: null, // Será atualizado quando o aluno for associado
          order_id: orderId,
          amount: parseFloat(amount.toString()),
          currency: 'AOA',
          payment_method: paymentMethod,
          status: paymentStatus,
          payment_data: paymentData,
          reference_number: paymentData.reference_number,
          entity: paymentData.entity,
          due_date: paymentData.due_date,
          completed_at: paymentStatus === 'completed' ? new Date().toISOString() : null
        });

      if (modulePaymentError) {
        console.error('❌ [PROCESS-MODULE-PAYMENT] Error saving module payment:', modulePaymentError);
        // Não lançar erro para não bloquear o fluxo
      } else {
        console.log('✅ [PROCESS-MODULE-PAYMENT] Module payment recorded');
      }

      // Se for Express e pagamento confirmado, liberar acesso imediatamente
      if (paymentMethod === 'express' && paymentData.payment_status === 'completed') {
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

          await supabase
            .from('modules')
            .update({
              coming_soon_cohort_ids: updatedComingSoonCohorts.length > 0 ? updatedComingSoonCohorts : null
            })
            .eq('id', moduleId);

          console.log('✅ [PROCESS-MODULE-PAYMENT] Module access granted to student');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: paymentMethod === 'reference' ? 'Referência gerada com sucesso' : 'Pagamento processado com sucesso',
          reference_number: paymentData.reference_number,
          entity: paymentData.entity,
          due_date: paymentData.due_date,
          payment_status: paymentData.payment_status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else if (paymentMethod === 'transfer' || paymentMethod === 'emola' || paymentMethod === 'epesa') {
      // Pagamento por transferência - criar registro pendente
      console.log('🏦 [PROCESS-MODULE-PAYMENT] Processing transfer payment');
      
      const transferOrderId = `MOD_TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Criar registro de pagamento pendente para transferência
      const { error: modulePaymentError } = await supabase
        .from('module_payments')
        .insert({
          module_id: moduleId,
          member_area_id: memberAreaId,
          student_email: studentEmail,
          student_name: customerName || studentEmail.split('@')[0],
          order_id: transferOrderId,
          amount: parseFloat(amount.toString()),
          currency: 'AOA',
          payment_method: paymentMethod,
          status: 'pending',
          payment_proof_url: transferProofUrl,
          payment_data: {
            country,
            phoneNumber,
            accountHolder,
            accountIban
          }
        });

      if (modulePaymentError) {
        console.error('❌ [PROCESS-MODULE-PAYMENT] Error saving transfer payment:', modulePaymentError);
        throw new Error('Erro ao registrar pagamento por transferência');
      }

      console.log('✅ [PROCESS-MODULE-PAYMENT] Transfer payment recorded');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Comprovante recebido, aguardando análise',
          order_id: transferOrderId
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
