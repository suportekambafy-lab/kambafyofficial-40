import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MultibancoEmailRequest {
  paymentIntentId: string;
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { paymentIntentId, orderId }: MultibancoEmailRequest = await req.json();

    console.log("📧 Processing Multibanco email request:", { paymentIntentId, orderId });

    if (!paymentIntentId || !orderId) {
      throw new Error("Missing paymentIntentId or orderId");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get order details
    console.log("🔍 Getting order details for orderId:", orderId);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_email, customer_name, product_id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('❌ Error fetching order details:', orderError);
      throw orderError;
    }

    if (!order) {
      console.error('❌ Order not found:', orderId);
      throw new Error(`Order ${orderId} not found`);
    }

    console.log("✅ Order found:", order);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name')
      .eq('id', order.product_id)
      .maybeSingle();

    if (productError) {
      console.error('❌ Error fetching product details:', productError);
      throw productError;
    }

    console.log("✅ Product found:", product);

    // Get Multibanco details from Stripe
    console.log("🏦 Getting Multibanco details from Stripe...");
    const { data: multibancoDetails, error: multibancoError } = await supabase.functions.invoke('get-multibanco-details', {
      body: { payment_intent_id: paymentIntentId }
    });

    if (multibancoError) {
      console.error('❌ Error getting Multibanco details:', multibancoError);
      throw multibancoError;
    }

    if (!multibancoDetails || !multibancoDetails.entity || !multibancoDetails.reference) {
      console.error('❌ Multibanco details not found or incomplete:', multibancoDetails);
      throw new Error('Multibanco details not found or incomplete');
    }

    console.log("✅ Multibanco details retrieved:", multibancoDetails);

    // Send Multibanco payment details email
    const emailPayload = {
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      productName: product?.name || 'Produto Digital',
      amount: multibancoDetails.amount,
      currency: multibancoDetails.currency,
      entity: multibancoDetails.entity,
      reference: multibancoDetails.reference,
      paymentIntentId: paymentIntentId
    };

    console.log("📧 Sending Multibanco payment email with payload:", emailPayload);

    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-multibanco-payment-details', {
      body: emailPayload
    });

    if (emailError) {
      console.error('❌ Error sending Multibanco payment details email:', emailError);
      throw emailError;
    }

    console.log('✅ Multibanco payment details email sent successfully:', emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
      emailResult: emailResult
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Error processing Multibanco email request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);