import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendAccessRequest {
  orderIds?: string[];  // Specific order IDs to resend
  resendAll?: boolean;  // Resend to all orders without auth accounts
  overrideEmail?: string; // Optional: override the customer email (for manual resend with different email)
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
    const { orderIds, resendAll, overrideEmail }: ResendAccessRequest = await req.json();

    console.log('🔄 RESEND ACCESS START:', { orderIds, resendAll, overrideEmail: overrideEmail ? '(provided)' : '(not provided)' });

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar pedidos que precisam de reenvio
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_id,
        cohort_id,
        customer_email,
        customer_name,
        customer_phone,
        product_id,
        amount,
        currency,
        order_bump_data,
        products!inner(
          name,
          member_area_id,
          user_id,
          profiles!inner(full_name, email)
        )
      `)
      .eq('status', 'completed');

    if (orderIds && orderIds.length > 0) {
      query = query.in('id', orderIds);
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

    console.log(`📦 Found ${orders.length} completed orders`);

    // Se resendAll=true, filtrar apenas pedidos SEM acesso existente em customer_access
    let ordersToProcess = orders;
    
    if (resendAll) {
      // Buscar todos os order_ids que já têm acesso concedido
      const orderIds = orders.map(o => o.order_id);
      const { data: existingAccess, error: accessError } = await supabase
        .from('customer_access')
        .select('order_id')
        .in('order_id', orderIds);

      if (accessError) {
        console.error('❌ Error checking existing access:', accessError);
        throw accessError;
      }

      const existingOrderIds = new Set(existingAccess?.map(a => a.order_id) || []);
      
      // Filtrar apenas pedidos que NÃO têm acesso
      ordersToProcess = orders.filter(order => !existingOrderIds.has(order.order_id));
      
      console.log(`🔍 Filtered: ${orders.length} total orders, ${existingOrderIds.size} already have access, ${ordersToProcess.length} need access`);

      if (ordersToProcess.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Todos os clientes já têm acesso",
            results: [],
            summary: {
              total: 0,
              successful: 0,
              failed: 0,
              already_have_access: existingOrderIds.size
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    console.log(`📦 Processing ${ordersToProcess.length} orders`);

    const results: Array<{
      order_id: string;
      email: string;
      success: boolean;
      error?: string;
      account_created?: boolean;
    }> = [];

    for (const order of ordersToProcess) {
      try {
        // Use overrideEmail if provided (for single order resend with different email)
        const targetEmail = overrideEmail && orderIds?.length === 1 
          ? overrideEmail.toLowerCase().trim() 
          : order.customer_email.toLowerCase().trim();
        const originalEmail = order.customer_email.toLowerCase().trim();
        const isEmailOverridden = targetEmail !== originalEmail;
        
        console.log(`\n🔄 Processing order ${order.order_id} for ${targetEmail}${isEmailOverridden ? ` (overridden from ${originalEmail})` : ''}`);

        // 0) Verificar se já existe acesso (se existir, ainda assim reenviamos o email)
        const { data: existingAccess, error: accessCheckError } = await supabase
          .from('customer_access')
          .select('id, is_active')
          .eq('order_id', order.order_id)
          .maybeSingle();

        if (accessCheckError) {
          console.error('❌ Error checking existing access:', accessCheckError);
          throw accessCheckError;
        }

        const hasActiveAccessForOrder = Boolean(existingAccess?.id && existingAccess.is_active);
        if (hasActiveAccessForOrder) {
          console.log('ℹ️ Access already exists for this order (will resend email)');
        }

        // 1) Criar conta (se ainda não existir). Se já existir, seguimos normalmente.
        let isNewAccount = false;
        let temporaryPassword: string | undefined;

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        const generatedPassword = Array.from({ length: 10 }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');

        const { error: createError } = await supabase.auth.admin.createUser({
          email: targetEmail,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            full_name: order.customer_name,
          },
        });

        if (!createError) {
          console.log('✅ Account created');
          isNewAccount = true;
          temporaryPassword = generatedPassword;
        } else if (createError.code === 'email_exists' || createError.status === 422) {
          console.log('ℹ️ Account already exists, continuing');
        } else {
          console.error('❌ Error creating account:', createError);
          results.push({
            order_id: order.order_id,
            email: targetEmail,
            success: false,
            error: `Failed to create account: ${createError.message}`,
          });
          continue;
        }

        // 2) Conceder acesso (customer_access) - se ainda não existe
        const product = order.products as any;

        if (!hasActiveAccessForOrder) {
          console.log('🔑 Creating customer_access...');
          const { error: grantAccessError } = await supabase.rpc('create_customer_access_manual', {
            p_customer_email: targetEmail,
            p_customer_name: order.customer_name,
            p_order_id: order.order_id,
            p_product_id: order.product_id,
          });

          if (grantAccessError && grantAccessError.code !== '23505') {
            console.error('❌ Error creating customer_access:', grantAccessError);
            throw grantAccessError;
          }

          // 3) Adicionar na área de membros (se existir)
          if (product?.member_area_id) {
            console.log('👨‍🎓 Adding student to member area...');
            const { error: addStudentError } = await supabase.rpc('admin_add_student_to_member_area', {
              p_member_area_id: product.member_area_id,
              p_student_email: targetEmail,
              p_student_name: order.customer_name,
              p_cohort_id: (order as any).cohort_id || null,
            });

            if (addStudentError) {
              console.error('❌ Error adding student:', addStudentError);
              throw addStudentError;
            }
          }
        } else {
          console.log('ℹ️ Skipping customer_access + member area insert (already active)');
        }

        // 4) Enviar email do produto principal
        console.log('📧 Invoking send-purchase-confirmation...');
        const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
          body: {
            customerName: order.customer_name,
            customerEmail: targetEmail,
            customerPhone: order.customer_phone,
            productName: product.name,
            orderId: order.order_id,
            amount: order.amount,
            currency: order.currency,
            productId: order.product_id,
            memberAreaId: product.member_area_id,
            sellerId: product.user_id,
            paymentStatus: 'completed',
            isNewAccount,
            temporaryPassword,
          },
        });

        if (emailError) {
          console.error('❌ Error sending emails:', emailError);
        } else {
          console.log('✅ Access granted + emails sent successfully for main product');
        }

        // 5) Processar Order Bumps (se existir)
        let orderBumpData = (order as any).order_bump_data;
        if (orderBumpData) {
          console.log('🎁 Processing order bump data...');
          
          // Parse se for string
          if (typeof orderBumpData === 'string') {
            try {
              orderBumpData = JSON.parse(orderBumpData);
            } catch (e) {
              console.error('❌ Failed to parse order_bump_data:', e);
              orderBumpData = null;
            }
          }

          // Pode ser um array ou objeto único
          const bumps = Array.isArray(orderBumpData) ? orderBumpData : [orderBumpData];

          for (const bump of bumps) {
            if (!bump || !bump.bump_product_id) {
              console.log('⚠️ Skipping bump without product_id:', bump);
              continue;
            }

            console.log(`🎁 Processing bump product: ${bump.bump_product_name || bump.bump_product_id}`);

            try {
              // Buscar dados do produto do bump
              const { data: bumpProduct, error: bumpProductError } = await supabase
                .from('products')
                .select('id, name, member_area_id, user_id')
                .eq('id', bump.bump_product_id)
                .maybeSingle();

              if (bumpProductError || !bumpProduct) {
                console.error('❌ Error fetching bump product:', bumpProductError);
                continue;
              }

              // Verificar se já tem acesso ao bump
              const { data: existingBumpAccess } = await supabase
                .from('customer_access')
                .select('id')
                .eq('customer_email', targetEmail)
                .eq('product_id', bumpProduct.id)
                .maybeSingle();

              const bumpAlreadyHasAccess = Boolean(existingBumpAccess?.id);
              if (bumpAlreadyHasAccess) {
                console.log('ℹ️ Customer already has access to bump product (will resend email)');
              }

              const bumpOrderId = `${order.order_id}-bump-${bumpProduct.id.substring(0, 8)}`;

              if (!bumpAlreadyHasAccess) {
                // Criar acesso para o produto do bump
                const { error: bumpAccessError } = await supabase
                  .from('customer_access')
                  .insert({
                    customer_email: targetEmail,
                    customer_name: order.customer_name,
                    order_id: bumpOrderId,
                    product_id: bumpProduct.id,
                    is_active: true,
                    access_expires_at: null,
                  });

                if (bumpAccessError && bumpAccessError.code !== '23505') {
                  console.error('❌ Error creating bump access:', bumpAccessError);
                } else {
                  console.log('✅ Bump product access granted');
                }

                // Adicionar na área de membros do bump (se existir)
                if (bumpProduct.member_area_id) {
                  console.log('👨‍🎓 Adding student to bump member area...');
                  const { error: addBumpStudentError } = await supabase.rpc('admin_add_student_to_member_area', {
                    p_member_area_id: bumpProduct.member_area_id,
                    p_student_email: targetEmail,
                    p_student_name: order.customer_name,
                    p_cohort_id: null,
                  });

                  if (addBumpStudentError) {
                    console.error('❌ Error adding student to bump member area:', addBumpStudentError);
                  }
                }
              } else {
                console.log('ℹ️ Skipping bump access + member area insert (already active)');
              }

              // Enviar email de acesso para o bump product
              console.log('📧 Sending bump product confirmation email...');
              await supabase.functions.invoke('send-purchase-confirmation', {
                body: {
                  customerName: order.customer_name,
                  customerEmail: targetEmail,
                  customerPhone: order.customer_phone,
                  productName: bumpProduct.name,
                  orderId: bumpOrderId,
                  amount: bump.bump_product_price || '0',
                  currency: order.currency,
                  productId: bumpProduct.id,
                  memberAreaId: bumpProduct.member_area_id,
                  sellerId: bumpProduct.user_id,
                  paymentStatus: 'completed',
                  isNewAccount: false, // Já foi criada acima
                  temporaryPassword: undefined,
                },
              });

              console.log('✅ Bump product email sent');
            } catch (bumpError) {
              console.error('❌ Error processing bump:', bumpError);
            }
          }
        }

        results.push({
          order_id: order.order_id,
          email: targetEmail,
          success: !emailError,
          account_created: isNewAccount,
          error: emailError ? `Failed to send emails: ${emailError.message || 'Unknown error'}` : (hasActiveAccessForOrder ? 'already_has_access' : undefined),
        });
      } catch (orderError) {
        console.error(`❌ Error processing order ${order.order_id}:`, orderError);
        results.push({
          order_id: order.order_id,
          email: order.customer_email,
          success: false,
          error: (orderError as Error).message,
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
