import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION_RATE = 0.0899; // 8.99%

const logStep = (step: string, details?: any) => {
  console.log(`[PROCESS-MANUAL-RENEWAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { token, paymentMethod, paymentData } = await req.json();

    logStep("Processing manual renewal", { token: token?.substring(0, 10) + "..." });

    // 1. Validar token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('subscription_renewal_tokens')
      .select(`
        *,
        customer_subscriptions (
          *,
          products (*)
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscription = tokenData.customer_subscriptions;
    const product = subscription.products;
    const config = product.subscription_config || {};

    logStep("Token validated", {
      subscriptionId: subscription.id,
      customerEmail: subscription.customer_email
    });

    // 2. Verificar se permite reativação
    if (config.allow_reactivation === false) {
      return new Response(
        JSON.stringify({ error: 'Reativação não permitida para este produto' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calcular preço com desconto
    let finalPrice = parseFloat(product.price);
    const isPastDue = subscription.status === 'past_due';
    const discountPercentage = isPastDue && config.reactivation_discount_percentage 
      ? config.reactivation_discount_percentage 
      : 0;

    if (discountPercentage > 0) {
      finalPrice = finalPrice * (1 - discountPercentage / 100);
    }

    logStep("Price calculated", {
      basePrice: product.price,
      discount: discountPercentage,
      finalPrice
    });

    // 4. Processar pagamento (aqui assumimos que já foi pago externamente)
    // Em produção, você integraria com AppyPay ou outro gateway

    // 5. Renovar assinatura
    const interval = config.interval === 'year' ? 365 : 30;
    const newPeriodStart = new Date();
    const newPeriodEnd = new Date(subscription.current_period_end);
    
    // Se está expirada, começar de hoje
    if (new Date(subscription.current_period_end) < new Date()) {
      newPeriodEnd.setTime(newPeriodStart.getTime());
    }
    
    newPeriodEnd.setDate(newPeriodEnd.getDate() + interval);

    const { error: renewError } = await supabaseClient
      .from('customer_subscriptions')
      .update({
        status: 'active',
        current_period_start: newPeriodStart.toISOString(),
        current_period_end: newPeriodEnd.toISOString(),
        reactivation_count: subscription.reactivation_count + 1,
        suspension_date: null,
        grace_period_end: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (renewError) {
      throw new Error(`Failed to renew subscription: ${renewError.message}`);
    }

    logStep("Subscription renewed", {
      newPeriodEnd: newPeriodEnd.toISOString()
    });

    // 6. Reativar acesso
    await supabaseClient
      .from('customer_access')
      .update({ 
        is_active: true,
        access_expires_at: newPeriodEnd.toISOString()
      })
      .eq('customer_email', subscription.customer_email)
      .eq('product_id', product.id);

    // 7. Marcar token como usado
    await supabaseClient
      .from('subscription_renewal_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    // 8. Criar transação para o vendedor
    const sellerAmount = finalPrice * (1 - PLATFORM_COMMISSION_RATE);
    const platformFee = finalPrice * PLATFORM_COMMISSION_RATE;

    await supabaseClient.from('balance_transactions').insert([
      {
        user_id: product.user_id,
        type: 'subscription_renewal',
        amount: sellerAmount,
        currency: 'KZ',
        description: `Renovação manual - ${product.name}`,
        order_id: subscription.stripe_subscription_id || subscription.id
      },
      {
        user_id: product.user_id,
        type: 'platform_fee',
        amount: -platformFee,
        currency: 'KZ',
        description: `Taxa plataforma (8.99%) - Renovação ${product.name}`,
        order_id: subscription.stripe_subscription_id || subscription.id
      }
    ]);

    logStep("Transactions created", {
      sellerAmount,
      platformFee
    });

    // 9. Enviar email de confirmação
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Kambafy <noreply@kambafy.com>',
            to: subscription.customer_email,
            subject: `Assinatura renovada com sucesso!`,
            html: `
              <h2>Parabéns ${subscription.customer_name}!</h2>
              <p>Sua assinatura do <strong>${product.name}</strong> foi renovada com sucesso!</p>
              <p><strong>Próxima cobrança:</strong> ${newPeriodEnd.toLocaleDateString('pt-BR')}</p>
              <p><strong>Valor pago:</strong> ${finalPrice.toFixed(2)} KZ</p>
              ${discountPercentage > 0 ? `<p><strong>Desconto aplicado:</strong> ${discountPercentage}%</p>` : ''}
              <p>Obrigado por continuar conosco!</p>
            `
          })
        });
        logStep("Confirmation email sent");
      } catch (emailError) {
        logStep("Error sending confirmation email", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        newPeriodEnd: newPeriodEnd.toISOString(),
        amountPaid: finalPrice
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing renewal", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
