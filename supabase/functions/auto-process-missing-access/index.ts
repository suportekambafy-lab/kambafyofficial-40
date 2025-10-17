import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MissingAccessOrder {
  id: string;
  order_id: string;
  customer_email: string;
  customer_name: string;
  product_id: string;
  amount: string;
  currency: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 [AUTO-PROCESS] Iniciando processamento automático de acessos faltantes");

    // Buscar pedidos completados sem acesso (últimas 48h)
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_id,
        customer_email,
        customer_name,
        product_id,
        amount,
        currency,
        created_at
      `)
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("❌ [AUTO-PROCESS] Erro ao buscar pedidos:", ordersError);
      throw ordersError;
    }

    console.log(`📦 [AUTO-PROCESS] Encontrados ${orders?.length || 0} pedidos completados`);

    // Filtrar apenas pedidos sem acesso
    const ordersWithoutAccess: MissingAccessOrder[] = [];
    
    for (const order of orders || []) {
      const { data: existingAccess } = await supabase
        .from("customer_access")
        .select("id")
        .eq("order_id", order.order_id)
        .single();

      if (!existingAccess) {
        ordersWithoutAccess.push(order);
      }
    }

    console.log(`🚨 [AUTO-PROCESS] ${ordersWithoutAccess.length} pedidos SEM acesso criado`);

    if (ordersWithoutAccess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum pedido sem acesso encontrado",
          total_orders: orders?.length || 0,
          orders_processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];

    // Processar cada pedido sem acesso
    for (const order of ordersWithoutAccess) {
      try {
        console.log(`🔧 [AUTO-PROCESS] Processando pedido ${order.order_id}...`);

        // Buscar produto
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", order.product_id)
          .single();

        if (productError || !product) {
          throw new Error(`Produto não encontrado: ${order.product_id}`);
        }

        // 1. Criar customer_access
        const expirationDate = product.access_duration_type === 'lifetime' 
          ? null 
          : calculateExpiration(product.access_duration_type, product.access_duration_value);

        const { error: accessError } = await supabase
          .from("customer_access")
          .insert({
            customer_email: order.customer_email.toLowerCase().trim(),
            customer_name: order.customer_name,
            product_id: order.product_id,
            order_id: order.order_id,
            access_expires_at: expirationDate,
            is_active: true,
          });

        if (accessError && accessError.code !== '23505') { // Ignorar duplicatas
          throw accessError;
        }

        console.log(`✅ [AUTO-PROCESS] Acesso criado para ${order.customer_email}`);

        // 2. Enviar email via send-purchase-confirmation
        const { error: emailError } = await supabase.functions.invoke(
          "send-purchase-confirmation",
          {
            body: {
              customerEmail: order.customer_email,
              customerName: order.customer_name,
              productName: product.name,
              productId: order.product_id,
              orderId: order.order_id,
              amount: order.amount,
              currency: order.currency,
              sellerId: product.user_id, // ✅ ADICIONAR sellerId do produto
              memberAreaId: product.member_area_id,
              shareLink: product.share_link,
              paymentStatus: "completed",
              isNewAccount: false,
            },
          }
        );

        if (emailError) {
          console.error(`⚠️ [AUTO-PROCESS] Erro ao enviar email (acesso já criado):`, emailError);
          // Não falhar completamente se o email falhar, o acesso já foi criado
        } else {
          console.log(`📧 [AUTO-PROCESS] Email enviado para ${order.customer_email}`);
        }

        successCount++;
      } catch (error: any) {
        console.error(`❌ [AUTO-PROCESS] Erro ao processar ${order.order_id}:`, error);
        errorCount++;
        errorDetails.push({
          order_id: order.order_id,
          email: order.customer_email,
          error: error.message,
        });
      }
    }

    const result = {
      success: errorCount === 0,
      total_orders: orders?.length || 0,
      orders_without_access: ordersWithoutAccess.length,
      orders_processed: successCount,
      errors: errorCount,
      error_details: errorDetails,
      message: `Processamento concluído: ${successCount} acessos criados, ${errorCount} erros`,
    };

    console.log("📊 [AUTO-PROCESS] Resultado final:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [AUTO-PROCESS] Erro geral:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateExpiration(type: string, value: number): string {
  const now = new Date();
  
  switch (type) {
    case 'days':
      now.setDate(now.getDate() + value);
      break;
    case 'months':
      now.setMonth(now.getMonth() + value);
      break;
    case 'years':
      now.setFullYear(now.getFullYear() + value);
      break;
    default:
      return null as any; // lifetime
  }
  
  return now.toISOString();
}
