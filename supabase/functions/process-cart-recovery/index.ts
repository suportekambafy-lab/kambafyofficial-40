import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RecoverySettings {
  id: string;
  product_id: string;
  user_id: string;
  enabled: boolean;
  email_delay_hours: number;
  max_recovery_attempts: number;
  email_subject: string;
  email_template: string;
  email_subject_2: string | null;
  email_template_2: string | null;
  email_subject_3: string | null;
  email_template_3: string | null;
  enable_discount_on_last: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

interface AbandonedPurchase {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  recovery_attempts_count: number;
  abandoned_at: string;
}

interface Product {
  id: string;
  name: string;
}

// Generate unique coupon code
function generateCouponCode(): string {
  return `VOLTA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cart recovery process...");

    // Get all enabled recovery settings
    const { data: settingsList, error: settingsError } = await supabase
      .from("sales_recovery_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsError) {
      console.error("Error fetching recovery settings:", settingsError);
      throw settingsError;
    }

    if (!settingsList || settingsList.length === 0) {
      console.log("No enabled recovery settings found");
      return new Response(
        JSON.stringify({ message: "No enabled recovery settings", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${settingsList.length} enabled recovery settings`);

    let totalProcessed = 0;
    let totalSent = 0;
    let totalErrors = 0;

    for (const settings of settingsList as RecoverySettings[]) {
      try {
        // Calculate the cutoff time based on email_delay_hours
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - settings.email_delay_hours);

        // Get abandoned purchases for this product that need recovery emails
        const { data: abandonedPurchases, error: purchasesError } = await supabase
          .from("abandoned_purchases")
          .select("*")
          .eq("product_id", settings.product_id)
          .eq("status", "abandoned")
          .lt("abandoned_at", cutoffTime.toISOString())
          .lt("recovery_attempts_count", settings.max_recovery_attempts)
          .order("abandoned_at", { ascending: true })
          .limit(50);

        if (purchasesError) {
          console.error(`Error fetching abandoned purchases for product ${settings.product_id}:`, purchasesError);
          continue;
        }

        if (!abandonedPurchases || abandonedPurchases.length === 0) {
          console.log(`No abandoned purchases to process for product ${settings.product_id}`);
          continue;
        }

        // Get product details
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, name")
          .eq("id", settings.product_id)
          .single();

        if (productError || !product) {
          console.error(`Error fetching product ${settings.product_id}:`, productError);
          continue;
        }

        console.log(`Processing ${abandonedPurchases.length} abandoned purchases for product: ${product.name}`);

        for (const purchase of abandonedPurchases as AbandonedPurchase[]) {
          totalProcessed++;

          try {
            // Determine which email to send based on attempts count
            const emailNumber = purchase.recovery_attempts_count + 1;
            const isLastEmail = emailNumber >= settings.max_recovery_attempts;
            
            // Get correct template based on email number
            let emailSubject = settings.email_subject;
            let emailTemplate = settings.email_template;
            
            if (emailNumber === 2 && settings.email_subject_2 && settings.email_template_2) {
              emailSubject = settings.email_subject_2;
              emailTemplate = settings.email_template_2;
            } else if (emailNumber >= 3 && settings.email_subject_3 && settings.email_template_3) {
              emailSubject = settings.email_subject_3;
              emailTemplate = settings.email_template_3;
            }

            // Generate coupon if it's the last email and discount is enabled
            let couponCode = '';
            let discountAmountText = '';
            let checkoutLink = `https://pay.kambafy.com/checkout/${product.id}?recovery=${purchase.id}`;
            
            if (isLastEmail && settings.enable_discount_on_last) {
              couponCode = generateCouponCode();
              discountAmountText = settings.discount_type === 'percentage'
                ? `${settings.discount_value}%`
                : `${settings.discount_value} ${purchase.currency}`;
              
              // Create the coupon in the database
              const { error: couponError } = await supabase
                .from("discount_coupons")
                .insert({
                  code: couponCode,
                  user_id: settings.user_id,
                  product_id: settings.product_id,
                  discount_type: settings.discount_type,
                  discount_value: settings.discount_value,
                  currency: purchase.currency,
                  max_uses: 1,
                  uses_per_customer: 1,
                  is_active: true,
                  valid_from: new Date().toISOString(),
                  valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Valid for 7 days
                });
              
              if (couponError) {
                console.error(`Error creating coupon for purchase ${purchase.id}:`, couponError);
              } else {
                checkoutLink = `https://pay.kambafy.com/checkout/${product.id}?recovery=${purchase.id}&coupon=${couponCode}`;
                console.log(`Created recovery coupon ${couponCode} for ${purchase.customer_email}`);
              }
            }

            // Format amount based on currency
            const formattedAmount = purchase.currency === 'EUR' 
              ? `€${purchase.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
              : purchase.currency === 'USD'
              ? `$${purchase.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `${purchase.amount.toLocaleString('pt-AO')} ${purchase.currency}`;

            // Replace template variables
            const emailBody = emailTemplate
              .replace(/{customer_name}/g, purchase.customer_name)
              .replace(/{product_name}/g, product.name)
              .replace(/{amount}/g, formattedAmount)
              .replace(/{checkout_link}/g, checkoutLink)
              .replace(/{coupon_code}/g, couponCode)
              .replace(/{discount_amount}/g, discountAmountText);

            const finalSubject = emailSubject
              .replace(/{customer_name}/g, purchase.customer_name)
              .replace(/{product_name}/g, product.name);

            // Build HTML email
            const couponSection = isLastEmail && settings.enable_discount_on_last && couponCode ? `
              <div style="background-color: #d1fae5; border: 2px dashed #10b981; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">🎁 Seu cupom exclusivo:</p>
                <p style="margin: 8px 0; color: #065f46; font-weight: bold; font-size: 24px; letter-spacing: 2px;">${couponCode}</p>
                <p style="margin: 0; color: #065f46; font-size: 16px;">Desconto de ${discountAmountText}!</p>
              </div>
            ` : '';

            // Send recovery email
            const emailResponse = await resend.emails.send({
              from: "Recuperação de Vendas <noreply@resend.dev>",
              to: [purchase.customer_email],
              subject: finalSubject,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="white-space: pre-wrap; line-height: 1.6;">
${emailBody.split('\n').map(line => `                    ${line}`).join('\n')}
                  </div>
                  ${couponSection}
                  <div style="margin-top: 30px; text-align: center;">
                    <a href="${checkoutLink}" 
                       style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Finalizar Compra
                    </a>
                  </div>
                </div>
              `,
            });

            console.log(`Recovery email ${emailNumber} sent to ${purchase.customer_email}:`, emailResponse);

            // Update purchase record
            const { error: updateError } = await supabase
              .from("abandoned_purchases")
              .update({
                recovery_attempts_count: purchase.recovery_attempts_count + 1,
                last_recovery_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", purchase.id);

            if (updateError) {
              console.error(`Error updating purchase ${purchase.id}:`, updateError);
            }

            // Log the email
            const { error: logError } = await supabase
              .from("recovery_email_logs")
              .insert({
                abandoned_purchase_id: purchase.id,
                email_sent_to: purchase.customer_email,
                email_subject: finalSubject,
                status: "sent",
                email_number: emailNumber,
                coupon_code: couponCode || null
              });

            if (logError) {
              console.error(`Error logging email for purchase ${purchase.id}:`, logError);
            }

            totalSent++;
          } catch (emailError: any) {
            console.error(`Error sending recovery email to ${purchase.customer_email}:`, emailError);
            totalErrors++;

            // Log the failed attempt
            await supabase
              .from("recovery_email_logs")
              .insert({
                abandoned_purchase_id: purchase.id,
                email_sent_to: purchase.customer_email,
                email_subject: settings.email_subject,
                status: "failed",
                error_message: emailError.message
              });
          }
        }
      } catch (settingsProcessError) {
        console.error(`Error processing settings ${settings.id}:`, settingsProcessError);
      }
    }

    console.log(`Cart recovery completed. Processed: ${totalProcessed}, Sent: ${totalSent}, Errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        message: "Cart recovery process completed",
        processed: totalProcessed,
        sent: totalSent,
        errors: totalErrors
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Cart recovery process error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
