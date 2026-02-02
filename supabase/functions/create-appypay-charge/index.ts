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

// Função para sanitizar texto removendo acentos e caracteres especiais
// AppyPay não aceita caracteres especiais na descrição
const sanitizeDescription = (text: string): string => {
  if (!text) return 'Produto';
  
  // Mapa de substituição de caracteres acentuados
  const accentMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N'
  };
  
  // Substituir caracteres acentuados
  let sanitized = text;
  for (const [accented, plain] of Object.entries(accentMap)) {
    sanitized = sanitized.split(accented).join(plain);
  }
  
  // Remover outros caracteres especiais, mantendo apenas letras, números, espaços e pontuação básica
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.,:;!?]/g, '');
  
  // Limitar tamanho (AppyPay tem limite restrito de caracteres)
  sanitized = sanitized.substring(0, 40);
  
  // Se ficou vazio, retornar valor padrão
  return sanitized.trim() || 'Produto';
};

const normalizePhoneNumber = (input: string): string => input.replace(/\D/g, '');
const isValidPhoneNumber = (phoneDigits: string): boolean => /^\d{9,15}$/.test(phoneDigits);

Deno.serve(async (req) => {
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
      skipOrderSave = false, // Se true, não salva na tabela orders
      customerCountry // País detectado por IP
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
    // Sanitizar descrição para remover acentos e caracteres especiais
    const sanitizedDescription = sanitizeDescription(productNameToUse);
    logStep("Description sanitized", { original: productNameToUse, sanitized: sanitizedDescription });
    
    const appyPayPayload: any = {
      amount: parseFloat(amount),
      currency: "AOA",
      description: sanitizedDescription,
      merchantTransactionId: merchantTransactionId,
      paymentMethod: appyPayMethod
    };

    // Adicionar paymentInfo com phoneNumber para Multicaixa Express (GPO)
    if (paymentMethod === 'express') {
      if (!phoneNumber) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'phoneNumber é obrigatório para pagamentos express.',
            code: 'VALIDATION_ERROR'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      if (!isValidPhoneNumber(normalizedPhone)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'phoneNumber inválido. Use apenas dígitos (9-15). Ex: 923456789 ou 244923456789',
            code: 'VALIDATION_ERROR'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      appyPayPayload.paymentInfo = {
        phoneNumber: normalizedPhone,
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
      logStep('✅ Pagamento Express SUCESSO - validação adicional', {
        transactionId: chargeResult.id,
        initialStatus: chargeResult.responseStatus?.status
      });
      
      // Aguardar 2 segundos para AppyPay processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        logStep('🔍 Verificando status final da transação...', {
          url: `https://gwy-api.appypay.co.ao/v2.0/transactions/${chargeResult.id}`
        });
        
        // Verificar status atualizado da transação
        const verifyResponse = await fetch(
          `https://gwy-api.appypay.co.ao/v2.0/transactions/${chargeResult.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        logStep('📥 Resposta da verificação recebida', {
          ok: verifyResponse.ok,
          status: verifyResponse.status
        });
        
        if (verifyResponse.ok) {
          const verifyResult = await verifyResponse.json();
          
          logStep('✅ Verificação adicional completada', {
            status: verifyResult.responseStatus?.status,
            successful: verifyResult.responseStatus?.successful,
            fullResponse: verifyResult
          });
          
          if (verifyResult.responseStatus?.status === 'Success') {
            orderStatus = 'completed';
          } else if (verifyResult.responseStatus?.status === 'Failed') {
            orderStatus = 'failed';
          } else {
            orderStatus = 'pending';
          }
        } else {
          const errorText = await verifyResponse.text();
          logStep('⚠️ ERRO na verificação - usando status inicial', {
            status: chargeResult.responseStatus?.status,
            verifyStatus: verifyResponse.status,
            errorText
          });
          orderStatus = 'completed'; // Usar status inicial se verificação falhar
        }
      } catch (verifyError) {
        logStep('❌ EXCEPTION na verificação adicional', {
          error: verifyError,
          message: verifyError instanceof Error ? verifyError.message : 'Unknown error',
          stack: verifyError instanceof Error ? verifyError.stack : undefined
        });
        orderStatus = 'completed'; // Usar status inicial se houver exception
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
      // AppyPay is Angola only - 8.99% platform fee
      const grossAmount = parseFloat(originalAmount?.toString() || amount.toString());
      
      const ANGOLA_PLATFORM_FEE = 0.0899;
      let sellerCommission: number;

      // ✅ Afiliados: sempre validar/normalizar no backend.
      // Motivo: o checkout (cliente) pode não conseguir validar por RLS/timing.
      // Regra: se houver affiliate_code válido e ativo para o produto, calcular affiliate_commission
      // e então calcular sellerCommission sobre (gross - affiliateCommission).
      let resolvedAffiliateCode: string | null = checkoutOrderData?.affiliate_code
        ? String(checkoutOrderData.affiliate_code).trim()
        : null;

      logStep('🔍 Affiliate code received from frontend', {
        affiliate_code: resolvedAffiliateCode,
        affiliate_commission_from_frontend: checkoutOrderData?.affiliate_commission,
        productId
      });

      let resolvedAffiliateCommission: number | null = null;
      if (checkoutOrderData?.affiliate_commission !== undefined && checkoutOrderData?.affiliate_commission !== null) {
        const parsed = parseFloat(String(checkoutOrderData.affiliate_commission));
        resolvedAffiliateCommission = Number.isFinite(parsed) ? parsed : null;
      }

      if (resolvedAffiliateCode && productId) {
        const { data: affiliateRow, error: affiliateError } = await supabase
          .from('affiliates')
          .select('commission_rate')
          .eq('affiliate_code', resolvedAffiliateCode)
          .eq('product_id', productId)
          .eq('status', 'ativo')
          .maybeSingle();

        if (affiliateError || !affiliateRow) {
          logStep('Affiliate code invalid/inactive - ignoring', {
            affiliate_code: resolvedAffiliateCode,
            productId,
            error: affiliateError?.message
          });
          resolvedAffiliateCode = null;
          resolvedAffiliateCommission = null;
        } else {
          // Se o frontend não calculou a comissão, calcular aqui
          const needsCommissionCalculation =
            resolvedAffiliateCommission === null ||
            !Number.isFinite(resolvedAffiliateCommission) ||
            resolvedAffiliateCommission <= 0;

          if (needsCommissionCalculation) {
            const rateStr = String(affiliateRow.commission_rate ?? '').replace('%', '').trim();
            const rate = parseFloat(rateStr) / 100;

            if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
              logStep('Invalid affiliate commission_rate - ignoring affiliate', {
                affiliate_code: resolvedAffiliateCode,
                commission_rate: affiliateRow.commission_rate
              });
              resolvedAffiliateCode = null;
              resolvedAffiliateCommission = null;
            } else {
              resolvedAffiliateCommission = Math.round(grossAmount * rate * 100) / 100;
              logStep('Affiliate commission calculated in backend', {
                affiliate_code: resolvedAffiliateCode,
                rate,
                grossAmount,
                affiliate_commission: resolvedAffiliateCommission
              });
            }
          }
        }
      }
      
      if (resolvedAffiliateCode && resolvedAffiliateCommission !== null && Number.isFinite(resolvedAffiliateCommission) && resolvedAffiliateCommission > 0) {
        // Se há afiliado válido, o vendedor recebe (gross - affiliate) e então aplica taxa da plataforma
        const sellerGross = Math.max(0, grossAmount - resolvedAffiliateCommission);
        sellerCommission = Math.round(sellerGross * (1 - ANGOLA_PLATFORM_FEE) * 100) / 100;
        console.log('💰 Venda com afiliado detectada:', {
          affiliate_code: resolvedAffiliateCode,
          affiliate_commission: resolvedAffiliateCommission,
          seller_gross: sellerGross,
          seller_net: sellerCommission,
          platform_fee: ANGOLA_PLATFORM_FEE
        });
      } else {
        // Venda direta: vendedor recebe 91.01%
        sellerCommission = Math.round(grossAmount * 0.9101 * 100) / 100;
        console.log('💰 Venda direta (sem afiliado):', {
          gross: grossAmount,
          seller_net: sellerCommission
        });
      }
      
      // Calcular expires_at baseado no método de pagamento
      let expiresAt = null;
      if (paymentMethod === 'express') {
        // Multicaixa Express expira em 15 minutos
        expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      } else if (paymentMethod === 'reference') {
        // Referência expira em 5 dias (forçado)
        expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Buscar user_id do vendedor (dono do produto)
      let sellerUserId = checkoutOrderData?.user_id || null;
      if (!sellerUserId && productId) {
        const { data: productData } = await supabase
          .from('products')
          .select('user_id')
          .eq('id', productId)
          .single();
        
        if (productData?.user_id) {
          sellerUserId = productData.user_id;
          logStep("Found seller user_id from product", { sellerUserId });
        }
      }
      
      const orderDataToSave = checkoutOrderData ? {
        ...checkoutOrderData,
        order_id: orderId, // Always use reference number as order_id
        appypay_transaction_id: merchantTransactionId, // Save AppyPay transaction ID for webhook lookup
        stripe_session_id: null, // AppyPay doesn't use Stripe
        status: orderStatus,
        amount: grossAmount.toString(), // Garantir que amount está correto
        seller_commission: sellerCommission, // Já corrigido acima para respeitar afiliado
        // 🔥 PRESERVAR dados do afiliado do frontend
        affiliate_code: resolvedAffiliateCode,
        affiliate_commission: resolvedAffiliateCommission,
        expires_at: expiresAt,
        customer_country: customerCountry || checkoutOrderData.customer_country || null,
        user_id: sellerUserId // Garantir que user_id é o vendedor
      } : {
        product_id: productId,
        order_id: orderId,
        appypay_transaction_id: merchantTransactionId, // Save AppyPay transaction ID for webhook lookup
        stripe_session_id: null, // AppyPay doesn't use Stripe
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: phoneNumber || customerData.phone,
        customer_country: customerCountry || null,
        amount: originalAmount?.toString() || amount.toString(),
        currency: originalCurrency,
        payment_method: paymentMethod,
        status: orderStatus,
        user_id: sellerUserId, // user_id é o vendedor do produto
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

        // 🎯 DISPARAR WEBHOOKS PERSONALIZADOS PARA PAGAMENTO COMPLETADO
        try {
          logStep("Triggering custom webhooks for completed payment");
          
          const webhookPayload = {
            event: 'payment.success',
            user_id: product?.user_id,
            product_id: productId,
            order_id: orderId,
            email: customerData.email,
            name: customerData.name,
            phone: phoneNumber || customerData.phone,
            amount: orderDataToSave.amount,
            currency: orderDataToSave.currency,
            payment_method: paymentMethod,
            status: 'completed'
          };
          
          console.log('📤 Payload sendo enviado para trigger-webhooks:', JSON.stringify(webhookPayload, null, 2));
          
          const { data: webhookData, error: webhookError } = await supabase.functions.invoke('trigger-webhooks', {
            body: webhookPayload
          });
          
          console.log('📥 Resposta do trigger-webhooks:', { data: webhookData, error: webhookError });

          if (webhookError) {
            logStep("Error triggering webhooks", webhookError);
          } else {
            logStep("Custom webhooks triggered successfully", webhookData);
          }
        } catch (webhookError) {
          console.error("Webhook error details:", webhookError);
          logStep("Webhook error", webhookError);
        }

        // 📊 ENVIAR CONVERSÃO PARA UTMIFY (em background para não bloquear)
        const sendUtmifyInBackground = async () => {
          try {
            logStep('📊 [BG] Verificando UTMify para o produto...');
            
            // Parse order bump data if exists
            let orderBumpParsed = null;
            if (orderDataToSave.order_bump_data) {
              try {
                orderBumpParsed = typeof orderDataToSave.order_bump_data === 'string' 
                  ? JSON.parse(orderDataToSave.order_bump_data) 
                  : orderDataToSave.order_bump_data;
              } catch (e) {
                logStep('⚠️ [BG] Erro ao parsear order_bump_data:', e);
              }
            }

            // ✅ USAR NOME REAL DO PRODUTO do banco de dados
            const realProductName = product?.name || productNameToUse || 'Produto';
            
            logStep('📊 [BG] Preparando payload UTMify:', {
              productId,
              productName: realProductName,
              amount: orderDataToSave.amount,
              currency: orderDataToSave.currency
            });

            const utmifyPayload = {
              orderId: orderId,
              orderUuid: orderId,
              amount: parseFloat(orderDataToSave.amount?.toString() || grossAmount.toString()),
              currency: orderDataToSave.currency || 'KZ',
              customerName: customerData.name,
              customerEmail: customerData.email,
              customerPhone: phoneNumber || customerData.phone,
              customerCountry: customerCountry || 'AO',
              productId: productId,
              productName: realProductName,
              paymentMethod: paymentMethod,
              utmParams: orderDataToSave.utm_params || checkoutOrderData?.utm_params || null,
              orderBumpData: orderBumpParsed
            };

            logStep('📤 [BG] Enviando para UTMify:', JSON.stringify(utmifyPayload, null, 2));

            const { data: utmifyResult, error: utmifyError } = await supabase.functions.invoke('send-utmify-conversion', {
              body: utmifyPayload
            });

            if (utmifyError) {
              logStep('❌ [BG] Erro ao chamar send-utmify-conversion:', JSON.stringify(utmifyError));
            } else {
              logStep('✅ [BG] UTMify enviado com sucesso:', JSON.stringify(utmifyResult));
            }
          } catch (utmifyErr) {
            const errMessage = utmifyErr instanceof Error ? utmifyErr.message : JSON.stringify(utmifyErr);
            logStep('⚠️ [BG] Erro ao processar UTMify:', errMessage);
          }
        };

        // Executar em background usando EdgeRuntime.waitUntil
        // @ts-ignore - EdgeRuntime está disponível no Deno Deploy
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(sendUtmifyInBackground());
          logStep('📊 UTMify agendado para background');
        } else {
          // Fallback: executar sem aguardar
          sendUtmifyInBackground().catch(err => logStep('⚠️ UTMify background error:', err));
          logStep('📊 UTMify iniciado (fallback)');
        }
        
        // 🔔 ENVIAR NOTIFICAÇÃO ONESIGNAL PARA O VENDEDOR SOBRE VENDA APROVADA
        if (product?.user_id) {
          try {
            // Helper para formatar preço
            const formatPrice = (amount: number, currency: string = 'KZ'): string => {
              let amountInKZ = amount;
              
              if (currency.toUpperCase() !== 'KZ') {
                const exchangeRates: Record<string, number> = {
                  'EUR': 1100,
                  'MZN': 14.3
                };
                const rate = exchangeRates[currency.toUpperCase()] || 1;
                amountInKZ = Math.round(amount * rate);
              }
              
              return `${parseFloat(amountInKZ.toString()).toLocaleString('pt-BR')} KZ`;
            };
            
            // Buscar perfil do vendedor
            const { data: sellerProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', product.user_id)
              .single();
            
            if (sellerProfile?.email) {
              logStep('📤 Enviando notificação OneSignal para vendedor sobre venda aprovada:', sellerProfile.email);
              
              const commissionAmount = orderDataToSave.seller_commission || orderDataToSave.amount;
              const formattedPrice = formatPrice(commissionAmount, orderDataToSave.currency);
              
              const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
                body: {
                  external_id: sellerProfile.email,
                  title: 'Kambafy - Venda aprovada',
                  message: `Sua comissão: ${formattedPrice}`,
                  data: {
                    type: 'sale',
                    order_id: orderId,
                    amount: orderDataToSave.amount,
                    seller_commission: orderDataToSave.seller_commission || orderDataToSave.amount,
                    currency: orderDataToSave.currency,
                    customer_name: customerData.name,
                    product_name: productNameToUse || '',
                    url: 'https://mobile.kambafy.com/app'
                  }
                }
              });
              
              if (notificationError) {
                logStep('⚠️ Erro ao enviar notificação OneSignal:', notificationError);
              } else {
                logStep('✅ Notificação OneSignal enviada com sucesso');
              }
            }
          } catch (notifError) {
            logStep('⚠️ Erro ao processar notificação:', notifError);
          }
        }
      } else if (orderStatus === 'pending') {
        logStep("Payment pending - sending notification to seller about generated reference");
        
        // Helper para formatar preço como no dashboard
        const formatPrice = (amount: number, currency: string = 'KZ'): string => {
          let amountInKZ = amount;
          
          if (currency.toUpperCase() !== 'KZ') {
            const exchangeRates: Record<string, number> = {
              'EUR': 1100,
              'MZN': 14.3
            };
            const rate = exchangeRates[currency.toUpperCase()] || 1;
            amountInKZ = Math.round(amount * rate);
          }
          
          return `${parseFloat(amountInKZ.toString()).toLocaleString('pt-BR')} KZ`;
        };
        
        // Enviar notificação OneSignal para o vendedor sobre a referência gerada
        if (product?.user_id) {
          try {
            // Buscar perfil do vendedor para pegar email
            const { data: sellerProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('user_id', product.user_id)
              .single();
            
            if (sellerProfile?.email) {
              logStep('📤 Enviando notificação OneSignal para vendedor sobre referência:', sellerProfile.email);
              
              const commissionAmount = orderDataToSave.seller_commission || orderDataToSave.amount;
              const formattedPrice = formatPrice(commissionAmount, orderDataToSave.currency);
              
              const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
                body: {
                  external_id: sellerProfile.email,
                  title: 'Kambafy - Referência gerada',
                  message: `Sua comissão: ${formattedPrice}`,
                  data: {
                    type: 'reference_generated',
                    order_id: orderId,
                    amount: orderDataToSave.amount,
                    seller_commission: orderDataToSave.seller_commission || orderDataToSave.amount,
                    currency: orderDataToSave.currency,
                    customer_name: customerData.name,
                    product_name: productNameToUse || '',
                    reference_number: chargeResult.responseStatus?.reference?.referenceNumber,
                    url: 'https://mobile.kambafy.com/app'
                  }
                }
              });
              
              if (notificationError) {
                logStep('⚠️ Erro ao enviar notificação OneSignal:', notificationError);
              } else {
                logStep('✅ Notificação OneSignal enviada com sucesso');
              }
            }
          } catch (notifError) {
            logStep('⚠️ Erro ao processar notificação:', notifError);
          }
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