import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  sellerEmail: string;
  sellerName: string;
  productName: string;
  productUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sellerEmail, sellerName, productName, productUrl }: ApprovalNotificationRequest = await req.json();

    console.log('📧 Enviando email de aprovação para:', sellerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [sellerEmail],
      subject: `✅ Produto "${productName}" foi aprovado!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
              .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background: #f9fafb; }
              .success-box { background: #dcfce7; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .benefits-box { background: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { background: #374151; color: white; padding: 20px; text-align: center; font-size: 14px; }
              .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
              .button-secondary { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Produto Aprovado!</h1>
              </div>
              
              <div class="content">
                <p>Parabéns <strong>${sellerName}</strong>!</p>
                
                <div class="success-box">
                  <h3>✅ Ótimas notícias!</h3>
                  <p>O seu produto <strong>"${productName}"</strong> foi aprovado e já está disponível na plataforma Kambafy!</p>
                </div>
                
                <div class="benefits-box">
                  <h3>🚀 O que isso significa:</h3>
                  <ul>
                    <li><strong>Visibilidade total:</strong> Seu produto agora está visível para todos os clientes</li>
                    <li><strong>Vendas ativas:</strong> Clientes podem comprar seu produto imediatamente</li>
                    <li><strong>Programa de afiliados:</strong> Se habilitado, afiliados podem promover seu produto</li>
                    <li><strong>Relatórios completos:</strong> Acompanhe suas vendas no painel do vendedor</li>
                  </ul>
                </div>
                
                <p><strong>Próximos passos recomendados:</strong></p>
                <ul>
                  <li>Compartilhe o link do seu produto nas redes sociais</li>
                  <li>Configure promoções e descontos se desejar</li>
                  <li>Monitore as vendas no seu painel</li>
                  <li>Responda às dúvidas dos clientes rapidamente</li>
                </ul>
                
                <p style="text-align: center;">
                  <a href="https://kambafy.com/vendedor/produtos" class="button">Ver Meus Produtos</a>
                  ${productUrl ? `<a href="${productUrl}" class="button-secondary">Ver Produto Publicado</a>` : ''}
                </p>
                
                <p><em>Desejamos muito sucesso nas suas vendas! 🎯</em></p>
              </div>
              
              <div class="footer">
                <p>© 2024 Kambafy - Plataforma de Vendas Digitais</p>
                <p>Alguma dúvida? Entre em contato em suporte@kambafy.com</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email de aprovação enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao enviar email de aprovação:", error);
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