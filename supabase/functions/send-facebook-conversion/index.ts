import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const FACEBOOK_API_VERSION = 'v18.0';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      productId, 
      orderId, 
      amount, 
      currency, 
      customerEmail,
      customerName,
      customerPhone,
      eventSourceUrl
    } = await req.json();

    console.log('📊 Facebook Conversion API - Request received:', {
      productId,
      orderId,
      amount,
      currency,
      customerEmail
    });

    // Validar UUID do produto
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!productId || !uuidRegex.test(productId)) {
      console.error('❌ Invalid product ID format:', productId);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid product ID format',
          message: 'O ID do produto deve ser um UUID válido (ex: 550e8400-e29b-41d4-a716-446655440000)',
          provided: productId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar o produto para saber quem é o dono
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('user_id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar configurações da API do Facebook para o vendedor
    const { data: apiSettings, error: apiError } = await supabaseClient
      .from('facebook_api_settings')
      .select('*')
      .eq('user_id', product.user_id)
      .eq('enabled', true)
      .maybeSingle();

    if (apiError) {
      console.error('❌ Error fetching API settings:', apiError);
      return new Response(
        JSON.stringify({ error: 'Error fetching API settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!apiSettings) {
      console.log('⚠️ No Facebook API settings found for seller');
      return new Response(
        JSON.stringify({ 
          error: 'No Facebook API settings configured',
          message: 'Este produto não tem as configurações da Facebook Conversions API ativadas. Configure App ID, App Secret e Access Token na página do produto.',
          productId: productId,
          sellerId: product.user_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar o Pixel ID também
    const { data: pixelSettings } = await supabaseClient
      .from('facebook_pixel_settings')
      .select('pixel_id')
      .eq('user_id', product.user_id)
      .eq('product_id', productId)
      .eq('enabled', true)
      .maybeSingle();

    const pixelId = pixelSettings?.pixel_id || apiSettings.app_id;

    console.log('✅ API settings found, sending event to Facebook Conversions API');

    // Criar hash SHA256 para dados do usuário (PII)
    const hashData = async (text: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(text.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Preparar dados do usuário (hashed)
    const userData: any = {};
    
    if (customerEmail) {
      userData.em = await hashData(customerEmail);
    }
    
    if (customerPhone) {
      // Remover caracteres não numéricos
      const cleanPhone = customerPhone.replace(/\D/g, '');
      userData.ph = await hashData(cleanPhone);
    }

    if (customerName) {
      const nameParts = customerName.trim().split(' ');
      if (nameParts.length > 0) {
        userData.fn = await hashData(nameParts[0]);
      }
      if (nameParts.length > 1) {
        userData.ln = await hashData(nameParts[nameParts.length - 1]);
      }
    }

    // Preparar evento de conversão
    const eventTime = Math.floor(Date.now() / 1000);
    
    const eventData = {
      event_name: 'Purchase',
      event_time: eventTime,
      action_source: 'website',
      event_source_url: eventSourceUrl || `https://kambafy.com/checkout/${productId}`,
      user_data: userData,
      custom_data: {
        currency: currency || 'EUR',
        value: parseFloat(amount) || 0,
        content_ids: [productId],
        content_type: 'product',
        content_name: product.name,
        order_id: orderId
      }
    };

    console.log('📤 Sending event to Facebook:', {
      pixelId,
      eventName: eventData.event_name,
      value: eventData.custom_data.value,
      currency: eventData.custom_data.currency
    });

    // Enviar para Facebook Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pixelId}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [eventData],
          access_token: apiSettings.access_token,
        }),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('❌ Facebook API error:', fbResult);
      return new Response(
        JSON.stringify({ 
          error: 'Facebook API error',
          details: fbResult 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Event sent successfully to Facebook:', fbResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conversion event sent to Facebook',
        facebook_response: fbResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in send-facebook-conversion:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
