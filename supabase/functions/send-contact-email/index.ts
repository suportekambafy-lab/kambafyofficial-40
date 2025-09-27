
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
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
    const { name, email, phone, subject, message }: ContactEmailRequest = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, email, assunto e mensagem" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Sending contact email from:', name, email);

    // Send email to support team
    const supportEmailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: ["suporte@kambafy.com"],
      reply_to: email,
      subject: `Nova mensagem de contato: ${subject}`,
      html: `
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nova mensagem de contato</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #16a34a;">Nova mensagem de contato recebida</p>
            </div>
            
            <!-- Contact Details -->
            <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 12px; color: #1e293b;"><strong>Nome:</strong> ${name}</p>
                <p style="margin: 0 0 12px; color: #1e293b;"><strong>Email:</strong> ${email}</p>
                ${phone ? `<p style="margin: 0 0 12px; color: #1e293b;"><strong>Telefone:</strong> ${phone}</p>` : ''}
                <p style="margin: 0; color: #1e293b;"><strong>Assunto:</strong> ${subject}</p>
              </div>
            </div>
            
            <!-- Message -->
            <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 15px; font-size: 18px; font-weight: 600; color: #1e293b;">Mensagem:</h3>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <p style="margin: 0; color: #475569; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Para responder, basta clicar em "Responder" - o email será enviado diretamente para ${email}
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    console.log("Support email sent:", supportEmailResponse);

    // Send confirmation email to user
    const confirmationEmailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [email],
      subject: "Confirmação - Mensagem recebida",
      html: `
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Confirmação - Mensagem recebida</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #16a34a;">Obrigado por entrar em contato, ${name}!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 15px; color: #1e293b;">Recebemos sua mensagem sobre: <strong>${subject}</strong></p>
                <p style="margin: 0 0 15px; color: #475569;">Nossa equipe analisará sua solicitação e responderá o mais breve possível.</p>
                <p style="margin: 0; color: #475569;">Normalmente respondemos em até 24 horas durante dias úteis.</p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
              <p style="margin: 0 0 12px; color: #64748b; font-size: 14px;">
                Atenciosamente, Equipe Kambafy
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Se você não enviou esta mensagem, pode ignorar este email.
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    console.log("Confirmation email sent:", confirmationEmailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Mensagem enviada com sucesso",
      supportEmail: supportEmailResponse,
      confirmationEmail: confirmationEmailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Erro ao enviar email de contato"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
