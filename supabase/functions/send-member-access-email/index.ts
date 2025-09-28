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
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 16px; margin: 32px 0; text-align: center;">
          <div style="background: rgba(255, 255, 255, 0.95); padding: 28px; border-radius: 12px; backdrop-filter: blur(10px);">
            <div style="background: #10b981; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="font-size: 28px;">🔐</span>
            </div>
            <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Conta Criada com Sucesso!</h3>
            <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.5;">
              Seus dados de acesso foram gerados automaticamente
            </p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="color: #374151; font-weight: 600; font-size: 14px;">EMAIL</span>
                <code style="background: #10b981; color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500;">${studentEmail}</code>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #374151; font-weight: 600; font-size: 14px;">SENHA TEMPORÁRIA</span>
                <code style="background: #3b82f6; color: white; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; letter-spacing: 1px;">${temporaryPassword}</code>
              </div>
            </div>
            <div style="background: #fef3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                <strong>⚠️ Importante:</strong> Altere esta senha no primeiro acesso por questões de segurança
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      loginInstructions = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 16px; margin: 32px 0; text-align: center;">
          <div style="background: rgba(255, 255, 255, 0.95); padding: 28px; border-radius: 12px; backdrop-filter: blur(10px);">
            <div style="background: #3b82f6; width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="font-size: 28px;">🎯</span>
            </div>
            <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Acesso Liberado!</h3>
            <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
              Use sua conta existente com o email <code style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${studentEmail}</code>
            </p>
          </div>
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * { box-sizing: border-box; }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #1f2937;
            line-height: 1.6;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
          
          .header {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            padding: 48px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.1;
          }
          
          .logo {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 16px 0;
            letter-spacing: -1px;
            position: relative;
            z-index: 1;
          }
          
          .header-badge {
            background: rgba(16, 185, 129, 0.2);
            border: 2px solid #10b981;
            color: #10b981;
            padding: 12px 24px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            display: inline-block;
            position: relative;
            z-index: 1;
            backdrop-filter: blur(10px);
          }
          
          .content {
            padding: 48px 32px;
          }
          
          .welcome-section {
            text-align: center;
            margin-bottom: 48px;
          }
          
          .welcome-title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 16px 0;
            line-height: 1.2;
          }
          
          .welcome-subtitle {
            font-size: 18px;
            color: #6b7280;
            margin: 0;
            line-height: 1.5;
          }
          
          .cta-section {
            text-align: center;
            margin: 48px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px 40px;
            text-decoration: none;
            border-radius: 16px;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            text-align: center;
            min-width: 280px;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px -5px rgba(16, 185, 129, 0.5);
          }
          
          .url-info {
            margin-top: 24px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
          }
          
          .url-info p {
            margin: 0 0 8px 0;
            color: #6b7280;
            font-size: 14px;
          }
          
          .url-code {
            background: #374151;
            color: #e5e7eb;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 8px 0 0 0;
          }
          
          .info-grid {
            display: grid;
            gap: 24px;
            margin: 48px 0;
          }
          
          .info-card {
            background: #f8fafc;
            padding: 28px;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            position: relative;
          }
          
          .info-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, #10b981, #059669);
            border-radius: 2px 0 0 2px;
          }
          
          .info-card h3 {
            font-size: 18px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .info-list li {
            padding: 8px 0;
            color: #4b5563;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          
          .info-list li::before {
            content: '✓';
            color: #10b981;
            font-weight: bold;
            flex-shrink: 0;
            margin-top: 2px;
          }
          
          .support-section {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 32px;
            border-radius: 16px;
            color: white;
            text-align: center;
            margin: 48px 0;
          }
          
          .support-section h3 {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 16px 0;
          }
          
          .support-section p {
            margin: 0 0 20px 0;
            opacity: 0.9;
          }
          
          .support-contacts {
            display: flex;
            justify-content: center;
            gap: 32px;
            flex-wrap: wrap;
          }
          
          .support-contact {
            background: rgba(255, 255, 255, 0.1);
            padding: 16px 24px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          
          .support-contact strong {
            display: block;
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 4px;
          }
          
          .footer {
            background: #1f2937;
            padding: 32px;
            text-align: center;
            color: #9ca3af;
          }
          
          .footer-logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
          }
          
          .footer-tagline {
            font-size: 14px;
            margin: 0;
            opacity: 0.7;
          }
          
          @media only screen and (max-width: 600px) {
            .email-container { margin: 16px; border-radius: 16px; }
            .header { padding: 32px 24px; }
            .content { padding: 32px 24px; }
            .welcome-title { font-size: 24px; }
            .welcome-subtitle { font-size: 16px; }
            .cta-button { padding: 16px 32px; font-size: 16px; min-width: auto; width: 100%; }
            .support-contacts { flex-direction: column; gap: 16px; }
            .support-contact { text-align: center; }
          }
        </style>
      </head>
      <body>
        <div style="padding: 32px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
          <div class="email-container">
            
            <!-- Header -->
            <div class="header">
              <h1 class="logo">KAMBAFY</h1>
              <div class="header-badge">🎓 Acesso Liberado!</div>
            </div>

            <div class="content">
              <!-- Welcome Section -->
              <div class="welcome-section">
                <h2 class="welcome-title">Bem-vindo, ${studentName}!</h2>
                <p class="welcome-subtitle">
                  Você foi adicionado à área de membros <strong>"${memberAreaName}"</strong>${sellerName ? ` por ${sellerName}` : ''}.
                </p>
              </div>

              <!-- Login Instructions -->
              ${loginInstructions}

              <!-- CTA Section -->
              <div class="cta-section">
                <h3 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 24px; text-align: center;">
                  Pronto para começar?
                </h3>
                <a href="${memberAreaUrl}" class="cta-button">
                  🚀 Acessar Área de Membros
                </a>
                <div class="url-info">
                  <p>Ou copie e cole este link no seu navegador:</p>
                  <div class="url-code">${memberAreaUrl}</div>
                </div>
              </div>

              <!-- Info Grid -->
              <div class="info-grid">
                <div class="info-card">
                  <h3>📋 O que você encontrará</h3>
                  <ul class="info-list">
                    <li>Acesso imediato a todo conteúdo</li>
                    <li>Materiais exclusivos e atualizados</li>
                    <li>Suporte dedicado da nossa equipe</li>
                    ${isNewAccount ? '<li style="color: #dc2626; font-weight: 600;">Lembre-se de alterar sua senha temporária</li>' : ''}
                    <li>Comunidade de membros ativos</li>
                  </ul>
                </div>
              </div>

              <!-- Support Section -->
              <div class="support-section">
                <h3>💬 Precisa de Ajuda?</h3>
                <p>Nossa equipe está aqui para ajudar você em qualquer momento</p>
                <div class="support-contacts">
                  <div class="support-contact">
                    <strong>EMAIL</strong>
                    suporte@kambafy.com
                  </div>
                  <div class="support-contact">
                    <strong>WHATSAPP</strong>
                    (+244) 900 000 000
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <h3 class="footer-logo">KAMBAFY</h3>
              <p class="footer-tagline">Conectando você ao conhecimento</p>
            </div>

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