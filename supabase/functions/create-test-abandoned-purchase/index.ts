import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestAbandonedPurchaseRequest {
  product_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  currency?: string;
  delay_minutes?: number; // Para testar diferentes delays
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const {
      product_id,
      customer_email,
      customer_name,
      amount,
      currency = "KZ",
      delay_minutes = 0
    }: TestAbandonedPurchaseRequest = await req.json();

    console.log("🔄 Criando carrinho abandonado de teste...");
    console.log("📝 Dados:", { product_id, customer_email, customer_name, amount, currency });

    // Verificar se o produto existe e tem configuração de recuperação
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sales_recovery_settings (
          enabled,
          email_delay_hours
        )
      `)
      .eq('id', product_id)
      .maybeSingle();

    if (productError) {
      console.error("❌ Erro ao buscar produto:", productError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao buscar produto",
          details: productError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!product) {
      return new Response(
        JSON.stringify({ 
          error: "Produto não encontrado"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verificar se existe configuração de recuperação
    if (!product.sales_recovery_settings || product.sales_recovery_settings.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Nenhuma configuração de recuperação de vendas encontrada para este produto. Configure primeiro no painel de integrações." 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const recoverySettings = product.sales_recovery_settings[0]; // Pegar a primeira configuração

    if (!recoverySettings.enabled) {
      return new Response(
        JSON.stringify({ 
          error: "Recuperação de vendas não está ativa para este produto" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Calcular o timestamp de abandono considerando o delay para teste
    const abandonedAt = new Date();
    if (delay_minutes > 0) {
      // Se especificou delay_minutes, ajustar para que o email seja enviado mais cedo
      const delayMs = delay_minutes * 60 * 1000;
      abandonedAt.setTime(abandonedAt.getTime() - delayMs);
    }

    // Criar carrinho abandonado
    const { data: abandonedPurchase, error: createError } = await supabase
      .from('abandoned_purchases')
      .insert({
        product_id,
        customer_email,
        customer_name,
        amount,
        currency,
        abandoned_at: abandonedAt.toISOString(),
        status: 'abandoned',
        recovery_attempts_count: 0
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Erro ao criar carrinho abandonado:", createError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao criar carrinho abandonado",
          details: createError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Carrinho abandonado criado:", abandonedPurchase.id);

    return new Response(
      JSON.stringify({ 
        message: "Carrinho abandonado criado com sucesso para teste",
        abandoned_purchase_id: abandonedPurchase.id,
        product_name: product.name,
        customer_email,
        abandoned_at: abandonedAt.toISOString(),
        note: delay_minutes > 0 
          ? `Carrinho configurado para ser processado imediatamente (delay simulado de ${delay_minutes} minutos)`
          : `Carrinho será processado após ${recoverySettings.email_delay_hours} horas`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);