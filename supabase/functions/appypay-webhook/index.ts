import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppyPayWebhookPayload {
  id: string;
  merchantTransactionId: string;
  amount: number;
  options?: any;
  reference: {
    referenceNumber: string;
    dueDate: string;
    entity: string;
  };
  eletronicReceipt?: any;
  responseStatus: {
    successful: boolean;
    status: "Success" | "Failed" | "Pending";
    code: number;
    message: string;
    source: string;
    sourceDetails?: any;
  };
}

async function grantModuleAccess(supabase: any, modulePayment: any) {
  console.log('[APPYPAY-WEBHOOK] Granting module access...');
  
  // Buscar dados do aluno
  const { data: studentData } = await supabase
    .from('member_area_students')
    .select('cohort_id')
    .eq('member_area_id', modulePayment.member_area_id)
    .ilike('student_email', modulePayment.student_email)
    .single();
  
  // Se aluno tem turma e módulo tem coming_soon para essa turma, remover
  if (studentData?.cohort_id && modulePayment.modules) {
    const currentComingSoonCohorts = modulePayment.modules.coming_soon_cohort_ids || [];
    
    if (currentComingSoonCohorts.includes(studentData.cohort_id)) {
      const updatedComingSoonCohorts = currentComingSoonCohorts.filter(
        (id: string) => id !== studentData.cohort_id
      );
      
      const { error: moduleUpdateError } = await supabase
        .from('modules')
        .update({
          coming_soon_cohort_ids: updatedComingSoonCohorts.length > 0 
            ? updatedComingSoonCohorts 
            : null
        })
        .eq('id', modulePayment.module_id);
      
      if (moduleUpdateError) {
        console.error('[APPYPAY-WEBHOOK] Error updating module access:', moduleUpdateError);
      } else {
        console.log('[APPYPAY-WEBHOOK] Module access granted to student');
      }
    }
  }
}

