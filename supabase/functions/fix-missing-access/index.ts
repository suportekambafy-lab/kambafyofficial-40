import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Buscando pedidos completados sem acesso...');

    // Buscar TODOS os pedidos completados
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_id,
        customer_email,
        customer_name,
        product_id,
        created_at,
        status
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    console.log(`📊 Total de pedidos completados: ${allOrders?.length || 0}`);

    const results = {
      total: allOrders?.length || 0,
      processed: 0,
      alreadyHadAccess: 0,
      accessCreated: 0,
      errors: [] as any[]
    };

    // Processar cada pedido
    for (const order of allOrders || []) {
      try {
        // Verificar se já tem acesso
        const { data: existingAccess } = await supabase
          .from('customer_access')
          .select('id')
          .eq('customer_email', order.customer_email.toLowerCase().trim())
          .eq('product_id', order.product_id)
          .single();

        if (existingAccess) {
          console.log(`✅ Acesso já existe: ${order.order_id}`);
          results.alreadyHadAccess++;
          results.processed++;
          continue;
        }

        // Buscar informações do produto
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('access_duration_type, access_duration_value')
          .eq('id', order.product_id)
          .single();

        if (productError) {
          console.error(`❌ Erro ao buscar produto ${order.product_id}:`, productError);
          results.errors.push({ order_id: order.order_id, error: 'Product not found' });
          results.processed++;
          continue;
        }

        // Calcular expiração
        const accessExpiresAt = product.access_duration_type === 'lifetime' || !product.access_duration_type
          ? null
          : (() => {
              const now = new Date();
              switch (product.access_duration_type) {
                case 'days':
                  return new Date(now.setDate(now.getDate() + product.access_duration_value));
                case 'months':
                  return new Date(now.setMonth(now.getMonth() + product.access_duration_value));
                case 'years':
                  return new Date(now.setFullYear(now.getFullYear() + product.access_duration_value));
                default:
                  return null;
              }
            })();

        // Criar acesso
        const { error: insertError } = await supabase
          .from('customer_access')
          .insert({
            customer_email: order.customer_email.toLowerCase().trim(),
            customer_name: order.customer_name,
            product_id: order.product_id,
            order_id: order.order_id,
            access_granted_at: order.created_at,
            access_expires_at: accessExpiresAt,
            is_active: true
          });

        if (insertError) {
          // Ignorar erros de duplicata
          if (insertError.code === '23505') {
            console.log(`⚠️ Acesso duplicado (ignorado): ${order.order_id}`);
            results.alreadyHadAccess++;
          } else {
            console.error(`❌ Erro ao criar acesso ${order.order_id}:`, insertError);
            results.errors.push({ order_id: order.order_id, error: insertError.message });
          }
        } else {
          console.log(`✅ Acesso criado: ${order.order_id}`);
          results.accessCreated++;
        }

        results.processed++;

      } catch (orderError) {
        console.error(`❌ Erro ao processar pedido ${order.order_id}:`, orderError);
        results.errors.push({ 
          order_id: order.order_id, 
          error: orderError instanceof Error ? orderError.message : 'Unknown error' 
        });
        results.processed++;
      }
    }

    console.log('📊 Resultados finais:', results);

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
