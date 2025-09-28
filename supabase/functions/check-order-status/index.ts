import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId, sessionId } = await req.json();

    if (!orderId && !sessionId) {
      return new Response(
        JSON.stringify({ error: "order_id ou session_id é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let orderData = null;

    // Buscar por order_id
    if (orderId) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .eq('order_id', orderId)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    // Buscar por stripe_session_id se não encontrou por order_id
    if (!orderData && sessionId) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    // Verificar se é UUID e buscar por ID se necessário
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
    
    if (!orderData && orderId && isUuid(orderId)) {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, customer_email, payment_method, created_at, updated_at')
        .eq('id', orderId)
        .maybeSingle();

      if (data && !error) {
        orderData = data;
      }
    }

    if (!orderData) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderData.id,
          order_id: orderData.order_id,
          status: orderData.status,
          payment_method: orderData.payment_method,
          created_at: orderData.created_at,
          updated_at: orderData.updated_at
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});