import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendAccessRequest {
  orderIds?: string[];  // Specific order IDs to resend
  resendAll?: boolean;  // Resend to all orders without auth accounts
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { orderIds, resendAll }: ResendAccessRequest = await req.json();

    console.log('🔄 RESEND ACCESS START:', { orderIds, resendAll });

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar pedidos que precisam de reenvio
    let query = supabase
      .from('orders')
      .select(`
        order_id,
        customer_email,
        customer_name,
        customer_phone,
        product_id,
        amount,
        currency,
        products!inner(
          name,
          member_area_id,
          user_id,
          profiles!inner(full_name, email)
        )
      `)
      .eq('status', 'completed');

    if (orderIds && orderIds.length > 0) {
      query = query.in('order_id', orderIds);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Nenhum pedido encontrado" 
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`📦 Processing ${orders.length} orders`);

    const results = [];
    
    for (const order of orders) {
      try {
        const normalizedEmail = order.customer_email.toLowerCase().trim();
        console.log(`\n🔄 Processing order ${order.order_id} for ${normalizedEmail}`);
        
        // Check if user already has auth account
        const { data: listResponse } = await supabase.auth.admin.listUsers();
        const existingUser = listResponse?.users.find(user => user.email?.toLowerCase() === normalizedEmail);
        
        let isNewAccount = false;
        let temporaryPassword = '';
        
        if (!existingUser) {
          // Create account with temporary password
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
          temporaryPassword = '';
          for (let i = 0; i < 10; i++) {
            temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          
          console.log('👤 Creating account for:', normalizedEmail);
          
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: {
              full_name: order.customer_name
            }
          });

          if (createError) {
            console.error('❌ Error creating account:', createError);
            results.push({
              order_id: order.order_id,
              email: normalizedEmail,
              success: false,
              error: 'Failed to create account'
            });
            continue;
          }

          console.log('✅ Account created');
          isNewAccount = true;
        } else {
          console.log('ℹ️ Account already exists');
        }

        // Send panel access email
        const product = order.products;
        const sellerProfile = product.profiles;
        
        console.log('📧 Invoking send-purchase-confirmation...');
        const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
          body: {
            customerName: order.customer_name,
            customerEmail: normalizedEmail,
            customerPhone: order.customer_phone,
            productName: product.name,
            orderId: order.order_id,
            amount: order.amount,
            currency: order.currency,
            productId: order.product_id,
            memberAreaId: product.member_area_id,
            sellerId: product.user_id,
            paymentStatus: 'completed'
          }
        });

        if (emailError) {
          console.error('❌ Error sending emails:', emailError);
          results.push({
            order_id: order.order_id,
            email: normalizedEmail,
            success: false,
            error: 'Failed to send emails'
          });
        } else {
          console.log('✅ Emails sent successfully');
          results.push({
            order_id: order.order_id,
            email: normalizedEmail,
            success: true,
            account_created: isNewAccount
          });
        }

      } catch (orderError) {
        console.error(`❌ Error processing order ${order.order_id}:`, orderError);
        results.push({
          order_id: order.order_id,
          email: order.customer_email,
          success: false,
          error: (orderError as Error).message
        });
      }
    }

    console.log('🏁 Resend process completed');
    console.log('Results:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${results.length} orders`,
        results: results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in resend-purchase-access function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
