import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 AppyPay Create Reference - Request received');
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Initializing Supabase client...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📥 Parsing request body...');
    const requestBody = await req.json();
    console.log('📋 Request body:', requestBody);
    
    const { 
      productId, 
      customerEmail, 
      customerName, 
      customerPhone, 
      amount, 
      orderId,
      testEndpoint // Novo parâmetro opcional para testes
    } = requestBody;

    console.log('📋 Extracted parameters:', {
      productId,
      customerEmail,
      customerName,
      customerPhone,
      amount,
      orderId,
      testEndpoint
    });

    console.log('✅ Creating AppyPay reference for order:', orderId)

    // Validar dados obrigatórios
    if (!productId || !customerEmail || !customerName || !amount || !orderId) {
      const missingFields = [];
      if (!productId) missingFields.push('productId');
      if (!customerEmail) missingFields.push('customerEmail');
      if (!customerName) missingFields.push('customerName');
      if (!amount) missingFields.push('amount');
      if (!orderId) missingFields.push('orderId');
      
      console.error('❌ Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('🔑 Checking AppyPay environment variables...');
    // Buscar configurações AppyPay
    let appyPayBaseUrl = Deno.env.get('APPYPAY_BASE_URL')
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET')
    
    console.log('📋 Raw environment values:', {
      baseUrlExists: !!appyPayBaseUrl,
      baseUrlValue: appyPayBaseUrl,
      baseUrlLength: appyPayBaseUrl?.length || 0,
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret
    });
    
    // Debug: listar todas as variáveis de ambiente que começam com APPYPAY
    console.log('📋 All APPYPAY env vars:', 
      Object.fromEntries(
        Object.entries(Deno.env.toObject())
          .filter(([key]) => key.startsWith('APPYPAY'))
      )
    );
    
    // Handle version placeholder - replace {version} with v1
    if (appyPayBaseUrl?.includes('{version}')) {
      appyPayBaseUrl = appyPayBaseUrl.replace('{version}', 'v1')
      console.log('📋 Updated base URL after version replacement:', appyPayBaseUrl);
    }

    console.log('📋 AppyPay config check:', {
      baseUrl: appyPayBaseUrl ? '✅ Set' : '❌ Missing',
      clientId: clientId ? '✅ Set' : '❌ Missing',
      clientSecret: clientSecret ? '✅ Set' : '❌ Missing'
    });

    if (!appyPayBaseUrl || !clientId || !clientSecret) {
      const missing = [];
      if (!appyPayBaseUrl) missing.push('APPYPAY_BASE_URL');
      if (!clientId) missing.push('APPYPAY_CLIENT_ID'); 
      if (!clientSecret) missing.push('APPYPAY_CLIENT_SECRET');
      
      console.error('❌ AppyPay configuration incomplete - missing:', missing);
      throw new Error(`AppyPay configuration not found. Missing: ${missing.join(', ')}`);
    }

    // Preparar dados para AppyPay (formato mais padrão)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 horas para expirar

    const appyPayPayload = {
      amount: parseFloat(amount),
      currency: 'AOA', // Usar código ISO correto para Kwanza Angolano
      description: `Pagamento do pedido ${orderId}`,
      reference: `REF-${orderId}`,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      expires_at: expiresAt.toISOString(),
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/appypay-webhook`,
      return_url: `https://kambafy.com/obrigado?order_id=${orderId}`
    }

    console.log('Sending request to AppyPay:', { ...appyPayPayload, client_secret: '[HIDDEN]' })

    console.log('🌐 Calling AppyPay API...');
    // Usar endpoint de teste se fornecido, senão usar o endpoint correto para referências
    const endpoint = testEndpoint || '/references';
    const fullUrl = `${appyPayBaseUrl}${endpoint}`;
    console.log('📋 AppyPay API URL:', fullUrl);
    console.log('📋 AppyPay payload:', { ...appyPayPayload, client_secret: '[HIDDEN]' });
    
    // Criar referência no AppyPay
    const appyPayResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${clientSecret}`, // Usar só o secret como Bearer token
        'X-Client-ID': clientId // Client ID como header separado
      },
      body: JSON.stringify(appyPayPayload)
    })

    console.log('📤 AppyPay Response Status:', appyPayResponse.status);
    console.log('📤 AppyPay Response Headers:', [...appyPayResponse.headers.entries()]);
    
    const responseText = await appyPayResponse.text();
    console.log('📤 AppyPay Response Text:', responseText);
    
    if (!appyPayResponse.ok) {
      console.error('❌ AppyPay API Error:', {
        endpoint,
        fullUrl,
        status: appyPayResponse.status,
        statusText: appyPayResponse.statusText,
        response: responseText
      });
      throw new Error(`AppyPay API error: ${appyPayResponse.status} - ${responseText} (endpoint: ${endpoint})`);
    }
    
    let appyPayData;
    try {
      appyPayData = JSON.parse(responseText);
      console.log('✅ AppyPay Response Data:', appyPayData);
    } catch (e) {
      console.error('❌ Could not parse AppyPay response as JSON');
      throw new Error(`AppyPay API returned invalid JSON: ${responseText}`);
    }

    // Processar resposta da AppyPay (formato array)
    let referenceData;
    if (appyPayData.references && Array.isArray(appyPayData.references) && appyPayData.references.length > 0) {
      referenceData = appyPayData.references[0];
      console.log('✅ Using references array format:', referenceData);
    } else if (appyPayData.referenceNumber) {
      referenceData = appyPayData;
      console.log('✅ Using direct format:', referenceData);
    } else {
      console.error('❌ Unexpected AppyPay response format:', appyPayData);
      throw new Error('Invalid AppyPay response format');
    }

    // Salvar referência na nossa base de dados
    const { data: referencePayment, error: dbError } = await supabase
      .from('reference_payments')
      .insert({
        order_id: orderId,
        product_id: productId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        amount: parseFloat(amount),
        currency: 'KZ',
        reference_number: referenceData.referenceNumber || referenceData.reference_number,
        appypay_transaction_id: referenceData.id || referenceData.transaction_id || referenceData.entity,
        status: 'pending',
        expires_at: referenceData.expirationDate || expiresAt.toISOString(),
        webhook_data: appyPayData
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    console.log('Reference payment created:', referencePayment.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference_payment_id: referencePayment.id,
          reference_number: referenceData.referenceNumber || referenceData.reference_number,
          transaction_id: referenceData.id || referenceData.transaction_id || referenceData.entity,
          amount: parseFloat(amount),
          currency: 'KZ',
          expires_at: referenceData.expirationDate || expiresAt.toISOString(),
          payment_instructions: appyPayData.payment_instructions || 'Use a referência para fazer o pagamento'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('💥 Error in create-appypay-reference:', error);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
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
    )
  }
})