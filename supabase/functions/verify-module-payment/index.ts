import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyModulePaymentRequest {
  paymentId: string;
  referenceNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[VERIFY-MODULE-PAYMENT] Request received');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { paymentId, referenceNumber }: VerifyModulePaymentRequest = await req.json();
    console.log('[VERIFY-MODULE-PAYMENT] Verifying payment:', { paymentId, referenceNumber });

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar pagamento de módulo
    const { data: payment, error: paymentError } = await supabase
      .from('module_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Module payment not found');
    }

    console.log('[VERIFY-MODULE-PAYMENT] Payment found:', {
      order_id: payment.order_id,
      status: payment.status,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number
    });

    // Só verificar pagamentos AppyPay (express ou reference)
    if (!['express', 'reference'].includes(payment.payment_method)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Este pagamento não é do AppyPay'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Obter credenciais AppyPay
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const authBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL');
    const apiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    const resource = Deno.env.get('APPYPAY_RESOURCE');
    const grantType = Deno.env.get('APPYPAY_GRANT_TYPE');

    if (!clientId || !clientSecret || !authBaseUrl || !apiBaseUrl) {
      throw new Error('AppyPay credentials not configured');
    }

    // Obter token OAuth
    console.log('[VERIFY-MODULE-PAYMENT] Getting OAuth token...');
    const tokenParams = new URLSearchParams({
      grant_type: grantType || 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      resource: resource || apiBaseUrl
    });

    const tokenResponse = await fetch(authBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[VERIFY-MODULE-PAYMENT] Token error:', errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Erro ao autenticar com AppyPay',
        error: 'Failed to get authentication token'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('No access token received from AppyPay');
    }
    
    console.log('[VERIFY-MODULE-PAYMENT] Token obtained successfully');

    // Determinar o ID da transação para consultar
    // Para pagamentos Express: usar order_id como merchantTransactionId
    // Para pagamentos Reference: não podemos verificar automaticamente
    let checkUrl: string;
    
    if (payment.payment_method === 'express') {
      // Para Express, usar o order_id como merchantTransactionId
      const transactionId = payment.order_id;
      checkUrl = `${apiBaseUrl}/v2.0/charges/${transactionId}`;
      console.log('[VERIFY-MODULE-PAYMENT] Checking Express transaction:', transactionId);
    } else if (payment.payment_method === 'reference') {
      // Para Reference, não há API de verificação automática
      // O pagamento deve ser confirmado manualmente ou via webhook
      return new Response(JSON.stringify({
        success: false,
        message: 'Pagamentos por Referência Multibanco não podem ser verificados automaticamente. Aguarde a confirmação automática via webhook ou confirme manualmente após receber o pagamento.',
        cannotVerify: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'Método de pagamento não suportado para verificação automática',
        cannotVerify: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('[VERIFY-MODULE-PAYMENT] Check error:', errorText);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Transação não encontrada no AppyPay',
        details: errorText
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const transactionData = await checkResponse.json();
    console.log('[VERIFY-MODULE-PAYMENT] Transaction data:', JSON.stringify(transactionData, null, 2));

    // Extrair status
    const paymentStatus = transactionData.responseStatus?.status;
    const isSuccessful = transactionData.responseStatus?.successful;
    
    let newPaymentStatus = payment.status; // Manter status atual por padrão
    
    if (isSuccessful && paymentStatus === 'Success') {
      newPaymentStatus = 'completed';
    } else if (!isSuccessful || paymentStatus === 'Failed') {
      newPaymentStatus = 'failed';
    } else if (paymentStatus === 'Pending') {
      newPaymentStatus = 'pending';
    }

    console.log('[VERIFY-MODULE-PAYMENT] Status comparison:', {
      currentStatus: payment.status,
      appyPayStatus: paymentStatus,
      newStatus: newPaymentStatus
    });

    // Atualizar se mudou
    if (payment.status !== newPaymentStatus) {
      console.log('[VERIFY-MODULE-PAYMENT] Updating payment status...');
      
      const updateData: any = {
        status: newPaymentStatus,
        updated_at: new Date().toISOString(),
        payment_data: {
          ...payment.payment_data,
          last_verification: new Date().toISOString(),
          appypay_response: transactionData.responseStatus
        }
      };

      if (newPaymentStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('module_payments')
        .update(updateData)
        .eq('id', payment.id);

      if (updateError) {
        throw new Error(`Failed to update payment: ${updateError.message}`);
      }

      console.log('[VERIFY-MODULE-PAYMENT] Payment updated successfully');

      // Se pagamento foi completado, liberar acesso ao módulo
      if (newPaymentStatus === 'completed' && payment.status !== 'completed') {
        console.log('[VERIFY-MODULE-PAYMENT] Payment completed - granting module access...');
        
        // Buscar dados do aluno e módulo
        const { data: studentData } = await supabase
          .from('member_area_students')
          .select('cohort_id')
          .eq('member_area_id', payment.member_area_id)
          .ilike('student_email', payment.student_email)
          .single();

        if (studentData?.cohort_id) {
          // Buscar módulo
          const { data: moduleData } = await supabase
            .from('modules')
            .select('coming_soon_cohort_ids')
            .eq('id', payment.module_id)
            .single();

          if (moduleData && moduleData.coming_soon_cohort_ids?.includes(studentData.cohort_id)) {
            const updatedComingSoonCohorts = moduleData.coming_soon_cohort_ids.filter(
              (id: string) => id !== studentData.cohort_id
            );

            await supabase
              .from('modules')
              .update({
                coming_soon_cohort_ids: updatedComingSoonCohorts.length > 0 
                  ? updatedComingSoonCohorts 
                  : null
              })
              .eq('id', payment.module_id);

            console.log('[VERIFY-MODULE-PAYMENT] Module access granted to student');
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        updated: true,
        oldStatus: payment.status,
        newStatus: newPaymentStatus,
        transactionData: transactionData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      updated: false,
      status: payment.status,
      message: 'Status inalterado',
      transactionData: transactionData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[VERIFY-MODULE-PAYMENT] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
