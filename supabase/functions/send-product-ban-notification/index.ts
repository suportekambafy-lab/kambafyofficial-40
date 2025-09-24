import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BanNotificationRequest {
  sellerEmail: string;
  sellerName: string;
  productName: string;
  banReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sellerEmail, sellerName, productName, banReason }: BanNotificationRequest = await req.json();

    console.log('📧 Enviando email de banimento para:', sellerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [sellerEmail],
      subject: `🚫 Produto "${productName}" foi banido - Ação necessária`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background: #f9fafb; }
              .reason-box { background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .action-box { background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { background: #374151; color: white; padding: 20px; text-align: center; font-size: 14px; }
              .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚫 Produto Banido</h1>
              </div>
              
              <div class="content">
                <p>Olá <strong>${sellerName}</strong>,</p>
                
                <p>Informamos que o seu produto <strong>"${productName}"</strong> foi banido da plataforma Kambafy.</p>
                
                <div class="reason-box">
                  <h3>📋 Motivo do banimento:</h3>
                  <p><strong>${banReason}</strong></p>
                </div>
                
                <div class="action-box">
                  <h3>🔧 O que pode fazer agora:</h3>
                  <ul>
                    <li><strong>Revise o conteúdo:</strong> Analise o motivo do banimento e faça as correções necessárias</li>
                    <li><strong>Atualize o produto:</strong> Modifique a descrição, imagens ou conteúdo conforme necessário</li>
                    <li><strong>Solicite revisão:</strong> Após as correções, clique em "Solicitar Revisão" no painel do vendedor</li>
                  </ul>
                </div>
                
                <p>Nossa equipe irá analisar as alterações e responder em até 24-48 horas.</p>
                
                <p style="text-align: center;">
                  <a href="https://kambafy.com/vendedor/produtos" class="button">Acessar Meus Produtos</a>
                </p>
                
                <p><strong>Importante:</strong> Produtos banidos não estão visíveis ao público e não podem receber novos pedidos até serem aprovados novamente.</p>
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

    console.log("✅ Email de banimento enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao enviar email de banimento:", error);
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