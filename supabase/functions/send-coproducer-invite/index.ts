import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_APP_ORIGIN = "https://kambafy.com";

interface CoproducerInviteRequest {
  coproducer_id: string;
  coproducer_email: string;
  coproducer_name?: string;
  owner_name: string;
  product_name: string;
  commission_rate: number;
  duration_days: number;
  commission_from_producer_sales: boolean;
  commission_from_affiliate_sales: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-coproducer-invite] Function started");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      coproducer_id,
      coproducer_email,
      coproducer_name,
      owner_name,
      product_name,
      commission_rate,
      duration_days,
      commission_from_producer_sales = true,
      commission_from_affiliate_sales = true
    }: CoproducerInviteRequest = await req.json();

    console.log("[send-coproducer-invite] Processing invite for:", coproducer_email);

    // Gerar link de aceitação
    const acceptLink = `${DEFAULT_APP_ORIGIN}/coproducao/aceitar/${coproducer_id}`;
    const rejectLink = `${DEFAULT_APP_ORIGIN}/coproducao/rejeitar/${coproducer_id}`;

    const displayName = coproducer_name || coproducer_email.split('@')[0];

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite de Co-Produção</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🤝 Convite de Co-Produção</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Olá <strong>${displayName}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Você foi convidado(a) por <strong>${owner_name}</strong> para ser co-produtor(a) do produto:
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6366f1;">
                <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">${product_name}</h2>
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                  📊 Comissão: <strong style="color: #059669;">${commission_rate}%</strong> sobre cada venda<br>
                  📅 Duração do contrato: <strong>${duration_days} dias</strong>
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  💰 <strong>Origem das comissões:</strong><br>
                  ${commission_from_producer_sales ? '✅' : '❌'} Vendas do produtor<br>
                  ${commission_from_affiliate_sales ? '✅' : '❌'} Vendas dos afiliados
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
                Ao aceitar este convite, você receberá automaticamente ${commission_rate}% do valor líquido de cada venda realizada deste produto durante o período do contrato.
              </p>
              
              <!-- Buttons -->
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="${acceptLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 10px;">
                  ✓ Aceitar Convite
                </a>
                <a href="${rejectLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ✗ Recusar
                </a>
              </div>
              
              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
                Se você não reconhece este convite ou não deseja ser co-produtor, pode simplesmente ignorar este e-mail.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Kambafy - Plataforma de Vendas de Produtos Digitais
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [coproducer_email],
      subject: `🤝 ${owner_name} convidou você para ser co-produtor(a)`,
      html: emailHtml,
    });

    console.log("[send-coproducer-invite] Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-coproducer-invite] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
