import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { 
      orderId, 
      customerEmail, 
      customerName, 
      productId, 
      extensionType, 
      extensionValue 
    } = await req.json();

    console.log('🔄 Processing access extension:', {
      orderId,
      customerEmail,
      productId,
      extensionType,
      extensionValue
    });

    // Validar parâmetros obrigatórios
    if (!orderId || !customerEmail || !productId || !extensionType) {
      throw new Error('Missing required parameters');
    }

    // Verificar se o produto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, user_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('❌ Product not found:', productError);
      throw new Error('Product not found');
    }

    console.log('✅ Product found:', product.name);

    // Chamar função para estender acesso
    const { data: accessId, error: extensionError } = await supabase
      .rpc('extend_customer_access', {
        p_customer_email: customerEmail,
        p_product_id: productId,
        p_order_id: orderId,
        p_extension_type: extensionType,
        p_extension_value: extensionValue || 0
      });

    if (extensionError) {
      console.error('❌ Error extending access:', extensionError);
      throw new Error(`Failed to extend access: ${extensionError.message}`);
    }

    console.log('✅ Access extended successfully:', accessId);

    // Atualizar registro de compra para incluir informações da extensão
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        order_bump_data: {
          type: 'access_extension',
          extension_type: extensionType,
          extension_value: extensionValue,
          access_record_id: accessId
        }
      })
      .eq('order_id', orderId);

    if (orderUpdateError) {
      console.warn('⚠️ Failed to update order with extension data:', orderUpdateError);
      // Não falhar a requisição por causa disso
    }

    // Verificar status atual do acesso
    const { data: hasAccess, error: accessCheckError } = await supabase
      .rpc('check_customer_access', {
        p_customer_email: customerEmail,
        p_product_id: productId
      });

    if (accessCheckError) {
      console.warn('⚠️ Failed to check access status:', accessCheckError);
    }

    console.log('✅ Customer access status:', hasAccess);

    return new Response(
      JSON.stringify({
        success: true,
        accessId,
        hasAccess: hasAccess || false,
        message: `Access extended successfully for ${customerEmail}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error processing access extension:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});