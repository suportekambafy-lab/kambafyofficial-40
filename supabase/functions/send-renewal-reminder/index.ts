import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SEND-RENEWAL-REMINDER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    const { subscriptionId, daysBefore } = await req.json();

    logStep("Sending renewal reminder", { subscriptionId, daysBefore });

    // 1. Buscar dados da assinatura
    const { data: subscription, error: subError } = await supabaseClient
      .from('customer_subscriptions')
      .select('*, products(*)')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subError?.message}`);
    }

    logStep("Subscription data loaded", {
      customerEmail: subscription.customer_email,
      productName: subscription.products.name
    });

    // 2. Gerar token de renovação
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc('generate_renewal_token', { p_subscription_id: subscriptionId });

    if (tokenError) {
      throw new Error(`Failed to generate token: ${tokenError.message}`);
    }

    const renewalLink = `${req.headers.get("origin") || "https://kambafy.com"}/renovar/${tokenData}`;

    logStep("Renewal token generated", { token: tokenData.substring(0, 10) + "..." });

    // 3. Templates de email baseado em daysBefore
    const emailTemplates: Record<number, { subject: string; body: string }> = {
      7: {
        subject: `${subscription.customer_name}, sua assinatura vence em 7 dias!`,
        body: `
          <h2>Olá ${subscription.customer_name},</h2>
          <p>Sua assinatura do <strong>${subscription.products.name}</strong> vence em <strong>7 dias</strong>.</p>
          <p>Para manter seu acesso sem interrupções, renove agora:</p>
          <p><a href="${renewalLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Renovar Assinatura</a></p>
          <p>Se tiver dúvidas, entre em contato conosco.</p>
        `
      },
      3: {
        subject: `⏰ Faltam apenas 3 dias para sua assinatura expirar`,
        body: `
          <h2>Olá ${subscription.customer_name},</h2>
          <p><strong>Atenção!</strong> Sua assinatura do <strong>${subscription.products.name}</strong> vence em <strong>3 dias</strong>.</p>
          <p>Não perca o acesso! Renove agora com apenas alguns cliques:</p>
          <p><a href="${renewalLink}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Renovar Agora</a></p>
          <p>Obrigado por confiar em nós!</p>
        `
      },
      1: {
        subject: `🚨 URGENTE: Sua assinatura expira amanhã!`,
        body: `
          <h2>🚨 Ação Urgente Necessária!</h2>
          <p>Olá ${subscription.customer_name},</p>
          <p>Sua assinatura do <strong>${subscription.products.name}</strong> expira <strong>AMANHÃ</strong>!</p>
          <p>Para evitar a perda de acesso, renove agora mesmo:</p>
          <p><a href="${renewalLink}" style="background-color: #DC2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">RENOVAR URGENTEMENTE</a></p>
          <p>Após a expiração, você perderá o acesso temporariamente.</p>
        `
      }
    };

    const template = emailTemplates[daysBefore];
    if (!template) {
      throw new Error(`Invalid daysBefore value: ${daysBefore}`);
    }

    // 4. Enviar email via Resend (se configurado)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailStatus = 'sent';
    let errorMessage = null;

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Kambafy <noreply@kambafy.com>',
            to: subscription.customer_email,
            subject: template.subject,
            html: template.body
          })
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        logStep("Email sent successfully");
      } catch (emailError) {
        logStep("Email error", emailError);
        emailStatus = 'failed';
        errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      }
    } else {
      logStep("RESEND_API_KEY not configured, skipping email");
    }

    // 5. Registrar lembrete
    const { error: reminderError } = await supabaseClient
      .from('subscription_renewal_reminders')
      .insert({
        subscription_id: subscriptionId,
        days_before: daysBefore,
        reminder_type: 'email',
        status: emailStatus,
        error_message: errorMessage
      });

    if (reminderError) {
      logStep("Error registering reminder", reminderError);
    }

    // 6. Atualizar last_renewal_reminder
    await supabaseClient
      .from('customer_subscriptions')
      .update({ last_renewal_reminder: new Date().toISOString() })
      .eq('id', subscriptionId);

    logStep("Reminder sent successfully", { daysBefore, emailStatus });

    return new Response(
      JSON.stringify({ 
        success: true,
        renewalLink,
        emailStatus
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR sending reminder", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
