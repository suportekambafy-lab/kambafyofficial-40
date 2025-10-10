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
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              h2 { margin-top: 0; }
              p { margin: 10px 0; }
              .reason { background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 3px solid #333; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Conta Suspensa</h2>
              
              <p>Olá ${userName},</p>
              
              <p>Informamos que sua conta na plataforma Kambafy foi suspensa.</p>
              
              <div class="reason">
                <p><strong>Motivo:</strong></p>
                <p>${banReason}</p>
              </div>
              
              <p><strong>Como contestar:</strong></p>
              <p>Se você acredita que esta decisão foi um erro, envie um email para <strong>suporte@kambafy.com</strong> com:</p>
              <ul>
                <li>Seu nome completo e email</li>
                <li>Explicação detalhada da situação</li>
                <li>Documentos ou evidências que comprovem sua versão</li>
              </ul>
              
              <p>Nossa equipe analisará seu caso em até 48-72 horas úteis.</p>
              
              <p><strong>Importante:</strong> Enquanto sua conta estiver suspensa, você não poderá acessar a plataforma.</p>
              
              <div class="footer">
                <p>Kambafy - Plataforma de Vendas Digitais</p>
                <p>Para contestar: suporte@kambafy.com</p>
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