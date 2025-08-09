import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecoveryEmailRequest {
  abandonedPurchaseId: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { abandonedPurchaseId }: RecoveryEmailRequest = await req.json();

    // Get abandoned purchase details
    const { data: abandonedPurchase, error: purchaseError } = await supabaseClient
      .from('abandoned_purchases')
      .select(`
        *,
        products!inner(
          id,
          name,
          slug,
          user_id,
          sales_recovery_settings!inner(*)
        )
      `)
      .eq('id', abandonedPurchaseId)
      .eq('status', 'abandoned')
      .single();

    if (purchaseError || !abandonedPurchase) {
      console.error('Purchase not found or error:', purchaseError);
      return new Response(
        JSON.stringify({ error: "Purchase not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const settings = abandonedPurchase.products.sales_recovery_settings[0];
    if (!settings || !settings.enabled) {
      return new Response(
        JSON.stringify({ error: "Recovery not enabled for this product" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if max attempts reached
    if (abandonedPurchase.recovery_attempts_count >= settings.max_recovery_attempts) {
      // Mark as expired
      await supabaseClient
        .from('abandoned_purchases')
        .update({ status: 'expired' })
        .eq('id', abandonedPurchaseId);

      return new Response(
        JSON.stringify({ message: "Max recovery attempts reached, marked as expired" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if enough time has passed since abandonment or last attempt
    const now = new Date();
    const delayMs = settings.email_delay_hours * 60 * 60 * 1000;
    
    const lastAttempt = abandonedPurchase.last_recovery_attempt_at 
      ? new Date(abandonedPurchase.last_recovery_attempt_at)
      : new Date(abandonedPurchase.abandoned_at);
    
    if (now.getTime() - lastAttempt.getTime() < delayMs) {
      return new Response(
        JSON.stringify({ message: "Not enough time has passed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prepare email content
    const checkoutUrl = `https://kambafy.com/checkout/${abandonedPurchase.products.slug}`;
    
    let emailContent = settings.email_template
      .replace(/{customer_name}/g, abandonedPurchase.customer_name)
      .replace(/{product_name}/g, abandonedPurchase.products.name)
      .replace(/{amount}/g, abandonedPurchase.amount.toString())
      .replace(/{currency}/g, abandonedPurchase.currency)
      .replace(/{checkout_url}/g, checkoutUrl);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [abandonedPurchase.customer_email],
      subject: settings.email_subject,
      html: emailContent.replace(/\n/g, '<br>'),
      text: emailContent,
    });

    if (emailResponse.error) {
      console.error("Email sending failed:", emailResponse.error);
      
      // Log failed attempt
      await supabaseClient
        .from('recovery_email_logs')
        .insert({
          abandoned_purchase_id: abandonedPurchaseId,
          email_subject: settings.email_subject,
          email_content: emailContent,
          delivery_status: 'failed',
          error_message: emailResponse.error.message
        });

      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update abandoned purchase with recovery attempt
    await supabaseClient
      .from('abandoned_purchases')
      .update({
        recovery_attempts_count: abandonedPurchase.recovery_attempts_count + 1,
        last_recovery_attempt_at: now.toISOString()
      })
      .eq('id', abandonedPurchaseId);

    // Log successful email
    await supabaseClient
      .from('recovery_email_logs')
      .insert({
        abandoned_purchase_id: abandonedPurchaseId,
        email_subject: settings.email_subject,
        email_content: emailContent,
        delivery_status: 'sent'
      });

    // Update analytics
    const { data: { user } } = await supabaseClient.auth.admin.getUserById(abandonedPurchase.products.user_id);
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      
      await supabaseClient
        .from('sales_recovery_analytics')
        .upsert({
          user_id: abandonedPurchase.products.user_id,
          product_id: abandonedPurchase.product_id,
          date: today,
          total_recovery_emails_sent: 1
        }, {
          onConflict: 'user_id,product_id,date',
          ignoreDuplicates: false
        });
    }

    console.log("Recovery email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        message: "Recovery email sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error: any) {
    console.error("Error in send-recovery-email function:", error);
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