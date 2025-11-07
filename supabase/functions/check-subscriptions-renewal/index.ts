import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTIONS-RENEWAL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    const today = new Date();
    const reminderDays = [7, 3, 1];
    let totalProcessed = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      logStep(`Checking subscriptions expiring in ${days} days`, {
        targetDate: targetDate.toISOString()
      });

      // Buscar assinaturas manuais ativas que vencem neste dia
      const { data: subscriptions, error: subError } = await supabaseClient
        .from('customer_subscriptions')
        .select('*, products(id, name, user_id, subscription_config)')
        .eq('renewal_type', 'manual')
        .eq('status', 'active')
        .gte('current_period_end', startOfDay.toISOString())
        .lte('current_period_end', endOfDay.toISOString());

      if (subError) {
        logStep(`Error fetching subscriptions for ${days} days`, subError);
        continue;
      }

      logStep(`Found ${subscriptions?.length || 0} subscriptions expiring in ${days} days`);

      for (const sub of subscriptions || []) {
        // Verificar se já enviou lembrete deste tipo
        const { data: existingReminder } = await supabaseClient
          .from('subscription_renewal_reminders')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('days_before', days)
          .maybeSingle();

        if (!existingReminder) {
          logStep(`Sending reminder for subscription ${sub.id}`, {
            days,
            customerEmail: sub.customer_email
          });

          // Enviar lembrete
          const { error: reminderError } = await supabaseClient.functions.invoke('send-renewal-reminder', {
            body: {
              subscriptionId: sub.id,
              daysBefore: days
            }
          });

          if (reminderError) {
            logStep(`Error sending reminder for ${sub.id}`, reminderError);
          } else {
            totalProcessed++;
          }
        } else {
          logStep(`Reminder already sent for subscription ${sub.id} (${days} days)`);
        }
      }
    }

    logStep("Cron job completed", { totalProcessed });

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalProcessed,
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
