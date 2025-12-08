import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const FACEBOOK_API_VERSION = 'v18.0';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 200; // ms

// SHA256 hash function for PII
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Exponential backoff delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for logging
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { 
      productId,
      userId,
      eventId,
      eventName = 'Purchase',
      value,
      currency = 'KZ',
      orderId,
      customer = {},
      eventSourceUrl
    } = body;

    console.log('📊 [FB CAPI] Request received:', {
      productId,
      userId,
      eventId,
      eventName,
      value,
      currency,
      orderId
    });

    // ========== VALIDAÇÕES ==========
    
    // Validar eventId (CRÍTICO para deduplicação)
    if (!eventId) {
      console.error('❌ [FB CAPI] Missing eventId - required for deduplication');
      return new Response(
        JSON.stringify({ error: 'eventId is required for deduplication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validar productId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!productId || !uuidRegex.test(productId)) {
      console.error('❌ [FB CAPI] Invalid productId:', productId);
      return new Response(
        JSON.stringify({ error: 'Invalid productId format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ========== DEDUPLICAÇÃO ==========
    
    // Verificar se evento já foi processado
    const { data: existingEvent } = await supabaseClient
      .from('facebook_events_log')
      .select('id, status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log('⚠️ [FB CAPI] Event already processed:', eventId, existingEvent.status);
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'already_processed',
          eventId,
          status: existingEvent.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ========== BUSCAR CONFIGURAÇÕES ==========
    
    // Determinar userId se não fornecido
    let sellerId = userId;
    let productName = 'Product';

    if (!sellerId) {
      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('user_id, name')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error('❌ [FB CAPI] Product not found:', productError);
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      sellerId = product.user_id;
      productName = product.name || 'Product';
    }

    // Buscar TODAS as configurações de API ativas do vendedor
    const { data: apiSettings, error: apiError } = await supabaseClient
      .from('facebook_api_settings')
      .select('*')
      .eq('user_id', sellerId)
      .eq('enabled', true);

    if (apiError) {
      console.error('❌ [FB CAPI] Error fetching API settings:', apiError);
      return new Response(
        JSON.stringify({ error: 'Error fetching API settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!apiSettings || apiSettings.length === 0) {
      console.log('⚠️ [FB CAPI] No API settings found for seller:', sellerId);
      return new Response(
        JSON.stringify({ 
          error: 'No Facebook API settings configured',
          sellerId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Pegar o primeiro access_token válido
    const validApiSetting = apiSettings.find(api => api.access_token && api.access_token.length > 10);
    if (!validApiSetting) {
      console.error('❌ [FB CAPI] No valid access_token found');
      return new Response(
        JSON.stringify({ error: 'No valid access_token configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar TODOS os pixels ativos para o produto
    const { data: pixelSettings, error: pixelError } = await supabaseClient
      .from('facebook_pixel_settings')
      .select('pixel_id')
      .eq('user_id', sellerId)
      .eq('product_id', productId)
      .eq('enabled', true);

    if (pixelError) {
      console.error('❌ [FB CAPI] Error fetching pixel settings:', pixelError);
    }

    const pixelIds = (pixelSettings || []).map(p => p.pixel_id).filter(Boolean);

    if (pixelIds.length === 0) {
      console.log('⚠️ [FB CAPI] No active pixels found for product:', productId);
      return new Response(
        JSON.stringify({ error: 'No active pixels configured for this product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`✅ [FB CAPI] Found ${pixelIds.length} pixel(s):`, pixelIds);

    // ========== PREPARAR DADOS DO USUÁRIO (HASHED) ==========
    
    const userData: Record<string, string> = {};
    
    if (customer.email) {
      userData.em = await sha256(customer.email);
    }
    
    if (customer.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 9) {
        userData.ph = await sha256(cleanPhone);
      }
    }

    if (customer.firstName) {
      userData.fn = await sha256(customer.firstName);
    }
    
    if (customer.lastName) {
      userData.ln = await sha256(customer.lastName);
    }

    // ========== PREPARAR PAYLOAD DO EVENTO ==========
    
    const eventTime = Math.floor(Date.now() / 1000);
    
    const eventPayload = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId, // CRÍTICO: mesmo eventId do client para deduplicação
      action_source: 'website',
      event_source_url: eventSourceUrl || `https://kambafy.com/checkout/${productId}`,
      user_data: userData,
      custom_data: {
        value: parseFloat(String(value)) || 0,
        currency: currency,
        content_ids: [productId],
        content_type: 'product',
        content_name: productName,
        order_id: orderId
      }
    };

    // ========== REGISTRAR EVENTO COMO PENDING ==========
    
    await supabaseClient.from('facebook_events_log').insert({
      event_id: eventId,
      user_id: sellerId,
      product_id: productId,
      event_name: eventName,
      status: 'pending',
      payload: eventPayload
    });

    // ========== ENVIAR PARA CADA PIXEL COM RETRY ==========
    
    const results: Array<{
      pixelId: string;
      ok: boolean;
      response?: any;
      error?: any;
      attempts: number;
    }> = [];

    for (const pixelId of pixelIds) {
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      let lastResponse: any = null;

      while (attempt < MAX_RETRIES && !success) {
        attempt++;
        
        try {
          const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pixelId}/events?access_token=${validApiSetting.access_token}`;
          
          console.log(`📤 [FB CAPI] Sending to pixel ${pixelId} (attempt ${attempt}/${MAX_RETRIES})`);
          
          const fbResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: [eventPayload] })
          });

          lastResponse = await fbResponse.json();

          if (fbResponse.ok && !lastResponse.error) {
            success = true;
            console.log(`✅ [FB CAPI] Success for pixel ${pixelId}:`, lastResponse);
            results.push({
              pixelId,
              ok: true,
              response: lastResponse,
              attempts: attempt
            });
          } else {
            lastError = lastResponse;
            console.error(`❌ [FB CAPI] Error for pixel ${pixelId}:`, lastResponse);
            
            // Se for erro 4xx (client error), não tentar novamente
            if (fbResponse.status >= 400 && fbResponse.status < 500) {
              break;
            }
          }
        } catch (err) {
          lastError = { message: String(err) };
          console.error(`❌ [FB CAPI] Fetch error for pixel ${pixelId}:`, err);
        }

        // Exponential backoff antes do retry
        if (!success && attempt < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`⏳ [FB CAPI] Waiting ${delay}ms before retry...`);
          await sleep(delay);
        }
      }

      if (!success) {
        results.push({
          pixelId,
          ok: false,
          error: lastError,
          attempts: attempt
        });
      }
    }

    // ========== ATUALIZAR STATUS DO EVENTO ==========
    
    const allSuccess = results.every(r => r.ok);
    const someSuccess = results.some(r => r.ok);
    const finalStatus = allSuccess ? 'sent' : someSuccess ? 'partial' : 'failed';
    
    const processingTime = Date.now() - startTime;

    await supabaseClient
      .from('facebook_events_log')
      .update({
        status: finalStatus,
        response: { results, processingTime },
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId);

    console.log(`📊 [FB CAPI] Completed in ${processingTime}ms. Status: ${finalStatus}`);

    return new Response(
      JSON.stringify({
        ok: someSuccess,
        status: finalStatus,
        eventId,
        results,
        processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ [FB CAPI] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
