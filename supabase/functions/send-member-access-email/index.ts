import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MemberAccessEmailRequest {
  studentName: string;
  studentEmail: string;
  memberAreaName: string;
  memberAreaUrl: string;
  sellerName?: string;
  isNewAccount: boolean;
  temporaryPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      studentEmail,
      memberAreaName,
      memberAreaUrl,
      sellerName,
      isNewAccount,
      temporaryPassword
    }: MemberAccessEmailRequest = await req.json();

    console.log('=== MEMBER ACCESS EMAIL START ===');
    console.log('Request data:', {
      studentName,
      studentEmail,
      memberAreaName,
      memberAreaUrl,
      sellerName,
      isNewAccount,
      temporaryPassword: temporaryPassword ? '***' : 'none'
    });

    // Validate required fields
    if (!studentEmail || !studentName || !memberAreaName || !memberAreaUrl) {
      throw new Error('Missing required fields: studentEmail, studentName, memberAreaName, or memberAreaUrl');
    }

    // Create login instructions based on whether it's a new account
    let loginInstructions = '';
    if (isNewAccount && temporaryPassword) {
      loginInstructions = `
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #0c4a6e; margin: 0 0 15px 0;">🔐 Dados de Acesso - NOVA CONTA CRIADA</h3>
          <p style="margin: 0 0 15px; color: #0c4a6e;">
            Uma conta foi criada automaticamente para você. Use os dados abaixo para fazer login:
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e; width: 25%;">Email:</td>
              <td style="padding: 8px 0; color: #0c4a6e; font-family: 'Courier New', monospace; background-color: #e0f2fe; padding: 5px 10px; border-radius: 4px;">${studentEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #0c4a6e;">Senha Temporária:</td>
              <td style="padding: 8px 0; color: #0c4a6e; font-family: 'Courier New', monospace; background-color: #e0f2fe; padding: 5px 10px; border-radius: 4px;">${temporaryPassword}</td>
            </tr>
          </table>
          <p style="margin: 15px 0 0; color: #dc2626; font-size: 14px; font-weight: 500;">
            ⚠️ IMPORTANTE: Altere esta senha após o primeiro login por motivos de segurança.
          </p>
        </div>
      `;
    } else {
      loginInstructions = `
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #0c4a6e; margin: 0 0 15px 0;">🔐 Como Acessar</h3>
          <p style="margin: 0; color: #0c4a6e;">
            Use sua conta existente com o email <strong>${studentEmail}</strong> para fazer login.
          </p>
        </div>
      `;
    }

    // Create member access email HTML
    const memberAccessEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Acesso Liberado - ${memberAreaName} - Kambafy</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 15px !important; }
            .header-title { font-size: 20px !important; }
            .section { padding: 20px !important; }
            .access-button { padding: 15px 25px !important; font-size: 16px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
            <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">🎓 Acesso Liberado!</h2>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Você foi adicionado à área de membros</p>
            </div>
          </div>

          <!-- Welcome Message -->
          <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <h2 style="margin: 0 0 15px; font-size: 22px; font-weight: 600; color: #1e293b;">Bem-vindo, ${studentName}!</h2>
            <p style="margin: 0; font-size: 16px; color: #64748b; line-height: 1.6;">
              Você foi adicionado à área de membros <strong>"${memberAreaName}"</strong>
              ${sellerName ? ` por ${sellerName}` : ''}.
            </p>
          </div>

          <!-- Login Instructions -->
          ${loginInstructions}

          <!-- Access Button -->
          <div style="text-align: center; padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Acesso à Área de Membros</h3>
            <a href="${memberAreaUrl}" 
               class="access-button"
               style="display: inline-block; background-color: #16a34a; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              🚀 Acessar Área de Membros
            </a>
            <p style="margin: 15px 0 0; color: #64748b; font-size: 14px;">
              Clique no botão acima ou copie o link: <br>
              <code style="background-color: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${memberAreaUrl}</code>
            </p>
          </div>

          <!-- Important Notes -->
          <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">📋 Informações Importantes</h3>
            <div style="color: #475569; line-height: 1.6; font-size: 14px;">
              <p style="margin: 0 0 10px;">• Seu acesso foi liberado imediatamente</p>
              <p style="margin: 0 0 10px;">• Mantenha seus dados de login em segurança</p>
              ${isNewAccount ? '<p style="margin: 0 0 10px; color: #dc2626; font-weight: 500;">• Altere sua senha temporária após o primeiro login</p>' : ''}
              <p style="margin: 0 0 10px;">• Em caso de dúvidas, entre em contato com o suporte</p>
              <p style="margin: 0;">• Aproveite todo o conteúdo disponível na área</p>
            </div>
          </div>

          <!-- Support -->
          <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">💬 Precisa de Ajuda?</h3>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
              Se tiver alguma dúvida sobre o acesso, entre em contato conosco:
            </p>
            <div style="color: #475569; font-size: 14px;">
              <p style="margin: 0;"><strong>Email:</strong> suporte@kambafy.com</p>
              <p style="margin: 5px 0 0;"><strong>WhatsApp:</strong> (+244) 900 000 000</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              Conectando você ao conhecimento
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    console.log('Sending member access email...');
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [studentEmail.trim()],
      subject: `🎓 Acesso Liberado - ${memberAreaName}`,
      html: memberAccessEmailHtml,
    });

    if (emailError) {
      console.error('Error sending member access email:', emailError);
      throw emailError;
    }

    console.log("Member access email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Member access email sent successfully',
      emailSent: true,
      emailId: emailResponse?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-member-access-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        emailSent: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);