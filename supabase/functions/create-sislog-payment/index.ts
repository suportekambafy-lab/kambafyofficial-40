import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate unique transaction ID (max 22 alphanumeric characters)
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const txId = `KMB${timestamp}${random}`.substring(0, 22);
  return txId;
}

// Format price helper
function formatPrice(amount: number, currency: string = 'MZN'): string {
  return `${parseFloat(amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SISLOG_API_KEY = Deno.env.get('SISLOG_API_KEY');
    const SISLOG_USERNAME = Deno.env.get('SISLOG_USERNAME');
    // SISLOG_API_URL deve ser a URL base (ex: https://lin4.sislog.com)
    const SISLOG_API_URL = Deno.env.get('SISLOG_API_URL') || 'https://lin4.sislog.com';

    if (!SISLOG_API_KEY || !SISLOG_USERNAME) {
      console.error('❌ SISLOG credentials not configured');
      return new Response(
        JSON.stringify({ error: 'SISLOG credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    console.log('📱 Creating SISLOG payment:', requestData);

    const {
      amount,
      productId,
      customerData,
      phoneNumber,
      provider, // 'emola' or 'mpesa'
      orderId: providedOrderId,
      orderData
    } = requestData;

    // Validate required fields
    if (!amount || !productId || !customerData || !phoneNumber || !provider) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, productId, customerData, phoneNumber, provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate provider
    if (!['emola', 'mpesa'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be "emola" or "mpesa"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();
    const orderId = providedOrderId || `MZ_${transactionId}`;

    // Convert amount to centavos (no decimal separators)
    const amountInCentavos = Math.round(amount * 100);

    // Format phone number for SISLOG (must be exactly 258XXXXXXXXX - 12 digits total)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // Remove leading 258 if present to normalize
    if (formattedPhone.startsWith('258')) {
      formattedPhone = formattedPhone.substring(3);
    }
    
    // Ensure we have exactly 9 digits
    if (formattedPhone.length !== 9) {
      console.error('❌ Invalid phone number length:', formattedPhone.length, 'digits');
      return new Response(
        JSON.stringify({ error: `Número de telefone inválido. Deve ter 9 dígitos, recebeu ${formattedPhone.length}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate prefix based on provider
    const prefix = formattedPhone.substring(0, 2);
    if (provider === 'emola' && prefix !== '87') {
      console.error('❌ Invalid prefix for e-Mola:', prefix);
      return new Response(
        JSON.stringify({ error: `Para e-Mola, use um número Movitel (87). Recebeu: ${prefix}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (provider === 'mpesa' && !['84', '85'].includes(prefix)) {
      console.error('❌ Invalid prefix for M-Pesa:', prefix);
      return new Response(
        JSON.stringify({ error: `Para M-Pesa, use um número Vodacom (84 ou 85). Recebeu: ${prefix}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Add country code
    formattedPhone = '258' + formattedPhone;

    console.log('📞 Formatted phone:', formattedPhone, '(length:', formattedPhone.length, ')');
    console.log('💰 Amount in centavos:', amountInCentavos);
    console.log('🔑 Transaction ID:', transactionId);

    // Fetch product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('user_id, name, commission')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call SISLOG API to create payment reference
    const sislogEndpoint = `${SISLOG_API_URL}/mobile/reference/request`;
    
    console.log('📤 Calling SISLOG API:', sislogEndpoint);
    
    // Payload conforme documentação SISLOG:
    // - username: obrigatório
    // - transactionId: máx 22 chars, único
    // - value: string com valor em centavos (ex: "5000" = 50,00 MZN)
    // - cel: opcional, para enviar PUSH ao cliente
    const sislogPayload = {
      username: SISLOG_USERNAME,
      transactionId: transactionId,
      value: amountInCentavos.toString(), // String conforme documentação
      cel: formattedPhone // Para enviar PUSH notification
    };

    console.log('📤 SISLOG payload:', sislogPayload);

    // Headers conforme documentação: apikey (lowercase)
    const sislogResponse = await fetch(sislogEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SISLOG_API_KEY
      },
      body: JSON.stringify(sislogPayload)
    });

    const sislogData = await sislogResponse.json();
    console.log('📥 SISLOG response:', sislogData);

    // Check for errors - SISLOG returns "Invalid" status or entity "00000" on failure
    if (!sislogResponse.ok || sislogData.status === 'Invalid' || sislogData.entity === '00000') {
      console.error('❌ SISLOG error:', sislogData);
      
      // Get error message from SISLOG response
      let errorMessage = 'Failed to create payment reference';
      if (sislogData.errorMessage) {
        errorMessage = sislogData.errorMessage;
      } else if (sislogData.errormessage) {
        errorMessage = sislogData.errormessage;
      } else if (sislogData.message) {
        errorMessage = sislogData.message;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          sislogError: sislogData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate seller commission (90% by default)
    const commissionRate = product.commission ? parseFloat(product.commission) / 100 : 0.90;
    const sellerCommission = Math.round(amount * commissionRate * 100) / 100;

    // Create order in database
    const orderToInsert = {
      order_id: orderId,
      product_id: productId,
      customer_name: customerData.name,
      customer_email: customerData.email.toLowerCase().trim(),
      customer_phone: phoneNumber,
      customer_country: 'Moçambique',
      amount: amount.toString(),
      currency: 'MZN',
      status: 'pending',
      payment_method: provider,
      user_id: product.user_id,
      seller_commission: sellerCommission,
      appypay_transaction_id: transactionId, // Reusing field for SISLOG transaction ID
      ...(orderData?.affiliate_code && { affiliate_code: orderData.affiliate_code }),
      ...(orderData?.affiliate_commission && { affiliate_commission: orderData.affiliate_commission }),
      ...(orderData?.cohort_id && { cohort_id: orderData.cohort_id }),
      ...(orderData?.order_bump_data && { order_bump_data: orderData.order_bump_data })
    };

    console.log('💾 Inserting order:', orderToInsert);

    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderToInsert)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Order created:', insertedOrder.id);

    // Send OneSignal notification to seller
    try {
      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', product.user_id)
        .single();

      if (sellerProfile?.email) {
        console.log('📤 Sending OneSignal notification to seller:', sellerProfile.email);
        
        const formattedPrice = formatPrice(sellerCommission, 'MZN');
        
        await supabaseAdmin.functions.invoke('send-onesignal-notification', {
          body: {
            external_id: sellerProfile.email,
            title: 'Kambafy - Referência gerada',
            message: `Sua comissão: ${formattedPrice}`,
            data: {
              type: 'reference_generated',
              order_id: orderId,
              amount: amount.toString(),
              seller_commission: sellerCommission,
              currency: 'MZN',
              customer_name: customerData.name,
              product_name: product.name,
              provider: provider,
              url: 'https://mobile.kambafy.com/app'
            }
          }
        });
        
        console.log('✅ Seller notification sent');
      }
    } catch (notifError) {
      console.log('⚠️ Error sending seller notification:', notifError);
    }

    // Return success with reference data
    return new Response(
      JSON.stringify({
        success: true,
        order: insertedOrder,
        sislog: {
          entity: sislogData.entity,
          reference: sislogData.reference,
          transactionId: transactionId,
          provider: provider
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in create-sislog-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
