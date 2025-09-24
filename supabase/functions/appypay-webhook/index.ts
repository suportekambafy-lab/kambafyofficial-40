import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPYPAY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook AppyPay iniciado");

    const webhookData = await req.json();
    logStep("Dados do webhook recebidos", webhookData);

    // Validar dados do webhook
    const {
      transactionId,
      referenceNumber,
      status,
      amount,
      paidAt,
      customerEmail
    } = webhookData;

    if (!transactionId || !referenceNumber || !status) {
      throw new Error('Dados obrigatórios do webhook não fornecidos');
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Buscar pagamento existente
    const { data: payment, error: fetchError } = await supabase
      .from('reference_payments')
      .select('*')
      .or(`appypay_transaction_id.eq.${transactionId},reference_number.eq.${referenceNumber}`)
      .single();

    if (fetchError || !payment) {
      logStep("Pagamento não encontrado", { transactionId, referenceNumber, error: fetchError });
      throw new Error('Pagamento não encontrado');
    }

    logStep("Pagamento encontrado", { paymentId: payment.id, currentStatus: payment.status });

    // Se já foi processado, retornar sucesso
    if (payment.status === 'paid' || payment.status === 'completed') {
      logStep("Pagamento já foi processado anteriormente");
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment already processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atualizar status do pagamento baseado no webhook
    let newStatus = payment.status;
    let paidAtTimestamp = null;

    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'success':
        newStatus = 'paid';
        paidAtTimestamp = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();
        break;
      case 'failed':
      case 'error':
      case 'rejected':
        newStatus = 'failed';
        break;
      case 'expired':
        newStatus = 'expired';
        break;
      default:
        newStatus = 'pending';
    }

    // Atualizar pagamento na base de dados
    const { error: updateError } = await supabase
      .from('reference_payments')
      .update({
        status: newStatus,
        paid_at: paidAtTimestamp,
        webhook_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateError) {
      logStep("Erro ao atualizar pagamento", { error: updateError });
      throw new Error('Erro ao atualizar status do pagamento');
    }

    logStep("Pagamento atualizado com sucesso", { 
      paymentId: payment.id, 
      newStatus, 
      paidAt: paidAtTimestamp 
    });

    // Se o pagamento foi confirmado, criar pedido principal
    if (newStatus === 'paid') {
      logStep("Criando pedido principal para pagamento confirmado");

      const orderData = {
        product_id: payment.product_id,
        order_id: payment.order_id,
        customer_name: payment.customer_name,
        customer_email: payment.customer_email,
        customer_phone: payment.customer_phone,
        amount: payment.amount.toString(),
        currency: payment.currency,
        payment_method: 'appypay',
        status: 'completed',
        user_id: payment.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderData);

      if (orderError) {
        logStep("Erro ao criar pedido principal", { error: orderError });
        // Não falhar o webhook por isso, apenas logar
      } else {
        logStep("Pedido principal criado com sucesso", { orderId: payment.order_id });
      }

      // Adicionar acesso do cliente ao produto (se aplicável)
      try {
        const { error: accessError } = await supabase
          .from('customer_access')
          .insert({
            customer_email: payment.customer_email,
            customer_name: payment.customer_name,
            product_id: payment.product_id,
            order_id: payment.order_id,
            access_granted_at: new Date().toISOString(),
            access_expires_at: null, // Acesso vitalício por padrão
            is_active: true
          });

        if (accessError) {
          logStep("Erro ao conceder acesso", { error: accessError });
        } else {
          logStep("Acesso concedido ao cliente", { 
            customerEmail: payment.customer_email,
            productId: payment.product_id 
          });
        }
      } catch (accessError) {
        logStep("Erro ao processar acesso do cliente", { error: accessError });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      paymentId: payment.id,
      newStatus,
      orderId: payment.order_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Erro no processamento do webhook", { error: error.message });
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: 'Erro ao processar webhook AppyPay'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});