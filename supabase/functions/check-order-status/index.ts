import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId, sessionId } = await req.json();

    if (!orderId && !sessionId) {
      return new Response(
        JSON.stringify({ error: "order_id ou session_id é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let orderData = null;

    // Buscar por order_id
    if (orderId) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .eq('order_id', orderId)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    // Buscar por stripe_session_id ou appypay_transaction_id se não encontrou por order_id
    if (!orderData && sessionId) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .or(`stripe_session_id.eq.${sessionId},appypay_transaction_id.eq.${sessionId}`)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    // Verificar se é UUID e buscar por ID se necessário
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    
    if (!orderData && orderId && isUuid(orderId)) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .eq('id', orderId)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    if (!orderData) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('🔍 Validando pagamento:', {
      payment_method: orderData.payment_method,
      status: orderData.status,
      has_stripe_session: !!orderData.stripe_session_id,
      has_appypay_transaction: !!orderData.appypay_transaction_id
    });

    // Validar pagamento com o provedor real
    let paymentVerified = false;
    let actualStatus = orderData.status;

    try {
      // STRIPE: Validar com Stripe SDK
      if (orderData.payment_method === 'stripe' && orderData.stripe_session_id) {
        console.log('🔐 Validando com Stripe Session:', orderData.stripe_session_id);
        
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        const stripeSession = await stripe.checkout.sessions.retrieve(orderData.stripe_session_id);
        
        console.log('📊 Stripe Session Status:', {
          payment_status: stripeSession.payment_status,
          status: stripeSession.status
        });

        if (stripeSession.payment_status === 'paid') {
          paymentVerified = true;
          actualStatus = 'completed';
          
          // Atualizar status no banco se necessário
          if (orderData.status !== 'completed') {
            await supabaseAdmin
              .from('orders')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', orderData.id);
          }
        } else {
          actualStatus = 'pending';
          console.log('⏳ Stripe: Pagamento ainda não confirmado');
        }
      }
      // APPYPAY EXPRESS: Validar com API AppyPay
      else if (orderData.payment_method === 'express' && orderData.appypay_transaction_id) {
        console.log('🔐 Validando com AppyPay Transaction:', orderData.appypay_transaction_id);
        
        // Obter credenciais AppyPay
        const appypayClientId = Deno.env.get("APPYPAY_CLIENT_ID");
        const appypayClientSecret = Deno.env.get("APPYPAY_CLIENT_SECRET");
        const appypayAuthUrl = Deno.env.get("APPYPAY_AUTH_BASE_URL");
        const appypayApiUrl = Deno.env.get("APPYPAY_API_BASE_URL");

        if (!appypayClientId || !appypayClientSecret) {
          console.log('⚠️ Credenciais AppyPay não configuradas, confiando no status do banco');
          paymentVerified = orderData.status === 'completed';
          actualStatus = orderData.status;
        } else {
          // Obter token OAuth
          const tokenResponse = await fetch(`${appypayAuthUrl}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: appypayClientId,
              client_secret: appypayClientSecret,
              resource: Deno.env.get("APPYPAY_RESOURCE") || ''
            })
          });

          if (!tokenResponse.ok) {
            console.log('⚠️ Erro ao obter token AppyPay, confiando no status do banco');
            paymentVerified = orderData.status === 'completed';
            actualStatus = orderData.status;
          } else {
            const tokenData = await tokenResponse.json();
            
            // Buscar status da transação
            const transactionResponse = await fetch(
              `${appypayApiUrl}/v2.0/transactions/${orderData.appypay_transaction_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (transactionResponse.ok) {
              const transactionData = await transactionResponse.json();
              
              console.log('📊 AppyPay Transaction Status:', {
                status: transactionData.responseStatus?.status,
                successful: transactionData.responseStatus?.successful
              });

              if (transactionData.responseStatus?.status === 'Success') {
                paymentVerified = true;
                actualStatus = 'completed';
                
                // Atualizar status no banco se necessário
                if (orderData.status !== 'completed') {
                  await supabaseAdmin
                    .from('orders')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('id', orderData.id);
                }
              } else if (transactionData.responseStatus?.status === 'Failed') {
                actualStatus = 'failed';
                
                // Atualizar status no banco se necessário
                if (orderData.status !== 'failed') {
                  await supabaseAdmin
                    .from('orders')
                    .update({ status: 'failed', updated_at: new Date().toISOString() })
                    .eq('id', orderData.id);
                }
              } else {
                actualStatus = 'pending';
                console.log('⏳ AppyPay: Pagamento ainda não confirmado');
              }
            } else {
              console.log('⚠️ Erro ao buscar transação AppyPay, confiando no status do banco');
              paymentVerified = orderData.status === 'completed';
              actualStatus = orderData.status;
            }
          }
        }
      }
      // APPYPAY REFERÊNCIA: Sempre pending até webhook confirmar
      else if (orderData.payment_method === 'reference') {
        console.log('📝 AppyPay Referência: Status baseado no banco (webhook irá atualizar)');
        paymentVerified = orderData.status === 'completed';
        actualStatus = orderData.status;
      }
      // OUTROS MÉTODOS: Confiar no status do banco
      else {
        console.log('💳 Outro método de pagamento:', orderData.payment_method);
        paymentVerified = orderData.status === 'completed';
        actualStatus = orderData.status;
      }
    } catch (validationError) {
      console.error('❌ Erro na validação de pagamento:', validationError);
      // Em caso de erro, confiar no status do banco
      paymentVerified = orderData.status === 'completed';
      actualStatus = orderData.status;
    }

    console.log('✅ Resultado da validação:', {
      actualStatus,
      paymentVerified,
      canShowUpsell: actualStatus === 'completed' && paymentVerified
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentVerified,
        order: {
          id: orderData.id,
          order_id: orderData.order_id,
          status: actualStatus,
          payment_method: orderData.payment_method,
          amount: orderData.amount,
          currency: orderData.currency,
          product_id: orderData.product_id,
          customer_email: orderData.customer_email,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});