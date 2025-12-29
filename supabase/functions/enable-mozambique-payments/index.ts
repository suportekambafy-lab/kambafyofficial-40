import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Esta função é para execução única pelo admin - não requer autenticação
// mas usa service role key internamente

// Métodos de pagamento de Moçambique atualizados
const MOZAMBIQUE_METHODS = [
  {
    id: "emola",
    name: "e-Mola",
    image: "/lovable-uploads/70243346-a1ea-47dc-8ef7-abbd4a3d66a4.png",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "mpesa",
    name: "M-Pesa",
    image: "/lovable-uploads/4f454653-fafe-4d96-8d4e-07ea4d0d6acf.png",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  },
  {
    id: "card_mz",
    name: "Pagamento com Cartão",
    image: "/lovable-uploads/3253c01d-89da-4a32-846f-4861dd03645c.png",
    enabled: true,
    isMozambique: true,
    countryFlag: "🇲🇿",
    countryName: "Moçambique"
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os produtos
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, payment_methods");

    if (fetchError) {
      throw new Error(`Erro ao buscar produtos: ${fetchError.message}`);
    }

    console.log(`Total de produtos a atualizar: ${products?.length || 0}`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products || []) {
      try {
        let paymentMethods = product.payment_methods || [];
        
        // Remover métodos de Moçambique antigos (incluindo epesa)
        paymentMethods = paymentMethods.filter(
          (pm: any) => !pm.isMozambique && pm.id !== 'epesa' && pm.id !== 'emola' && pm.id !== 'mpesa' && pm.id !== 'card_mz'
        );

        // Adicionar novos métodos de Moçambique
        paymentMethods = [...paymentMethods, ...MOZAMBIQUE_METHODS];

        // Atualizar produto
        const { error: updateError } = await supabase
          .from("products")
          .update({ payment_methods: paymentMethods })
          .eq("id", product.id);

        if (updateError) {
          console.error(`Erro ao atualizar produto ${product.id}: ${updateError.message}`);
          errorCount++;
        } else {
          updatedCount++;
        }
      } catch (err) {
        console.error(`Erro no produto ${product.id}:`, err);
        errorCount++;
      }
    }

    console.log(`Atualização concluída: ${updatedCount} produtos atualizados, ${errorCount} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Métodos de pagamento de Moçambique ativados em ${updatedCount} produtos`,
        updatedCount,
        errorCount,
        totalProducts: products?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
