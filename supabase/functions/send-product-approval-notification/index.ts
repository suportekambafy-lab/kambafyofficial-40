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
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                background-color: #ffffff;
              }
              .header {
                padding: 40px 20px;
                text-align: center;
                border-bottom: 1px solid #e5e5e5;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
                color: #333;
              }
              .content {
                padding: 40px 30px;
              }
              .greeting {
                font-size: 18px;
                margin-bottom: 30px;
                font-weight: 600;
              }
              .section {
                border: 1px solid #e5e5e5;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
              }
              .section h2 {
                margin: 0 0 15px 0;
                font-size: 18px;
                font-weight: bold;
                color: #333;
              }
              .section p {
                margin: 0;
                font-size: 16px;
              }
              .section ul {
                margin: 0;
                padding-left: 20px;
              }
              .section li {
                margin-bottom: 12px;
                font-size: 15px;
              }
              .section li strong {
                font-weight: 600;
              }
              .next-steps {
                margin: 30px 0;
              }
              .next-steps h3 {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
              }
              .next-steps ul {
                padding-left: 20px;
                margin: 0;
              }
              .next-steps li {
                margin-bottom: 10px;
                font-size: 15px;
              }
              .button-container {
                text-align: center;
                margin: 40px 0;
              }
              .button {
                display: inline-block;
                background-color: #333;
                color: white;
                text-decoration: none;
                padding: 16px 40px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
              }
              .closing {
                font-style: italic;
                margin: 30px 0;
                font-size: 16px;
              }
              .footer { 
                background-color: #f5f5f5;
                color: #666;
                padding: 30px;
                text-align: center;
                font-size: 14px;
                border-top: 1px solid #e5e5e5;
              }
              .footer p {
                margin: 8px 0;
              }
              .footer a {
                color: #333;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Produto Aprovado!</h1>
              </div>
              
              <div class="content">
                <p class="greeting">Parabéns <strong>${sellerName}</strong>!</p>
                
                <div class="section">
                  <h2>✅ Ótimas notícias!</h2>
                  <p>O seu produto "<strong>${productName}</strong>" foi aprovado e já está disponível na plataforma Kambafy!</p>
                </div>
                
                <div class="section">
                  <h2>🚀 O que isso significa:</h2>
                  <ul>
                    <li><strong>Visibilidade total:</strong> Seu produto agora está visível para todos os clientes</li>
                    <li><strong>Vendas ativas:</strong> Clientes podem comprar seu produto imediatamente</li>
                    <li><strong>Programa de afiliados:</strong> Se habilitado, afiliados podem promover seu produto</li>
                    <li><strong>Relatórios completos:</strong> Acompanhe suas vendas no painel do vendedor</li>
                  </ul>
                </div>
                
                <div class="next-steps">
                  <h3>Próximos passos recomendados:</h3>
                  <ul>
                    <li>Compartilhe o link do seu produto nas redes sociais</li>
                    <li>Configure promoções e descontos se desejar</li>
                    <li>Monitore as vendas no seu painel</li>
                    <li>Responda às dúvidas dos clientes rapidamente</li>
                  </ul>
                </div>
                
                <div class="button-container">
                  <a href="https://kambafy.com/vendedor/produtos" class="button">Ver Meus Produtos</a>
                </div>
                
                <p class="closing">Desejamos muito sucesso nas suas vendas! 🎯</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Kambafy - Plataforma de Vendas Digitais</p>
                <p>Alguma dúvida? Entre em contato em <a href="mailto:suporte@kambafy.com">suporte@kambafy.com</a></p>
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