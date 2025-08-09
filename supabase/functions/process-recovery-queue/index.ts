import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get abandoned purchases that need recovery emails
    const now = new Date();
    const { data: abandonedPurchases, error } = await supabaseClient
      .from('abandoned_purchases')
      .select(`
        *,
        products!inner(
          sales_recovery_settings!inner(*)
        )
      `)
      .eq('status', 'abandoned')
      .not('products.sales_recovery_settings', 'is', null);

    if (error) {
      console.error('Error fetching abandoned purchases:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!abandonedPurchases || abandonedPurchases.length === 0) {
      return new Response(
        JSON.stringify({ message: "No purchases to process" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const processedPurchases: string[] = [];
    
    for (const purchase of abandonedPurchases) {
      const settings = purchase.products.sales_recovery_settings[0];
      
      if (!settings || !settings.enabled) {
        continue;
      }

      // Check if max attempts reached
      if (purchase.recovery_attempts_count >= settings.max_recovery_attempts) {
        // Mark as expired
        await supabaseClient
          .from('abandoned_purchases')
          .update({ status: 'expired' })
          .eq('id', purchase.id);
        continue;
      }

      // Check if enough time has passed
      const delayMs = settings.email_delay_hours * 60 * 60 * 1000;
      const lastAttempt = purchase.last_recovery_attempt_at 
        ? new Date(purchase.last_recovery_attempt_at)
        : new Date(purchase.abandoned_at);
      
      if (now.getTime() - lastAttempt.getTime() >= delayMs) {
        // Call the send-recovery-email function
        try {
          const response = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-recovery-email`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                abandonedPurchaseId: purchase.id
              })
            }
          );

          if (response.ok) {
            processedPurchases.push(purchase.id);
          } else {
            console.error(`Failed to send recovery email for purchase ${purchase.id}`);
          }
        } catch (emailError) {
          console.error(`Error sending recovery email for purchase ${purchase.id}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedPurchases.length} recovery emails`,
        processedPurchases 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error: any) {
    console.error("Error in process-recovery-queue function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);