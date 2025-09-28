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
        <div style="padding: 20px; border: 1px solid #ddd; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Conta Criada com Sucesso</h3>
          <p style="margin: 0 0 15px; color: #666; font-size: 14px;">
            Seus dados de acesso foram gerados automaticamente:
          </p>
          <p style="margin: 10px 0; color: #333;">
            <strong>Email:</strong> ${studentEmail}<br>
            <strong>Senha temporária:</strong> ${temporaryPassword}
          </p>
          <p style="margin: 15px 0 0; color: #666; font-size: 13px;">
            <strong>Importante:</strong> Altere esta senha no primeiro acesso.
          </p>
        </div>
      `;
    } else {
      loginInstructions = `
        <div style="padding: 20px; border: 1px solid #ddd; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Acesso Liberado</h3>
          <p style="margin: 0; color: #666; font-size: 14px;">
            Use sua conta existente com o email: <strong>${studentEmail}</strong>
          </p>
        </div>
      `;
    }

    // Create member access email HTML
    const memberAccessEmailHtml = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Acesso Liberado - ${memberAreaName}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
          }
          
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border: 1px solid #ddd;
          }
          
          .header {
            background: #fff;
            padding: 30px 30px 20px;
            border-bottom: 1px solid #eee;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 0 0 10px 0;
          }
          
          .header p {
            font-size: 14px;
            color: #666;
            margin: 0;
          }
          
          .content {
            padding: 30px;
          }
          
          .content h2 {
            font-size: 20px;
            color: #333;
            margin: 0 0 15px 0;
          }
          
          .content p {
            margin: 0 0 15px 0;
            color: #666;
            font-size: 14px;
          }
          
          .cta-button {
            display: inline-block;
            background: #007cba;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
          }
          
          .url-box {
            background: #f9f9f9;
            padding: 15px;
            border: 1px solid #ddd;
            margin: 20px 0;
            word-break: break-all;
            font-size: 13px;
            color: #666;
          }
          
          .footer {
            background: #f9f9f9;
            padding: 20px 30px;
            border-top: 1px solid #eee;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 10px; }
            .header, .content, .footer { padding: 20px; }
            .cta-button { width: 100%; text-align: center; box-sizing: border-box; }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          
          <!-- Header -->
          <div class="header">
            <h1>KAMBAFY</h1>
            <p>Plataforma de Conteúdo Digital</p>
          </div>

          <div class="content">
            <!-- Welcome Section -->
            <h2>Bem-vindo, ${studentName}!</h2>
            <p>
              Você foi adicionado à área de membros "<strong>${memberAreaName}</strong>"${sellerName ? ` por ${sellerName}` : ''}.
            </p>

            <!-- Login Instructions -->
            ${loginInstructions}

            <!-- CTA Section -->
            <p>Para acessar o conteúdo, clique no botão abaixo:</p>
            <a href="${memberAreaUrl}" class="cta-button">Acessar Área de Membros</a>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <div class="url-box">${memberAreaUrl}</div>

            <!-- Info Section -->
            <h3 style="color: #333; font-size: 16px; margin: 30px 0 10px 0;">O que você encontrará:</h3>
            <ul style="color: #666; font-size: 14px; padding-left: 20px;">
              <li>Acesso imediato a todo conteúdo</li>
              <li>Materiais exclusivos e atualizados</li>
              <li>Suporte da nossa equipe</li>
              ${isNewAccount ? '<li style="color: #d63031; font-weight: bold;">Lembre-se de alterar sua senha temporária</li>' : ''}
            </ul>

            <!-- Support Section -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              <h3 style="color: #333; font-size: 16px; margin: 0 0 10px 0;">Precisa de Ajuda?</h3>
              <p style="margin: 0 0 5px 0;"><strong>Email:</strong> suporte@kambafy.com</p>
              <p style="margin: 0;"><strong>WhatsApp:</strong> (+244) 900 000 000</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>KAMBAFY - Conectando você ao conhecimento</p>
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