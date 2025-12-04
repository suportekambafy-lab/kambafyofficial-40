import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TEST-WEBHOOK-EVENT] ${step}${detailsStr}`);
};

interface TestEventRequest {
  event_type: string;
  product_id: string;
  webhook_url?: string;
  webhook_secret?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }

    const { event_type, product_id, webhook_url, webhook_secret }: TestEventRequest = await req.json();
    logStep("Request params", { event_type, product_id });

    // Get product details
    const { data: product } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (!product) {
      throw new Error("Product not found");
    }

    // Get webhook settings if not provided
    let targetUrl = webhook_url;
    let targetSecret = webhook_secret;

    if (!targetUrl) {
      const { data: webhookSettings } = await supabaseClient
        .from("webhook_settings")
        .select("*")
        .eq("product_id", product_id)
        .eq("active", true)
        .single();

      if (!webhookSettings) {
        throw new Error("No active webhook configured for this product");
      }

      targetUrl = webhookSettings.url;
      targetSecret = webhookSettings.secret;
    }

    // Generate test data based on event type
    const testCustomer = {
      email: "teste@exemplo.com",
      name: "Cliente Teste",
      phone: "+244923456789"
    };

    const subscriptionConfig = product.subscription_config as any;
    const testData: any = {
      event: event_type,
      timestamp: new Date().toISOString(),
      test_mode: true,
      customer: testCustomer,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        type: product.type
      }
    };

    // Add event-specific data
    switch (event_type) {
      case "subscription.paid":
        const nextPaymentDate = new Date();
        if (subscriptionConfig?.interval === "monthly") {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (subscriptionConfig?.interval_count || 1));
        } else if (subscriptionConfig?.interval === "yearly") {
          nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + (subscriptionConfig?.interval_count || 1));
        } else {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        }

        testData.subscription = {
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: nextPaymentDate.toISOString(),
          next_payment_date: nextPaymentDate.toISOString(),
          interval: subscriptionConfig?.interval || "monthly",
          interval_count: subscriptionConfig?.interval_count || 1
        };
        testData.payment = {
          order_id: `TEST-${Date.now()}`,
          amount: product.price,
          currency: "AOA",
          method: "appypay",
          paid_at: new Date().toISOString()
        };
        testData.access = {
          should_grant: true,
          reason: "Pagamento de assinatura confirmado"
        };
        break;

      case "subscription.payment_failed":
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        testData.subscription = {
          status: "past_due",
          expired_at: new Date().toISOString(),
          suspended_at: new Date().toISOString(),
          grace_period_end: gracePeriodEnd.toISOString(),
          interval: subscriptionConfig?.interval || "monthly"
        };
        testData.access = {
          should_revoke: true,
          reason: "Pagamento não recebido após vencimento",
          grace_period_days: 7
        };
        testData.reactivation = {
          url: `https://kambafy.com/reactivate/${product.id}`,
          discount_available: true,
          discount_percentage: 10
        };
        break;

      case "order.created":
        testData.order = {
          id: `TEST-${Date.now()}`,
          status: "pending",
          amount: product.price,
          currency: "AOA",
          payment_method: "appypay",
          created_at: new Date().toISOString()
        };
        break;

      case "order.completed":
        testData.order = {
          id: `TEST-${Date.now()}`,
          status: "completed",
          amount: product.price,
          currency: "AOA",
          payment_method: "appypay",
          completed_at: new Date().toISOString()
        };
        testData.access = {
          should_grant: true,
          expires_at: product.access_duration_type === "lifetime" 
            ? null 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        break;

      case "payment.success":
        testData.payment = {
          id: `PAY-TEST-${Date.now()}`,
          order_id: `TEST-${Date.now()}`,
          amount: product.price,
          currency: "AOA",
          method: "appypay",
          status: "completed",
          paid_at: new Date().toISOString()
        };
        break;

      case "payment.failed":
        testData.payment = {
          id: `PAY-TEST-${Date.now()}`,
          order_id: `TEST-${Date.now()}`,
          amount: product.price,
          currency: "AOA",
          method: "appypay",
          status: "failed",
          failed_at: new Date().toISOString(),
          error: "Saldo insuficiente"
        };
        break;

      default:
        testData.message = "Evento de teste genérico";
    }

    logStep("Sending test webhook", { url: targetUrl, event: event_type });

    // Send webhook
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event_type,
      "X-Test-Mode": "true"
    };

    if (targetSecret) {
      headers["X-Webhook-Secret"] = targetSecret;
      headers["Authorization"] = `Bearer ${targetSecret}`;
    }

    const webhookResponse = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(testData)
    });

    const responseText = await webhookResponse.text().catch(() => "");
    logStep("Webhook response", { status: webhookResponse.status, body: responseText.substring(0, 500) });

    // Log the test
    await supabaseClient.from("webhook_logs").insert({
      user_id: userData.user.id,
      event_type: event_type,
      payload: testData,
      response_status: webhookResponse.status,
      response_body: responseText.substring(0, 1000)
    });

    return new Response(
      JSON.stringify({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        event_type,
        payload_sent: testData,
        response_preview: responseText.substring(0, 500)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
