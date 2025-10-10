import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnderReviewNotificationRequest {
  sellerEmail: string;
  sellerName: string;
  productName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sellerEmail, sellerName, productName }: UnderReviewNotificationRequest = await req.json();

    console.log('📧 Enviando email de produto em revisão para:', sellerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [sellerEmail],
      subject: `Seu produto está em revisão - "${productName}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
              .footer { text-align: center; padding: 20px 0; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔍 Produto em Revisão</h1>
              </div>
              
              <div class="content">
                <p>Olá <strong>${sellerName}</strong>,</p>
                
                <p>Seu produto <strong>"${productName}"</strong> foi submetido com sucesso e agora está em revisão.</p>
                
                <p>Nossa equipe está analisando o conteúdo para garantir que está de acordo com as diretrizes da plataforma.</p>
                
                <p>Você receberá uma notificação por email assim que a revisão for concluída.</p>
                
                <p><strong>Importante:</strong> Durante o período de revisão, seu produto não estará disponível para venda.</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Kambafy - Plataforma de Vendas Digitais</p>
                <p>Em caso de dúvidas, entre em contato conosco em suporte@kambafy.com</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email de produto em revisão enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao enviar email de produto em revisão:", error);
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
