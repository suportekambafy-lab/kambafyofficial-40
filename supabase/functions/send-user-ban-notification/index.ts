import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BanNotificationRequest {
  userEmail: string;
  userName: string;
  banReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, banReason }: BanNotificationRequest = await req.json();

    console.log('📧 Enviando email de banimento para:', userEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [userEmail],
      subject: "🚫 Conta Kambafy Suspensa - Ação necessária",
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
                <h1>🚫 Conta Suspensa</h1>
              </div>
              
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Informamos que sua conta na plataforma Kambafy foi suspensa temporariamente.</p>
                
                <div class="reason-box">
                  <h3>📋 Motivo da suspensão:</h3>
                  <p><strong>${banReason}</strong></p>
                </div>
                
                <div class="action-box">
                  <h3>🔄 Como contestar esta decisão:</h3>
                  <p>Se você acredita que esta suspensão foi um erro ou possui informações que podem alterar nossa decisão, envie um email para:</p>
                  <p><strong>suporte@kambafy.com</strong></p>
                  <p>Inclua em seu email:</p>
                  <ul>
                    <li>Seu nome completo e email</li>
                    <li>Explicação detalhada da situação</li>
                    <li>Documentos ou evidências que comprovem sua versão</li>
                  </ul>
                </div>
                
                <p>Nossa equipe analisará seu caso em até 48-72 horas úteis.</p>
                
                <p><strong>Importante:</strong> Enquanto sua conta estiver suspensa, você não poderá acessar a plataforma ou realizar vendas.</p>
              </div>
              
              <div class="footer">
                <p>© 2024 Kambafy - Plataforma de Vendas Digitais</p>
                <p>Este email foi enviado automaticamente. Para contestar, envie email para suporte@kambafy.com</p>
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