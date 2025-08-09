import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se o RESEND_API_KEY está configurado
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY não configurado");
      return new Response(
        JSON.stringify({ 
          error: "RESEND_API_KEY não configurado",
          message: "Configure a chave da API do Resend nas configurações do projeto"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔄 Iniciando processamento da fila de recuperação...");

    // Buscar carrinhos abandonados que precisam de recuperação
    const { data: abandonedPurchases, error: fetchError } = await supabase
      .from('abandoned_purchases')
      .select(`
        *,
        products!inner (
          id,
          name,
          slug,
          user_id
        )
      `)
      .eq('status', 'abandoned');

    if (fetchError) {
      console.error("❌ Erro ao buscar carrinhos abandonados:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao buscar carrinhos abandonados",
          details: fetchError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`📊 Encontrados ${abandonedPurchases?.length || 0} carrinhos abandonados total`);

    if (!abandonedPurchases || abandonedPurchases.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhum carrinho abandonado encontrado para recuperação",
          processed: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Buscar configurações de recuperação para cada produto
    const productIds = [...new Set(abandonedPurchases.map(p => p.product_id))];
    
    const { data: recoverySettings, error: settingsError } = await supabase
      .from('sales_recovery_settings')
      .select('*')
      .in('product_id', productIds)
      .eq('enabled', true);

    if (settingsError) {
      console.error("❌ Erro ao buscar configurações:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao buscar configurações de recuperação",
          details: settingsError.message
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`⚙️ Configurações de recuperação encontradas: ${recoverySettings?.length || 0}`);

    if (!recoverySettings || recoverySettings.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhuma configuração de recuperação ativa encontrada",
          processed: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Criar mapa de configurações por produto
    const settingsMap = new Map();
    recoverySettings.forEach(setting => {
      settingsMap.set(setting.product_id, setting);
    });

    // Filtrar carrinhos que têm configuração ativa
    const purchasesWithSettings = abandonedPurchases.filter(purchase => 
      settingsMap.has(purchase.product_id)
    );

    console.log(`🎯 Carrinhos com configuração ativa: ${purchasesWithSettings.length}`);

    let emailsSent = 0;
    const errors: string[] = [];

    // Processar cada carrinho abandonado
    for (const purchase of purchasesWithSettings) {
      try {
        const settings = settingsMap.get(purchase.product_id);
        
        if (!settings) {
          console.log(`⏭️ Carrinho ${purchase.id} não tem configuração ativa`);
          continue;
        }
        // Verificar se já passou o tempo de delay
        const abandonedAt = new Date(purchase.abandoned_at);
        const delayMs = settings.email_delay_hours * 60 * 60 * 1000;
        const shouldSendAt = new Date(abandonedAt.getTime() + delayMs);
        const now = new Date();

        console.log(`⏰ Carrinho ${purchase.id}:`);
        console.log(`  - Abandonado em: ${abandonedAt.toISOString()}`);
        console.log(`  - Delay configurado: ${settings.email_delay_hours} horas`);
        console.log(`  - Deve enviar em: ${shouldSendAt.toISOString()}`);
        console.log(`  - Hora atual: ${now.toISOString()}`);
        console.log(`  - Diferença: ${(now.getTime() - shouldSendAt.getTime()) / 1000} segundos`);

        // Para teste: usar apenas 1 minuto de delay
        const testDelayMs = 1 * 60 * 1000; // 1 minuto
        const testShouldSendAt = new Date(abandonedAt.getTime() + testDelayMs);
        
        console.log(`🧪 TESTE - Usando delay de 1 minuto`);
        console.log(`🧪 TESTE - Deve enviar em: ${testShouldSendAt.toISOString()}`);
        console.log(`🧪 TESTE - Diferença: ${(now.getTime() - testShouldSendAt.getTime()) / 1000} segundos`);

        if (now < testShouldSendAt) {
          console.log(`⏳ Carrinho ${purchase.id} ainda não atingiu o tempo de delay de 1 minuto`);
          continue;
        }

        // Verificar tentativas máximas
        if (purchase.recovery_attempts_count >= settings.max_recovery_attempts) {
          console.log(`🚫 Carrinho ${purchase.id} já atingiu o máximo de tentativas`);
          // Marcar como expirado
          await supabase
            .from('abandoned_purchases')
            .update({ status: 'expired' })
            .eq('id', purchase.id);
          continue;
        }

        // Verificar se já foi enviado recentemente
        if (purchase.last_recovery_attempt_at) {
          const lastAttempt = new Date(purchase.last_recovery_attempt_at);
          const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
          const minTimeBetweenAttempts = 4 * 60 * 60 * 1000; // 4 horas
          
          if (timeSinceLastAttempt < minTimeBetweenAttempts) {
            console.log(`⏳ Carrinho ${purchase.id} foi tentado recentemente`);
            continue;
          }
        }

        // Preparar dados do email
        const checkoutUrl = `https://pay.kambafy.com/checkout/${purchase.products.slug}?email=${encodeURIComponent(purchase.customer_email)}`;
        
        console.log(`🔗 URL de checkout gerada: ${checkoutUrl}`);
        // Substituir variáveis no template
        let emailContent = settings.email_template;
        emailContent = emailContent.replace(/{customer_name}/g, purchase.customer_name);
        emailContent = emailContent.replace(/{product_name}/g, purchase.products.name);
        emailContent = emailContent.replace(/{amount}/g, purchase.amount.toString());
        emailContent = emailContent.replace(/{currency}/g, purchase.currency);
        emailContent = emailContent.replace(/{checkout_url}/g, checkoutUrl);
        
        // Converter quebras de linha para HTML
        emailContent = emailContent.replace(/\n/g, '<br>');

        console.log(`📧 Enviando email de recuperação para ${purchase.customer_email}`);

        // Enviar email
        const emailResponse = await resend.emails.send({
          from: "Kambafy <onboarding@resend.dev>",
          to: [purchase.customer_email],
          subject: settings.email_subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://app.kambafy.com/kambafy-logo.png" alt="Kambafy" style="max-width: 150px;">
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                ${emailContent}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${checkoutUrl}" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Finalizar Compra
                </a>
              </div>
              
              <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
                <p>Este email foi enviado automaticamente. Se você não deseja mais receber estes emails, pode ignorá-los.</p>
                <p>© 2024 Kambafy. Todos os direitos reservados.</p>
              </div>
            </div>
          `,
        });

        if (emailResponse.error) {
          console.error(`❌ Erro ao enviar email para ${purchase.customer_email}:`, emailResponse.error);
          errors.push(`Erro ao enviar para ${purchase.customer_email}: ${emailResponse.error}`);
          continue;
        }

        console.log(`✅ Email enviado com sucesso para ${purchase.customer_email}`);

        // Atualizar carrinho abandonado
        const { error: updateError } = await supabase
          .from('abandoned_purchases')
          .update({
            recovery_attempts_count: purchase.recovery_attempts_count + 1,
            last_recovery_attempt_at: new Date().toISOString()
          })
          .eq('id', purchase.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar carrinho ${purchase.id}:`, updateError);
          errors.push(`Erro ao atualizar carrinho ${purchase.id}: ${updateError.message}`);
        } else {
          emailsSent++;
        }

      } catch (error) {
        console.error(`❌ Erro ao processar carrinho ${purchase.id}:`, error);
        errors.push(`Erro ao processar carrinho ${purchase.id}: ${error.message}`);
      }
    }

    console.log(`📊 Processamento concluído. Emails enviados: ${emailsSent}`);

    return new Response(
      JSON.stringify({ 
        message: `Processamento concluído. ${emailsSent} emails enviados.`,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("❌ Erro geral no processamento:", error);
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