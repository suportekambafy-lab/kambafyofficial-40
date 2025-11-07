import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CANCEL-GRACE-EXPIRED] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    logStep("Cron job started");

    const today = new Date().toISOString();

    // Buscar assinaturas em past_due com período de graça vencido
    const { data: gracedSubs, error: subError } = await supabaseClient
      .from('customer_subscriptions')
      .select('*, products(*)')
      .eq('status', 'past_due')
      .not('grace_period_end', 'is', null)
      .lt('grace_period_end', today);

    if (subError) {
      throw new Error(`Error fetching grace period expired subscriptions: ${subError.message}`);
    }

    logStep(`Found ${gracedSubs?.length || 0} subscriptions with expired grace period`);

    let canceled = 0;

    for (const sub of gracedSubs || []) {
      logStep(`Canceling subscription ${sub.id}`, {
        customerEmail: sub.customer_email,
        gracePeriodEnd: sub.grace_period_end
      });

      // Cancelar definitivamente
      const { error: updateError } = await supabaseClient
        .from('customer_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (updateError) {
        logStep(`Error canceling subscription ${sub.id}`, updateError);
        continue;
      }

      // Enviar email de cancelamento final
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
              to: sub.customer_email,
              subject: `Sua assinatura foi cancelada`,
              html: `
                <h2>Olá ${sub.customer_name},</h2>
                <p>Infelizmente, sua assinatura do <strong>${sub.products.name}</strong> foi cancelada devido ao não pagamento.</p>
                <p>Sentimos sua falta! Você pode assinar novamente a qualquer momento.</p>
                <p><a href="https://kambafy.com/produto/${sub.products.id}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver Produto</a></p>
                <p>Se tiver dúvidas, entre em contato conosco.</p>
              `
            })
          });
          logStep(`Cancellation email sent to ${sub.customer_email}`);
        } catch (emailError) {
          logStep(`Error sending cancellation email`, emailError);
        }
      }

      canceled++;
    }

    logStep("Cron job completed", { canceled });

    return new Response(
      JSON.stringify({ 
        success: true, 
        canceled,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cron job", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
