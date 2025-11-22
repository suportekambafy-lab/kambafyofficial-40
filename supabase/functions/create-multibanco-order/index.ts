import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para formatar valor monetário no padrão português
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orderData = await req.json();
    
    console.log('Creating multibanco order:', orderData);

    // Insert order using service role (bypasses RLS)
    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: orderError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Order created successfully:', insertedOrder.id);

    // Enviar notificação OneSignal para o vendedor sobre a referência/transferência gerada
    if (insertedOrder.status === 'pending' && insertedOrder.product_id) {
      try {
        console.log('📤 Buscando informações do vendedor para notificação...');
        
        // Buscar produto para obter user_id do vendedor
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('user_id, name')
          .eq('id', insertedOrder.product_id)
          .single();
        
        if (product && product.user_id) {
          // Buscar perfil do vendedor para pegar email
          const { data: sellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', product.user_id)
            .single();
          
          if (sellerProfile?.email) {
            console.log('📤 Enviando notificação OneSignal para:', sellerProfile.email);
            
            const { error: notificationError } = await supabaseAdmin.functions.invoke('send-onesignal-notification', {
              body: {
                external_id: sellerProfile.email,
                title: 'Kambafy - Referência gerada',
                message: `Sua comissão: ${formatCurrency(parseFloat(insertedOrder.seller_commission || insertedOrder.amount))} ${insertedOrder.currency}`,
                data: {
                  type: 'reference_generated',
                  order_id: insertedOrder.order_id,
                  amount: insertedOrder.amount,
                  seller_commission: insertedOrder.seller_commission || insertedOrder.amount,
                  currency: insertedOrder.currency,
                  customer_name: insertedOrder.customer_name,
                  product_name: product.name,
                  url: 'https://app.kambafy.com/vendedor/vendas'
                }
              }
            });
            
            if (notificationError) {
              console.log('⚠️ Erro ao enviar notificação OneSignal:', notificationError);
            } else {
              console.log('✅ Notificação OneSignal enviada com sucesso');
            }
          }
        }
      } catch (notifError) {
        console.log('⚠️ Erro ao processar notificação:', notifError);
      }
    }

    return new Response(
      JSON.stringify(insertedOrder),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-multibanco-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});