async function processModulePayment(
  supabase: any, 
  payload: AppyPayWebhookPayload, 
  modulePaymentId: string
) {
  console.log('[APPYPAY-WEBHOOK] Processing module payment...');
  
  // Buscar dados completos do pagamento
  const { data: modulePayment, error: fetchError } = await supabase
    .from('module_payments')
    .select('*, modules!inner(*)')
    .eq('id', modulePaymentId)
    .single();
  
  if (fetchError || !modulePayment) {
    throw new Error('Module payment not found');
  }
  
  // Mapear status do AppyPay
  const paymentStatus = payload.responseStatus?.status;
  const isSuccessful = payload.responseStatus?.successful;
  
  let newStatus = 'pending';
  
  // ✅ CRITICAL: Apenas Success + successful=true deve ser completed
  // TODOS os outros status devem ser failed ou pending
  if (isSuccessful === true && paymentStatus === 'Success') {
    newStatus = 'completed';
  } else if (paymentStatus === 'Pending') {
    newStatus = 'pending'; // Ainda aguardando pagamento
  } else {
    // Failed, Cancelled, Expired, Rejected, etc = failed
    newStatus = 'failed';
  }
  
  console.log('[APPYPAY-WEBHOOK] 🔍 Status mapping debug:', {
    paymentStatus,
    isSuccessful,
    mappedStatus: newStatus
  });
  
  console.log('[APPYPAY-WEBHOOK] Module payment status:', {
    current: modulePayment.status,
    new: newStatus
  });
  
  // Só atualizar se mudou
  if (modulePayment.status !== newStatus) {
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      payment_data: {
        ...modulePayment.payment_data,
        webhook_status: paymentStatus,
        webhook_received_at: new Date().toISOString(),
        appypay_response: payload.responseStatus
      }
    };
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    const { error: updateError } = await supabase
      .from('module_payments')
      .update(updateData)
      .eq('id', modulePaymentId);
    
    if (updateError) {
      throw new Error(`Failed to update module payment: ${updateError.message}`);
    }
    
    console.log('[APPYPAY-WEBHOOK] Module payment updated successfully');
    
    // Se foi completado, liberar acesso ao módulo
    if (newStatus === 'completed') {
      await grantModuleAccess(supabase, modulePayment);
    }
  }
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Module payment processed successfully',
    payment_id: modulePaymentId,
    status: newStatus
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[APPYPAY-WEBHOOK] Webhook received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[APPYPAY-WEBHOOK] Method not allowed: ${req.method}`);
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse webhook payload
    const payload: AppyPayWebhookPayload = await req.json();
    console.log('[APPYPAY-WEBHOOK] Received payload:', JSON.stringify(payload, null, 2));

    // Step 1: Extract order ID - either from merchantTransactionId (Express) or reference.referenceNumber (Reference)
    const orderIdFromPayload = payload.merchantTransactionId || payload.reference?.referenceNumber;
    
    if (!orderIdFromPayload) {
      console.error('[APPYPAY-WEBHOOK] Missing order ID in payload');
      return new Response(JSON.stringify({ 
        error: 'Missing merchantTransactionId or referenceNumber in payload' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const paymentType = payload.merchantTransactionId ? 'express' : 'reference';
    console.log(`[APPYPAY-WEBHOOK] Processing ${paymentType} payment for order ID: ${orderIdFromPayload}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 2: Search for order - try by merchantTransactionId first (appypay_transaction_id), then by order_id (referenceNumber)
    let orders: any[] | null = null;
    let orderError: any = null;
    
    // Try finding by merchantTransactionId (stored in appypay_transaction_id)
    if (payload.merchantTransactionId) {
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('appypay_transaction_id', payload.merchantTransactionId)
        .in('payment_method', ['express', 'reference'])
        .limit(1);
      
      orders = result.data;
      orderError = result.error;
      
      if (orders && orders.length > 0) {
        console.log(`[APPYPAY-WEBHOOK] Order found by merchantTransactionId: ${payload.merchantTransactionId}`);
      }
    }
    
    // If not found and we have a reference number, try by order_id (referenceNumber)
    if ((!orders || orders.length === 0) && payload.reference?.referenceNumber) {
      console.log(`[APPYPAY-WEBHOOK] Trying to find order by referenceNumber: ${payload.reference.referenceNumber}`);
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', payload.reference.referenceNumber)
        .in('payment_method', ['express', 'reference'])
        .limit(1);
      
      orders = result.data;
      orderError = result.error;
      
      if (orders && orders.length > 0) {
        console.log(`[APPYPAY-WEBHOOK] Order found by referenceNumber: ${payload.reference.referenceNumber}`);
      }
    }

    if (orderError) {
      console.error('[APPYPAY-WEBHOOK] Error fetching order:', orderError);
      throw new Error(`Database error: ${orderError.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log('[APPYPAY-WEBHOOK] Order not found in orders table, checking module_payments...');
      
      // Buscar em module_payments
      let modulePaymentId = null;
      
      // Tentar por merchantTransactionId (mapeado para order_id)
      if (payload.merchantTransactionId) {
        const { data: modulePayment } = await supabase
          .from('module_payments')
          .select('id')
          .eq('order_id', payload.merchantTransactionId)
          .single();
        
        if (modulePayment) {
          modulePaymentId = modulePayment.id;
          console.log(`[APPYPAY-WEBHOOK] Module payment found by merchantTransactionId`);
        }
      }
      
      // Tentar por referenceNumber
      if (!modulePaymentId && payload.reference?.referenceNumber) {
        const { data: modulePayment } = await supabase
          .from('module_payments')
          .select('id')
          .eq('reference_number', payload.reference.referenceNumber)
          .single();
        
        if (modulePayment) {
          modulePaymentId = modulePayment.id;
          console.log(`[APPYPAY-WEBHOOK] Module payment found by referenceNumber`);
        }
      }
      
      // Se encontrou um module_payment, processar
      if (modulePaymentId) {
        return await processModulePayment(supabase, payload, modulePaymentId);
      }
      
      // Se não encontrou nem em orders nem em module_payments
      console.log(`[APPYPAY-WEBHOOK] Payment not found in any table`);
      return new Response(JSON.stringify({ 
        message: 'Payment not found',
        orderId: orderIdFromPayload,
        paymentType: paymentType
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const order = orders[0];
    console.log(`[APPYPAY-WEBHOOK] Found order:`, {
      id: order.id,
      order_id: order.order_id,
      status: order.status,
      customer_email: order.customer_email
    });

    // Step 3: Extract status from responseStatus and update order
    const paymentStatus = payload.responseStatus?.status;
    const isSuccessful = payload.responseStatus?.successful;
    
    let newOrderStatus = 'pending'; // default
    
    // ✅ CRITICAL: Apenas Success + successful=true deve ser completed
    // TODOS os outros status devem ser failed ou pending
    if (isSuccessful === true && paymentStatus === 'Success') {
      newOrderStatus = 'completed';
    } else if (paymentStatus === 'Pending') {
      newOrderStatus = 'pending'; // Ainda aguardando pagamento
    } else {
      // Failed, Cancelled, Expired, Rejected, etc = failed
      newOrderStatus = 'failed';
    }

    console.log(`[APPYPAY-WEBHOOK] 🔍 Payment status mapping:`, {
      appyPayStatus: paymentStatus,
      isSuccessful: isSuccessful,
      successful_type: typeof isSuccessful,
      newOrderStatus: newOrderStatus,
      raw_payload: JSON.stringify(payload.responseStatus)
    });

    // Only update if status changed
    if (order.status !== newOrderStatus) {
      console.log(`[APPYPAY-WEBHOOK] Updating order status from ${order.status} to ${newOrderStatus}`);
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newOrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[APPYPAY-WEBHOOK] Error updating order status:', updateError);
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      console.log(`[APPYPAY-WEBHOOK] Order status updated successfully`);

      // If payment was completed, trigger post-payment actions
      if (newOrderStatus === 'completed') {
        console.log('[APPYPAY-WEBHOOK] Payment completed - verifying status before triggering notifications');
        
        // ✅ VERIFICAÇÃO EXTRA: Buscar o pedido atualizado do banco para garantir que está realmente pago
        const { data: verifiedOrder, error: verifyError } = await supabase
          .from('orders')
          .select('status')
          .eq('id', order.id)
          .single();
        
        if (verifyError || !verifiedOrder || verifiedOrder.status !== 'completed') {
          console.log('[APPYPAY-WEBHOOK] ⚠️ Order status verification failed - not completed. Skipping notifications.', {
            verifiedStatus: verifiedOrder?.status,
            error: verifyError
          });
          return new Response(JSON.stringify({
            success: true,
            message: 'Order status not completed - notifications skipped',
            order_id: order.order_id,
            status: verifiedOrder?.status || 'unknown'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        console.log('[APPYPAY-WEBHOOK] ✅ Order status verified as completed - proceeding with notifications');
        
        try {
          // Fetch product details for confirmation
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', order.product_id)
            .single();

          // ✅ CRIAR CUSTOMER_ACCESS ANTES DE ENVIAR EMAIL
          console.log('[APPYPAY-WEBHOOK] 🔓 Creating customer access...');
          
          // Verificar se já existe acesso
          const { data: existingAccess } = await supabase
            .from('customer_access')
            .select('id, is_active')
            .eq('customer_email', order.customer_email.toLowerCase().trim())
            .eq('product_id', order.product_id)
            .single();
          
          if (existingAccess) {
            console.log('[APPYPAY-WEBHOOK] ⚠️ Access already exists, updating...');
            await supabase
              .from('customer_access')
              .update({ 
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingAccess.id);
            console.log('[APPYPAY-WEBHOOK] ✅ Customer access updated');
          } else {
            // Calcular expiração de acesso
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
            
            const { error: accessError } = await supabase.from('customer_access').insert({
              customer_email: order.customer_email.toLowerCase().trim(),
              customer_name: order.customer_name,
              product_id: order.product_id,
              order_id: order.order_id,
              access_granted_at: new Date().toISOString(),
              access_expires_at: accessExpiresAt,
              is_active: true
            });
            
            if (accessError) {
              console.error('[APPYPAY-WEBHOOK] ❌ Error creating customer access:', accessError);
            } else {
              console.log('[APPYPAY-WEBHOOK] ✅ Customer access created successfully');
            }
          }

          // Send purchase confirmation email and SMS
          const confirmationPayload = {
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            productName: product?.name || order.product_id,
            orderId: order.order_id,
            amount: order.amount,
            currency: order.currency,
            productId: order.product_id,
            memberAreaId: product?.member_area_id,
            sellerId: product?.user_id,
            paymentMethod: order.payment_method,
            paymentStatus: 'completed' // Garantir que passamos status correto
          };

          const { error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
            body: confirmationPayload
          });

          if (emailError) {
            console.error('[APPYPAY-WEBHOOK] Error sending confirmation email:', emailError);
          } else {
            console.log('[APPYPAY-WEBHOOK] Purchase confirmation sent successfully');
          }

          // Trigger webhooks for payment success
          const { error: webhookError } = await supabase.functions.invoke('trigger-webhooks', {
            body: {
              event: 'payment.success',
              user_id: product?.user_id,
              product_id: order.product_id,
              order_id: order.order_id,
              amount: order.amount,
              currency: order.currency,
              customer_email: order.customer_email,
              payment_method: order.payment_method,
              status: 'completed' // ✅ Adicionar status explícito
            }
          });

          if (webhookError) {
            console.error('[APPYPAY-WEBHOOK] Error triggering webhooks:', webhookError);
          } else {
            console.log('[APPYPAY-WEBHOOK] Webhooks triggered successfully');
          }

          // 🔔 ENVIAR NOTIFICAÇÃO ONESIGNAL PARA O VENDEDOR
          try {
            console.log('[APPYPAY-WEBHOOK] 📱 Preparando notificação OneSignal...');
            
            // Buscar email do vendedor para usar como external_id
            const { data: sellerProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('user_id', product?.user_id)
              .single();
            
            if (sellerProfile?.email) {
              console.log('[APPYPAY-WEBHOOK] 📤 Enviando notificação OneSignal para:', sellerProfile.email);
              
              // Helper para formatar preço como no dashboard
              const formatPrice = (amount: number, currency: string = 'KZ'): string => {
                let amountInKZ = amount;
                
                if (currency.toUpperCase() !== 'KZ') {
                  const exchangeRates: Record<string, number> = {
                    'EUR': 1100,
                    'MZN': 14.3
                  };
                  const rate = exchangeRates[currency.toUpperCase()] || 1;
                  amountInKZ = Math.round(amount * rate);
                }
                
                return `${parseFloat(amountInKZ.toString()).toLocaleString('pt-BR')} KZ`;
              };
              
              const commissionAmount = order.seller_commission || order.amount;
              const formattedPrice = formatPrice(commissionAmount, order.currency);
              
              const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
                body: {
                  external_id: sellerProfile.email,
                  title: 'Kambafy - Venda aprovada',
                  message: `Sua comissão: ${formattedPrice}`,
                  data: {
                    type: 'sale',
                    order_id: order.order_id,
                    amount: order.amount,
                    seller_commission: order.seller_commission || order.amount,
                    currency: order.currency,
                    customer_name: order.customer_name,
                    product_name: product?.name || '',
                    url: 'https://app.kambafy.com/vendedor/vendas'
                  }
                }
              });
              
              if (notificationError) {
                console.error('[APPYPAY-WEBHOOK] ❌ Erro ao enviar notificação OneSignal:', notificationError);
              } else {
                console.log('[APPYPAY-WEBHOOK] ✅ Notificação OneSignal enviada com sucesso');
              }
            } else {
              console.log('[APPYPAY-WEBHOOK] ⚠️ Email do vendedor não encontrado');
            }

            // 🎯 ENVIAR CUSTOM EVENT PARA ONESIGNAL JOURNEY
            console.log('[APPYPAY-WEBHOOK] 📤 Sending OneSignal Custom Event...');
            const { error: customEventError } = await supabase.functions.invoke('send-onesignal-custom-event', {
              body: {
                external_id: product?.user_id,
                event_name: 'new_sale',
                properties: {
                  order_id: order.order_id,
                  amount: parseFloat(order.amount),
                  currency: order.currency,
                  customer_name: order.customer_name,
                  product_name: product?.name || '',
                  product_id: order.product_id
                }
              }
            });

            if (customEventError) {
              console.error('[APPYPAY-WEBHOOK] ❌ Error sending Custom Event:', customEventError);
            } else {
              console.log('[APPYPAY-WEBHOOK] ✅ Custom Event sent successfully');
            }
          } catch (notifError) {
            console.error('[APPYPAY-WEBHOOK] ❌ Error in OneSignal notification process:', notifError);
            // Não falhar a operação principal por erro de notificação
          }

          // Process order bumps and send separate access emails if applicable
          if (order.order_bump_data) {
            try {
              console.log('[APPYPAY-WEBHOOK] Processing order bump access emails...');
              const orderBumpData = typeof order.order_bump_data === 'string' 
                ? JSON.parse(order.order_bump_data)
                : order.order_bump_data;
              
              if (orderBumpData && orderBumpData.bump_product_id) {
                console.log(`[APPYPAY-WEBHOOK] Processing email for order bump: ${orderBumpData.bump_product_name}`);
                
                // Fetch order bump product details
                const { data: bumpProduct, error: bumpProductError } = await supabase
                  .from('products')
                  .select('name, member_area_id, user_id')
                  .eq('id', orderBumpData.bump_product_id)
                  .single();
                
                if (!bumpProductError && bumpProduct && bumpProduct.member_area_id) {
                  console.log(`[APPYPAY-WEBHOOK] Order bump has member area: ${bumpProduct.member_area_id}`);
                  
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
                      studentName: order.customer_name,
                      studentEmail: order.customer_email.toLowerCase().trim(),
                      memberAreaName: memberArea.name,
                      memberAreaUrl: bumpMemberAreaUrl,
                      sellerName: 'Kambafy',
                      isNewAccount: false,
                      temporaryPassword: bumpTemporaryPassword
                    };
                    
                    console.log('[APPYPAY-WEBHOOK] Sending member access email for order bump:', memberAccessPayload);
                    
                    const { error: bumpEmailError } = await supabase.functions.invoke('send-member-access-email', {
                      body: memberAccessPayload
                    });
                    
                    if (bumpEmailError) {
                      console.error(`[APPYPAY-WEBHOOK] Error sending order bump access email for ${orderBumpData.bump_product_name}:`, bumpEmailError);
                    } else {
                      console.log(`[APPYPAY-WEBHOOK] Order bump access email sent successfully for: ${orderBumpData.bump_product_name}`);
                    }
                  }
                } else {
                  console.log(`[APPYPAY-WEBHOOK] Order bump ${orderBumpData.bump_product_name} does not have member area, skipping separate access email`);
                }
              }
            } catch (bumpEmailError) {
              console.error('[APPYPAY-WEBHOOK] Error processing order bump emails:', bumpEmailError);
            }
          }

        } catch (postPaymentError) {
          console.error('[APPYPAY-WEBHOOK] Error in post-payment actions:', postPaymentError);
        }
      }

    } else {
      console.log(`[APPYPAY-WEBHOOK] Order status unchanged: ${order.status}`);
    }

    // Return success response
    const response = {
      success: true,
      message: 'Webhook processed successfully',
      order_id: order.order_id,
      paymentType: paymentType,
      oldStatus: order.status,
      newStatus: newOrderStatus,
      updated: order.status !== newOrderStatus
    };

    console.log('[APPYPAY-WEBHOOK] Webhook processing completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('[APPYPAY-WEBHOOK] Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

Deno.serve(handler);