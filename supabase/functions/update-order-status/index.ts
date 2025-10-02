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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return new Response(JSON.stringify({ 
        error: 'orderId and status are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Updating order ${orderId} status to: ${status}`);

    // Buscar o order atual para obter dados - usando UUID
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      console.error('Error fetching order:', fetchError);
      throw new Error('Order not found');
    }

    // Atualizar status do order - usando UUID
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      throw updateError;
    }

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    // Se o status foi alterado para 'completed', processar pagamento completo
    if (status === 'completed' && orderData.status !== 'completed') {
      console.log('💰 Order completed, processing payment...');

      // Buscar dados do produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', orderData.product_id)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
      } else {
        // 1. PROCESSAR COMISSÕES E SALDO
        console.log('💵 Processing commissions and balance...');
        const orderAmount = parseFloat(orderData.amount);
        const hasAffiliate = orderData.affiliate_code ? true : false;
        
        if (hasAffiliate && orderData.affiliate_code) {
          // Buscar dados do afiliado
          const { data: affiliate } = await supabase
            .from('affiliates')
            .select('*')
            .eq('affiliate_code', orderData.affiliate_code)
            .eq('status', 'ativo')
            .single();
            
          if (affiliate) {
            // Calcular comissão do afiliado
            const commissionRate = parseFloat(affiliate.commission_rate.replace('%', '')) / 100;
            const affiliateCommission = orderAmount * commissionRate;
            const sellerCommission = orderAmount - affiliateCommission;
            
            console.log(`💰 Affiliate commission: ${affiliateCommission}, Seller commission: ${sellerCommission}`);
            
            // Criar transação para o afiliado
            await supabase.from('balance_transactions').insert({
              user_id: affiliate.affiliate_user_id,
              type: 'affiliate_commission',
              amount: affiliateCommission,
              currency: orderData.currency || 'KZ',
              description: `Comissão de afiliado - Pedido ${orderId}`,
              order_id: orderId
            });
            
            // Criar transação para o vendedor (valor líquido)
            await supabase.from('balance_transactions').insert({
              user_id: product.user_id,
              type: 'sale_revenue',
              amount: sellerCommission,
              currency: orderData.currency || 'KZ',
              description: `Receita de venda - Pedido ${orderId}`,
              order_id: orderId
            });
          }
        } else {
          // Sem afiliado - vendedor recebe tudo
          console.log(`💰 No affiliate - seller gets full amount: ${orderAmount}`);
          await supabase.from('balance_transactions').insert({
            user_id: product.user_id,
            type: 'sale_revenue',
            amount: orderAmount,
            currency: orderData.currency || 'KZ',
            description: `Receita de venda - Pedido ${orderId}`,
            order_id: orderId
          });
        }
        
        // 2. CRIAR ACESSO PARA O CLIENTE
        console.log('🔓 Creating customer access...');
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
        
        await supabase.from('customer_access').insert({
          customer_email: orderData.customer_email.toLowerCase().trim(),
          customer_name: orderData.customer_name,
          product_id: orderData.product_id,
          order_id: orderId,
          access_granted_at: new Date().toISOString(),
          access_expires_at: accessExpiresAt,
          is_active: true
        });
        
        console.log('✅ Customer access created');
        
        // 3. DISPARAR WEBHOOKS
        // Webhook para o produto principal
        const mainProductPayload = {
          event: 'payment.success',
          data: {
            order_id: orderId,
            amount: parseFloat(orderData.amount),
            currency: orderData.currency,
            customer_email: orderData.customer_email,
            customer_name: orderData.customer_name,
            product_id: orderData.product_id,
            product_name: product.name,
            payment_method: orderData.payment_method,
            timestamp: new Date().toISOString()
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: orderData.product_id
        };

        await supabase.functions.invoke('trigger-webhooks', {
          body: mainProductPayload
        });

        // Webhook de produto comprado
        const purchasePayload = {
          event: 'product.purchased',
          data: {
            order_id: orderId,
            product_id: orderData.product_id,
            product_name: product.name,
            customer_email: orderData.customer_email,
            customer_name: orderData.customer_name,
            price: orderData.amount,
            currency: orderData.currency,
            timestamp: new Date().toISOString()
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: orderData.product_id
        };

        await supabase.functions.invoke('trigger-webhooks', {
          body: purchasePayload
        });

        // Se há order bump, disparar webhooks para ele também
        if (orderData.order_bump_data) {
          try {
            console.log('🔔 Processing order bump webhooks...');
            const orderBumpData = JSON.parse(orderData.order_bump_data);
            
            const bumpPaymentPayload = {
              event: 'payment.success',
              data: {
                order_id: `${orderId}-BUMP`,
                amount: orderBumpData.discounted_price > 0 
                  ? orderBumpData.discounted_price 
                  : parseFloat(orderBumpData.bump_product_price.replace(/[^\d.,]/g, '').replace(',', '.')),
                currency: orderData.currency,
                customer_email: orderData.customer_email,
                customer_name: orderData.customer_name,
                product_id: orderBumpData.bump_product_id || 'order-bump',
                product_name: orderBumpData.bump_product_name,
                payment_method: orderData.payment_method,
                is_order_bump: true,
                main_order_id: orderId,
                timestamp: new Date().toISOString()
              },
              user_id: product.user_id,
              order_id: `${orderId}-BUMP`,
              product_id: orderData.product_id // Usar produto principal para encontrar webhooks
            };

            await supabase.functions.invoke('trigger-webhooks', {
              body: bumpPaymentPayload
            });

            // Webhook de produto comprado para order bump
            const bumpPurchasePayload = {
              event: 'product.purchased',
              data: {
                order_id: `${orderId}-BUMP`,
                product_id: orderBumpData.bump_product_id || 'order-bump',
                product_name: orderBumpData.bump_product_name,
                customer_email: orderData.customer_email,
                customer_name: orderData.customer_name,
                price: orderBumpData.discounted_price > 0 
                  ? orderBumpData.discounted_price.toString() 
                  : orderBumpData.bump_product_price,
                currency: orderData.currency,
                is_order_bump: true,
                main_order_id: orderId,
                timestamp: new Date().toISOString()
              },
              user_id: product.user_id,
              order_id: `${orderId}-BUMP`,
              product_id: orderData.product_id // Usar produto principal para encontrar webhooks
            };

            await supabase.functions.invoke('trigger-webhooks', {
              body: bumpPurchasePayload
            });

            console.log('✅ Order bump webhooks triggered successfully');
          } catch (bumpError) {
            console.error('❌ Error processing order bump webhooks:', bumpError instanceof Error ? bumpError.message : 'Unknown error');
          }
        }

        // Process order bumps and send separate access emails if applicable
        if (orderData.order_bump_data) {
          try {
            console.log('📧 Processing order bump access emails...');
            const orderBumpDataParsed = JSON.parse(orderData.order_bump_data);
            
            if (orderBumpDataParsed && orderBumpDataParsed.bump_product_id) {
              console.log(`📧 Processing email for order bump: ${orderBumpDataParsed.bump_product_name}`);
              
              // Fetch order bump product details
              const { data: bumpProduct, error: bumpProductError } = await supabase
                .from('products')
                .select('name, member_area_id, user_id')
                .eq('id', orderBumpDataParsed.bump_product_id)
                .single();
              
              if (!bumpProductError && bumpProduct && bumpProduct.member_area_id) {
                console.log(`✅ Order bump has member area: ${bumpProduct.member_area_id}`);
                
                // Get member area details
                const { data: memberArea, error: memberAreaError } = await supabase
                  .from('member_areas')
                  .select('name, url')
                  .eq('id', bumpProduct.member_area_id)
                  .single();
                
                if (!memberAreaError && memberArea) {
                  const bumpMemberAreaUrl = `https://kambafy.com/members/login/${bumpProduct.member_area_id}`;
                  
                  // Generate temporary password for order bump access
                  function generateTemporaryPassword(): string {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                    let password = '';
                    for (let i = 0; i < 10; i++) {
                      password += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    return password;
                  }
                  
                  const bumpTemporaryPassword = generateTemporaryPassword();
                  
                  // Send member access email for order bump
                  const memberAccessPayload = {
                    studentName: orderData.customer_name,
                    studentEmail: orderData.customer_email.toLowerCase().trim(),
                    memberAreaName: memberArea.name,
                    memberAreaUrl: bumpMemberAreaUrl,
                    sellerName: 'Kambafy',
                    isNewAccount: false,
                    temporaryPassword: bumpTemporaryPassword
                  };
                  
                  console.log('📧 Sending member access email for order bump:', memberAccessPayload);
                  
                  const { error: bumpEmailError } = await supabase.functions.invoke('send-member-access-email', {
                    body: memberAccessPayload
                  });
                  
                  if (bumpEmailError) {
                    console.error(`❌ Error sending order bump access email for ${orderBumpDataParsed.bump_product_name}:`, bumpEmailError);
                  } else {
                    console.log(`✅ Order bump access email sent successfully for: ${orderBumpDataParsed.bump_product_name}`);
                  }
                }
              } else {
                console.log(`ℹ️ Order bump ${orderBumpDataParsed.bump_product_name} does not have member area, skipping separate access email`);
              }
            }
          } catch (bumpEmailError) {
            console.error('❌ Error processing order bump emails:', bumpEmailError);
          }
        }

        console.log('✅ All webhooks triggered successfully');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: orderId,
      newStatus: status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in update-order-status:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});