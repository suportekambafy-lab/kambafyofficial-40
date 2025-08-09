import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

interface ApiRequest {
  email: string;
  amount: number;
  currency?: string;
  orderId: string;
  customerName?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let partnerId: string | null = null;
  let statusCode = 200;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from headers
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      statusCode = 401;
      throw new Error("API key required");
    }

    // Validate API key and get partner
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("api_key", apiKey)
      .eq("status", "approved")
      .single();

    if (partnerError || !partner) {
      statusCode = 401;
      throw new Error("Invalid or inactive API key");
    }

    partnerId = partner.id;

    // Route requests based on path and method
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    console.log(`API Request: ${method} ${path} from partner ${partner.company_name}`);

    // Balance operations
    if (path === "/balance" && method === "GET") {
      const email = url.searchParams.get("email");
      if (!email) {
        statusCode = 400;
        throw new Error("Email parameter required");
      }

      const { data: balance } = await supabase
        .from("customer_balances")
        .select("balance, currency")
        .eq("email", email)
        .single();

      const response = {
        email,
        balance: balance?.balance || 0,
        currency: balance?.currency || "KZ"
      };

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Payment processing
    if (path === "/payments" && method === "POST") {
      const body: ApiRequest = await req.json();
      
      if (!body.email || !body.amount || !body.orderId) {
        statusCode = 400;
        throw new Error("Missing required fields: email, amount, orderId");
      }

      // Check monthly transaction limit
      if (partner.current_month_transactions + body.amount > partner.monthly_transaction_limit) {
        statusCode = 429;
        throw new Error("Monthly transaction limit exceeded");
      }

      // Process payment via KambaPay
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        "process-kambapay-payment",
        {
          body: {
            email: body.email,
            productPrice: body.amount,
            productId: "api_" + body.orderId,
            currency: body.currency || "KZ",
            customerName: body.customerName || body.email,
            metadata: {
              ...body.metadata,
              partner_id: partnerId,
              api_order_id: body.orderId
            }
          }
        }
      );

      if (paymentError) {
        statusCode = 400;
        throw new Error(paymentError.message);
      }

      // Log transaction
      await supabase.from("partner_transactions").insert({
        partner_id: partnerId,
        order_id: body.orderId,
        transaction_type: "payment",
        amount: body.amount,
        commission_amount: (body.amount * partner.commission_rate) / 100,
        currency: body.currency || "KZ",
        status: "completed",
        metadata: body.metadata || {}
      });

      // Update partner stats
      await supabase
        .from("partners")
        .update({
          current_month_transactions: partner.current_month_transactions + body.amount,
          total_transactions: partner.total_transactions + 1,
          total_revenue: partner.total_revenue + body.amount
        })
        .eq("id", partnerId);

      return new Response(JSON.stringify({
        success: true,
        orderId: body.orderId,
        transactionId: paymentResult.orderId,
        amount: body.amount,
        currency: body.currency || "KZ"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Transaction status
    if (path === "/transactions" && method === "GET") {
      const orderId = url.searchParams.get("orderId");
      if (!orderId) {
        statusCode = 400;
        throw new Error("Order ID required");
      }

      const { data: transaction } = await supabase
        .from("partner_transactions")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("order_id", orderId)
        .single();

      if (!transaction) {
        statusCode = 404;
        throw new Error("Transaction not found");
      }

      return new Response(JSON.stringify(transaction), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // API usage stats
    if (path === "/stats" && method === "GET") {
      const { data: stats } = await supabase
        .from("api_usage_logs")
        .select("endpoint, method, status_code, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify({
        partner: {
          company_name: partner.company_name,
          status: partner.status,
          commission_rate: partner.commission_rate,
          monthly_limit: partner.monthly_transaction_limit,
          current_month_usage: partner.current_month_transactions
        },
        recent_usage: stats || []
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    statusCode = 404;
    throw new Error("Endpoint not found");

  } catch (error: any) {
    console.error("API Error:", error);

    return new Response(JSON.stringify({
      error: error.message,
      code: statusCode
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } finally {
    // Log API usage
    if (partnerId) {
      const responseTime = Date.now() - startTime;
      const url = new URL(req.url);
      
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        
        await supabase.rpc("log_api_usage", {
          _partner_id: partnerId,
          _endpoint: url.pathname,
          _method: req.method,
          _status_code: statusCode,
          _response_time_ms: responseTime,
          _ip_address: req.headers.get("x-forwarded-for") || "unknown",
          _user_agent: req.headers.get("user-agent") || "unknown"
        });
      } catch (logError) {
        console.error("Failed to log API usage:", logError);
      }
    }
  }
});