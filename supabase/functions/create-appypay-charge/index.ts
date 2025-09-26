import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPYPAY-CHARGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const requestBody = await req.json();
    const { 
      amount, 
      productId, 
      customerData,
      originalAmount,
      originalCurrency = 'AOA',
      paymentMethod = 'express',
      phoneNumber
    } = requestBody;

    if (!amount || !productId || !customerData) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    logStep("Request validated", { 
      amount, 
      productId, 
      customerEmail: customerData.email,
      paymentMethod,
      phoneNumber
    });

    // Verificar se temos todas as credenciais AppyPay
    const appyPayClientId = Deno.env.get('APPYPAY_CLIENT_ID');
    const appyPayClientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
    const appyPayApiBaseUrl = Deno.env.get('APPYPAY_API_BASE_URL');
    const appyPayAuthBaseUrl = Deno.env.get('APPYPAY_AUTH_BASE_URL');
    const appyPayApplicationId = Deno.env.get('APPYPAY_APPLICATION_ID');

    logStep("Checking AppyPay credentials", {
      hasClientId: !!appyPayClientId,
      hasClientSecret: !!appyPayClientSecret,
      hasApiBaseUrl: !!appyPayApiBaseUrl,
      hasAuthBaseUrl: !!appyPayAuthBaseUrl,
      hasApplicationId: !!appyPayApplicationId
    });

    if (!appyPayClientId || !appyPayClientSecret || !appyPayApiBaseUrl || !appyPayAuthBaseUrl || !appyPayApplicationId) {
      logStep("CRITICAL ERROR: Missing AppyPay credentials");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Credenciais AppyPay não configuradas. Contacte o suporte.',
          code: 'MISSING_CREDENTIALS'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    logStep("AppyPay credentials verified");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Gerar token de acesso AppyPay
    const tokenResponse = await fetch(`${appyPayAuthBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: appyPayClientId,
        client_secret: appyPayClientSecret,
        resource: appyPayApplicationId
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logStep("AUTHENTICATION FAILED", { 
        status: tokenResponse.status, 
        error: errorText,
        authUrl: appyPayAuthBaseUrl 
      });
      
      if (tokenResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Credenciais AppyPay inválidas. Verifique as configurações.',
            code: 'INVALID_CREDENTIALS',
            details: 'Falha na autenticação com AppyPay'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erro de autenticação AppyPay: ${tokenResponse.status}`,
          code: 'AUTH_ERROR'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: tokenResponse.status,
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    logStep("AppyPay token obtained");

    // Handle test credential check - only validate token, don't create charge
    if (requestBody.testCredentials) {
      logStep("Performing credentials test only - token obtained successfully");
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Credentials test successful',
          test: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar produto (only for real charges, not tests)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      logStep("Product not found", productError);
      throw new Error('Produto não encontrado');
    }

    logStep("Product found", { name: product.name });

    // Gerar ID único para a transação
    const merchantTransactionId = Math.random().toString(36).substr(2, 15).toUpperCase();
    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();

    // Preparar dados para AppyPay
    const appyPayPayload = {
      amount: parseFloat(amount),
      currency: "AOA",
      description: `Compra: ${product.name}`,
      merchantTransactionId: merchantTransactionId,
      paymentMethod: "GPO_53c70da3-1c88-4391-8b60-ab4757fbb044", // ID do método Multicaixa Express
      paymentInfo: {
        phoneNumber: phoneNumber || customerData.phone || "923000000" // Telefone para simulação
      },
      notify: {
        name: customerData.name,
        telephone: phoneNumber || customerData.phone || "923000000",
        email: customerData.email,
        smsNotification: true,
        emailNotification: true
      }
    };

    logStep("Creating AppyPay charge", appyPayPayload);

    // Criar charge no AppyPay
    const chargeResponse = await fetch(`${appyPayApiBaseUrl}/v1/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR'
      },
      body: JSON.stringify(appyPayPayload)
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      logStep("CHARGE CREATION FAILED", { 
        status: chargeResponse.status, 
        error: errorText,
        payload: appyPayPayload
      });
      
      // Return structured error response instead of throwing
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Falha ao processar pagamento AppyPay (${chargeResponse.status})`,
          code: 'CHARGE_CREATION_FAILED',
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const chargeResult = await chargeResponse.json();
    
    logStep("AppyPay charge created", { 
      id: chargeResult.id, 
      status: chargeResult.responseStatus?.status,
      successful: chargeResult.responseStatus?.successful
    });

    // Determinar status do pedido baseado na resposta
    let orderStatus = 'pending';
    if (chargeResult.responseStatus?.successful && chargeResult.responseStatus?.status === 'Success') {
      orderStatus = 'completed';
    } else if (chargeResult.responseStatus?.status === 'Failed') {
      orderStatus = 'failed';
    }

    // Salvar ordem no banco
    const orderData = {
      product_id: productId,
      order_id: orderId,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: phoneNumber || customerData.phone,
      amount: originalAmount?.toString() || amount.toString(),
      currency: originalCurrency,
      payment_method: paymentMethod,
      status: orderStatus,
      user_id: product.user_id,
      appypay_transaction_id: chargeResult.id,
      appypay_merchant_transaction_id: merchantTransactionId,
      seller_commission: parseFloat(originalAmount?.toString() || amount.toString())
    };

    logStep("Saving order", orderData);

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) {
      logStep("Error saving order", orderError);
      throw new Error('Erro ao salvar pedido');
    }

    logStep("Order saved successfully");

    // Se o pagamento foi bem-sucedido, enviar email de confirmação
    if (orderStatus === 'completed') {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
          body: {
            customerEmail: customerData.email,
            customerName: customerData.name,
            productName: product.name,
            amount: orderData.amount,
            currency: orderData.currency,
            orderId: orderId
          }
        });

        if (emailError) {
          logStep("Email notification failed", emailError);
        } else {
          logStep("Confirmation email sent");
        }
      } catch (emailError) {
        logStep("Email error", emailError);
      }
    }

    const response = {
      success: true,
      order_id: orderId,
      appypay_transaction_id: chargeResult.id,
      merchant_transaction_id: merchantTransactionId,
      payment_status: orderStatus,
      appypay_response: chargeResult.responseStatus,
      reference: chargeResult.responseStatus?.reference || null
    };

    logStep("Returning success response", response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep("ERROR", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});