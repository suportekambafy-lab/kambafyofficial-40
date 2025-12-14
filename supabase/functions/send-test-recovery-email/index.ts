import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TestEmailRequest {
  email: string;
  subject: string;
  template: string;
  productId: string;
  emailNumber: number;
  includeDiscount?: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      email, 
      subject, 
      template, 
      productId, 
      emailNumber,
      includeDiscount,
      discountType,
      discountValue 
    }: TestEmailRequest = await req.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get product details including price and currency
    const { data: product } = await supabase
      .from("products")
      .select("name, price, currency")
      .eq("id", productId)
      .single();

    const productName = product?.name || "Produto Exemplo";
    const productPrice = product?.price || "0";
    const productCurrency = product?.currency || "KZ";

    // Format amount based on currency
    const formattedAmount = productCurrency === 'EUR' 
      ? `€${parseFloat(productPrice).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`
      : productCurrency === 'USD'
      ? `$${parseFloat(productPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `${parseFloat(productPrice).toLocaleString('pt-AO')} ${productCurrency}`;

    // Generate test coupon code
    const testCouponCode = `TESTE${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Format discount amount
    const discountAmountText = discountType === 'percentage'
      ? `${discountValue}%`
      : `${discountValue} ${productCurrency}`;

    // Generate test checkout link
    const checkoutLink = includeDiscount 
      ? `https://pay.kambafy.com/checkout/${productId}?coupon=${testCouponCode}&test=true`
      : `https://pay.kambafy.com/checkout/${productId}?test=true`;

    // Replace template variables with test data
    const emailBody = template
      .replace(/{customer_name}/g, "Vendedor (Teste)")
      .replace(/{product_name}/g, productName)
      .replace(/{amount}/g, formattedAmount)
      .replace(/{checkout_link}/g, checkoutLink)
      .replace(/{coupon_code}/g, testCouponCode)
      .replace(/{discount_amount}/g, discountAmountText);

    console.log(`Sending test recovery email ${emailNumber} to ${email}`);

    // Determine email badge color based on number
    const badgeColor = emailNumber === 3 ? '#10b981' : '#6366f1';
    const badgeText = emailNumber === 3 ? 'Email 3 - Com Cupom' : `Email ${emailNumber}`;

    // Send test email
    const emailResponse = await resend.emails.send({
      from: "Recuperação de Vendas <noreply@resend.dev>",
      to: [email],
      subject: `[TESTE] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ Este é um email de TESTE</p>
            <p style="margin: 4px 0 0 0; color: #92400e; font-size: 14px;">
              <span style="display: inline-block; background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">
                ${badgeText}
              </span>
              Este email foi enviado para verificar as configurações de recuperação de carrinho.
            </p>
          </div>
          ${includeDiscount ? `
          <div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-weight: bold;">🎁 Cupom de Teste: ${testCouponCode}</p>
            <p style="margin: 4px 0 0 0; color: #065f46; font-size: 14px;">Desconto: ${discountAmountText}</p>
          </div>
          ` : ''}
          <div style="white-space: pre-wrap; line-height: 1.6;">
${emailBody.split('\n').map(line => `            ${line}`).join('\n')}
          </div>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${checkoutLink}" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Finalizar Compra
            </a>
          </div>
        </div>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email de teste enviado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
