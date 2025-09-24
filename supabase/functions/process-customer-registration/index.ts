import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CustomerRegistrationRequest {
  customerName: string;
  customerEmail: string;
  productName: string;
  orderId: string;
  amount: string;
  currency: string;
  productId: string;
  shareLink?: string;
  memberAreaId?: string;
  sellerId: string;
  orderBump?: {
    bump_product_name: string;
    bump_product_price: string;
    bump_product_image?: string;
    discount: number;
    discounted_price: number;
    bump_product_id?: string;
    bump_share_link?: string;
    bump_member_area_id?: string;
  };
  baseProductPrice?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: CustomerRegistrationRequest = await req.json();
    const { customerEmail, customerName, orderId } = requestData;

    console.log('=== CUSTOMER REGISTRATION PROCESS START ===');
    console.log('Customer:', customerName, customerEmail);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o usuário já existe
    console.log('🔍 Checking if user exists...');
    const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('❌ Error checking existing users:', userCheckError);
      throw userCheckError;
    }

    const existingUser = existingUsers?.users?.find(user => user.email === customerEmail);
    let needsPasswordReset = false;

    if (!existingUser) {
      console.log('👤 Creating new user account...');
      
      // Criar conta automática com senha temporária
      const temporaryPassword = Math.random().toString(36).slice(-12) + 'Temp123!';
      
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: temporaryPassword,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          full_name: customerName,
          created_via: 'purchase',
          order_id: orderId
        }
      });

      if (createUserError) {
        console.error('❌ Error creating user:', createUserError);
        throw createUserError;
      }

      console.log('✅ User created successfully:', newUser.user?.email);
      needsPasswordReset = true;

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user?.id,
          full_name: customerName,
          email: customerEmail
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        // Não falhar por causa do perfil
      } else {
        console.log('✅ Profile created successfully');
      }
    } else {
      console.log('✅ User already exists:', existingUser.email);
    }

    // Enviar email de reset de senha se necessário
    if (needsPasswordReset) {
      console.log('📧 Sending password reset email...');
      
      const { error: passwordResetError } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: customerEmail,
          customerName: customerName,
          isNewAccount: true,
          orderId: orderId
        }
      });

      if (passwordResetError) {
        console.error('❌ Error sending password reset:', passwordResetError);
        // Não falhar por causa do email de senha
      } else {
        console.log('✅ Password reset email sent');
      }

      // Aguardar um pouco antes de enviar os emails de produto
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Agora enviar confirmações de compra
    console.log('📧 Sending purchase confirmations...');

    // Email para produto principal
    const mainProductPayload = {
      ...requestData,
      orderBump: undefined // Remover order bump do email principal
    };

    const { error: mainEmailError } = await supabase.functions.invoke('send-purchase-confirmation', {
      body: mainProductPayload
    });

    if (mainEmailError) {
      console.error('❌ Error sending main product email:', mainEmailError);
    } else {
      console.log('✅ Main product confirmation sent');
    }

    // Se houver order bump, enviar email separado
    if (requestData.orderBump) {
      console.log('📧 Sending order bump confirmation...');
      
      const orderBumpPayload = {
        customerName: requestData.customerName,
        customerEmail: requestData.customerEmail,
        productName: requestData.orderBump.bump_product_name,
        orderId: `${requestData.orderId}-BUMP`,
        amount: requestData.orderBump.discounted_price > 0 
          ? requestData.orderBump.discounted_price.toString() 
          : requestData.orderBump.bump_product_price,
        currency: requestData.currency,
        productId: requestData.orderBump.bump_product_id || requestData.productId,
        shareLink: requestData.orderBump.bump_share_link,
        memberAreaId: requestData.orderBump.bump_member_area_id,
        sellerId: requestData.sellerId,
        baseProductPrice: requestData.orderBump.bump_product_price
      };

      const { error: bumpEmailError } = await supabase.functions.invoke('send-purchase-confirmation', {
        body: orderBumpPayload
      });

      if (bumpEmailError) {
        console.error('❌ Error sending order bump email:', bumpEmailError);
      } else {
        console.log('✅ Order bump confirmation sent');
      }

      // Disparar webhooks para o order bump
      if (requestData.orderBump.bump_product_id) {
        try {
          console.log('🔔 Triggering webhooks for order bump...');
          
          const bumpPaymentPayload = {
            event: 'payment.success',
            data: {
              order_id: `${requestData.orderId}-BUMP`,
              amount: requestData.orderBump.discounted_price > 0 
                ? requestData.orderBump.discounted_price 
                : parseFloat(requestData.orderBump.bump_product_price.replace(/[^\d.,]/g, '').replace(',', '.')),
              currency: requestData.currency,
              customer_email: requestData.customerEmail,
              customer_name: requestData.customerName,
              product_id: requestData.orderBump.bump_product_id,
              product_name: requestData.orderBump.bump_product_name,
              payment_method: 'order_bump',
              is_order_bump: true,
              main_order_id: requestData.orderId,
              timestamp: new Date().toISOString()
            },
            user_id: requestData.sellerId,
            order_id: `${requestData.orderId}-BUMP`,
            product_id: requestData.orderBump.bump_product_id
          };

          await supabase.functions.invoke('trigger-webhooks', {
            body: bumpPaymentPayload
          });

          // Também disparar evento de produto comprado para o order bump
          const bumpPurchasePayload = {
            event: 'product.purchased',
            data: {
              order_id: `${requestData.orderId}-BUMP`,
              product_id: requestData.orderBump.bump_product_id,
              product_name: requestData.orderBump.bump_product_name,
              customer_email: requestData.customerEmail,
              customer_name: requestData.customerName,
              price: requestData.orderBump.discounted_price > 0 
                ? requestData.orderBump.discounted_price.toString() 
                : requestData.orderBump.bump_product_price,
              currency: requestData.currency,
              is_order_bump: true,
              main_order_id: requestData.orderId,
              timestamp: new Date().toISOString()
            },
            user_id: requestData.sellerId,
            order_id: `${requestData.orderId}-BUMP`,
            product_id: requestData.orderBump.bump_product_id
          };

          await supabase.functions.invoke('trigger-webhooks', {
            body: bumpPurchasePayload
          });

          console.log('✅ Order bump webhooks triggered successfully');

        } catch (webhookError) {
          console.error('❌ Error triggering order bump webhooks:', webhookError);
          // Não falhar o processo por causa dos webhooks
        }
      }
    }

    console.log('=== CUSTOMER REGISTRATION PROCESS COMPLETE ===');

    return new Response(JSON.stringify({
      success: true,
      userCreated: needsPasswordReset,
      passwordResetSent: needsPasswordReset,
      mainProductEmailSent: true,
      orderBumpEmailSent: !!requestData.orderBump
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERROR IN CUSTOMER REGISTRATION ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro no processo de registro do cliente'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);