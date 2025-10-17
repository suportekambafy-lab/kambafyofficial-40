import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Utility function to generate order ID
const generateOrderId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  // Generate 6 random characters
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `ORD-${year}${month}${day}-${randomChars}`;
};

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
      phoneNumber,
      orderData: checkoutOrderData, // Order data passed from checkout
      productName, // Nome do produto (usado quando é módulo)
      skipOrderSave = false // Se true, não salva na tabela orders
    } = requestBody;

    if (!amount || !customerData) {
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
    const appyPayResource = Deno.env.get('APPYPAY_RESOURCE');
    const appyPayGrantType = Deno.env.get('APPYPAY_GRANT_TYPE');

    logStep("Checking AppyPay credentials", {
      hasClientId: !!appyPayClientId,
      hasClientSecret: !!appyPayClientSecret,
      hasApiBaseUrl: !!appyPayApiBaseUrl,
      hasAuthBaseUrl: !!appyPayAuthBaseUrl,
      hasResource: !!appyPayResource,
      hasGrantType: !!appyPayGrantType
    });

    if (!appyPayClientId || !appyPayClientSecret || !appyPayApiBaseUrl || !appyPayAuthBaseUrl || !appyPayResource || !appyPayGrantType) {
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

    // Gerar token de acesso AppyPay usando o endpoint Microsoft
    logStep("Requesting OAuth token", {
      authUrl: 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token',
      grantType: appyPayGrantType,
      clientId: appyPayClientId
    });

    const tokenResponse = await fetch('https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'grant_type': appyPayGrantType,
        'client_id': appyPayClientId,
        'client_secret': appyPayClientSecret,
        'resource': appyPayResource
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
    
    if (!tokenData.access_token) {
      logStep("TOKEN MISSING IN RESPONSE", tokenData);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Token de acesso não recebido do AppyPay',
          code: 'TOKEN_MISSING'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    const accessToken = tokenData.access_token;

    logStep("AppyPay token obtained successfully", { 
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in 
    });

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
    // Se productName foi fornecido (módulos), usar ele diretamente
    let product = null;
    let productNameToUse = productName;
    
    if (productId && !productName) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        logStep("Product not found in products table", productError);
        // Se não encontrar e não tem productName, erro
        if (!productName) {
          throw new Error('Produto não encontrado');
        }
      } else {
        product = productData;
        productNameToUse = productData.name;
      }
    }

    logStep("Product resolved", { name: productNameToUse });

    // Gerar ID único para a transação (máximo 15 caracteres alfanuméricos)
    const now = new Date();
    const timestamp = now.getDate().toString().padStart(2, '0') + 
                     now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    const merchantTransactionId = `TR${timestamp}${randomSuffix}`;
    
    // Determinar método de pagamento baseado no tipo
    let appyPayMethod = 'REF_96ee61a9-e9ff-4030-8be6-0b775e847e5f'; // Default: Referência
    if (paymentMethod === 'express') {
      appyPayMethod = 'GPO_b1cfa3d3-f34a-4cfa-bcff-d52829991567'; // Multicaixa Express
    }

    // Preparar dados para AppyPay v2.0
    const appyPayPayload: any = {
      amount: parseFloat(amount),
      currency: "AOA",
      description: productNameToUse,
      merchantTransactionId: merchantTransactionId,
      paymentMethod: appyPayMethod
    };

    // Adicionar paymentInfo com phoneNumber para Multicaixa Express (GPO)
    if (paymentMethod === 'express' && phoneNumber) {
      appyPayPayload.paymentInfo = {
        phoneNumber: phoneNumber
      };
    }

    logStep("Creating AppyPay charge", {
      payload: appyPayPayload,
      url: 'https://gwy-api.appypay.co.ao/v2.0/charges',
      method: 'POST'
    });

    // Criar charge no AppyPay v2.0
    const chargeResponse = await fetch('https://gwy-api.appypay.co.ao/v2.0/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR'
      },
      body: JSON.stringify(appyPayPayload)
    });

    logStep("AppyPay charge response received", {
      status: chargeResponse.status,
      statusText: chargeResponse.statusText,
      ok: chargeResponse.ok
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
    
    logStep("AppyPay charge response parsed", { 
      id: chargeResult.id, 
      status: chargeResult.responseStatus?.status,
      successful: chargeResult.responseStatus?.successful,
      source: chargeResult.responseStatus?.source,
      reference: chargeResult.responseStatus?.reference,
      fullResponse: chargeResult
    });

    // Use reference number as order ID if available, otherwise use checkout order ID or generate new one
    const orderId = chargeResult.responseStatus?.reference?.referenceNumber || 
                   checkoutOrderData?.order_id || 
                   generateOrderId();

    logStep("Using order ID", { 
      orderId, 
      source: chargeResult.responseStatus?.reference?.referenceNumber ? 'reference_number' : 
              checkoutOrderData?.order_id ? 'checkout_data' : 'generated'
    });

    // Determinar status do pedido baseado na resposta v2.0
    let orderStatus = 'pending';
    
    // Para AppyPay Express, adicionar validação extra
    if (paymentMethod === 'express' && chargeResult.responseStatus?.status === 'Success') {
      logStep('Validação adicional para Express - aguardando 2 segundos...', {
        transactionId: chargeResult.id
      });
      
      // Aguardar 2 segundos para AppyPay processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Verificar status atualizado da transação
        const verifyResponse = await fetch(
          `${APPYPAY_API_BASE_URL}/v2.0/transactions/${chargeResult.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (verifyResponse.ok) {
          const verifyResult = await verifyResponse.json();
          
          logStep('Verificação adicional do Express', {
            status: verifyResult.responseStatus?.status,
            successful: verifyResult.responseStatus?.successful
          });
          
          if (verifyResult.responseStatus?.status === 'Success') {
            orderStatus = 'completed';
          } else if (verifyResult.responseStatus?.status === 'Failed') {
            orderStatus = 'failed';
          } else {
            orderStatus = 'pending'; // Ainda em processamento
          }
        } else {
          logStep('Erro na verificação adicional, usando status inicial', {
            status: chargeResult.responseStatus?.status
          });
          orderStatus = 'completed'; // Fallback para status inicial
        }
      } catch (verifyError) {
        console.error('Erro na verificação adicional:', verifyError);
        orderStatus = 'completed'; // Fallback para status inicial
      }
    }
    // Para referências e outros casos
    else if (chargeResult.responseStatus?.status === 'Success') {
      orderStatus = 'completed';
    } else if (chargeResult.responseStatus?.status === 'Pending') {
      orderStatus = 'pending'; // Referências são pagas posteriormente
    } else if (chargeResult.responseStatus?.status === 'Failed') {
      orderStatus = 'failed';
    }

    // Salvar ordem no banco apenas se não for módulo (skipOrderSave = false)
    if (!skipOrderSave) {
      // Calcular seller_commission PRIMEIRO
      const grossAmount = parseFloat(originalAmount?.toString() || amount.toString());
      const sellerCommission = grossAmount * 0.9101; // 8.99% platform fee
      
      // Calcular expires_at baseado no método de pagamento
      let expiresAt = null;
      if (paymentMethod === 'express') {
        // Multicaixa Express expira em 15 minutos
        expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      } else if (paymentMethod === 'reference') {
        // Referência expira em 5 dias (forçado)
        expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const orderDataToSave = checkoutOrderData ? {
        ...checkoutOrderData,
        order_id: orderId, // Always use reference number as order_id
        appypay_transaction_id: merchantTransactionId, // Save AppyPay transaction ID for webhook lookup
        stripe_session_id: null, // AppyPay doesn't use Stripe
        status: orderStatus,
        amount: grossAmount.toString(), // Garantir que amount está correto
        seller_commission: sellerCommission, // SOBRESCREVER com desconto de 8%
        expires_at: expiresAt
      } : {
        product_id: productId,
        order_id: orderId,
        appypay_transaction_id: merchantTransactionId, // Save AppyPay transaction ID for webhook lookup
        stripe_session_id: null, // AppyPay doesn't use Stripe
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: phoneNumber || customerData.phone,
        amount: originalAmount?.toString() || amount.toString(),
        currency: originalCurrency,
        payment_method: paymentMethod,
        status: orderStatus,
        user_id: null, // Anonymous checkout - user_id should be null for anonymous orders
        seller_commission: sellerCommission, // 8% platform fee já calculado acima
        expires_at: expiresAt
      };

      logStep("Saving order", orderDataToSave);

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orderDataToSave);

      if (orderError) {
        logStep("Error saving order", orderError);
        throw new Error('Erro ao salvar pedido');
      }

      logStep("Order saved successfully");

      // Só enviar email de confirmação se o pagamento foi realmente completado (não para referências pendentes)
      if (orderStatus === 'completed') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
            body: {
              customerEmail: customerData.email,
              customerName: customerData.name,
              customerPhone: phoneNumber || customerData.phone,
              productName: product.name,
              amount: orderDataToSave.amount,
              currency: orderDataToSave.currency,
              orderId: orderId,
              productId: productId, // ✅ ADICIONAR productId
              sellerId: product?.user_id // ✅ ADICIONAR sellerId do produto
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
      } else {
        logStep("Payment pending - confirmation email will be sent after payment confirmation");
      }
    } else {
      logStep("Skipping order save - module payment will be saved separately");
    }

    const response = {
      success: true,
      order_id: orderId,
      appypay_transaction_id: chargeResult.id,
      merchant_transaction_id: merchantTransactionId,
      payment_status: orderStatus,
      appypay_response: chargeResult.responseStatus,
      reference: chargeResult.responseStatus?.reference || null,
      // Dados específicos para pagamento por referência
      reference_number: chargeResult.responseStatus?.reference?.referenceNumber,
      due_date: chargeResult.responseStatus?.reference?.dueDate,
      entity: chargeResult.responseStatus?.reference?.entity
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