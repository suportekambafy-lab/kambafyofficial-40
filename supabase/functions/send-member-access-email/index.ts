import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberAccessEmailRequest {
  studentName: string;
  studentEmail: string;
  memberAreaName: string;
  memberAreaUrl: string;
  sellerName?: string;
  isNewAccount?: boolean;
  isPasswordReset?: boolean;
  temporaryPassword?: string;
  supportEmail?: string;
  supportWhatsapp?: string;
}

// Function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Function to create Kambafy account
async function createKambafyAccount(email: string, name: string, tempPassword: string) {
  try {
    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();
    
    // First check if user already exists by listing users with email filter
    const { data: listResponse, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = listResponse.users.find(user => user.email?.toLowerCase() === normalizedEmail);
    
    if (existingUser) {
      console.log('User already exists in Kambafy, skipping account creation');
      return { exists: true, user: existingUser };
    }

    // Create new user with temporary password
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name
      }
    });

    if (createError) {
      console.error('Error creating Kambafy account:', createError);
      throw createError;
    }

    console.log('Kambafy account created successfully for:', normalizedEmail);
    return { exists: false, user: newUser.user };
    
  } catch (error) {
    console.error('Failed to create Kambafy account:', error);
    throw error;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const {
      studentName,
      studentEmail,
      memberAreaName,
      memberAreaUrl,
      sellerName,
      isNewAccount = false,
      isPasswordReset = false,
      temporaryPassword,
      supportEmail,
      supportWhatsapp
    }: MemberAccessEmailRequest = await req.json();
    
    // Normalizar email para lowercase
    const normalizedEmail = studentEmail.toLowerCase().trim();

    console.log('=== MEMBER ACCESS EMAIL START ===');
    console.log('Request data:', {
      studentName,
      studentEmail: normalizedEmail,
      memberAreaName,
      memberAreaUrl,
      sellerName,
      isNewAccount,
      temporaryPassword: temporaryPassword ? '***' : 'none',
      supportEmail,
      supportWhatsapp
    });

    // Validate required fields
    if (!normalizedEmail || !studentName || !memberAreaName || !memberAreaUrl) {
      throw new Error('Missing required fields: studentEmail, studentName, memberAreaName, or memberAreaUrl');
    }

    // Create login instructions based on whether it's a new account or password reset
    let loginInstructions = '';
    let emailSubject = '';
    
    if (isPasswordReset && temporaryPassword) {
      emailSubject = `🔐 Nova Senha - ${memberAreaName}`;
      loginInstructions = `
        <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Nova Senha Gerada</h3>
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 15px; color: #92400e; font-size: 14px;">
              Uma nova senha temporária foi gerada para sua conta:
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 500; color: #475569; width: 30%;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace;">${normalizedEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 500; color: #475569;">Nova senha:</td>
                <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 700; background-color: #fff; padding: 10px; border-radius: 4px;">${temporaryPassword}</td>
              </tr>
            </table>
            <div style="background-color: #dc2626; color: white; border-radius: 6px; padding: 15px; margin: 15px 0 0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6;">
                <strong>⚠️ Importante:</strong> Por segurança, altere esta senha após fazer login.
              </p>
            </div>
          </div>
        </div>
      `;
    } else if (isNewAccount && temporaryPassword) {
      emailSubject = `🎓 Acesso Liberado - ${memberAreaName}`;
      loginInstructions = `
        <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Conta Criada com Sucesso</h3>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 15px; color: #475569; font-size: 14px;">
              Seus dados de acesso foram gerados automaticamente:
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 500; color: #475569; width: 30%;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace;">${normalizedEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 500; color: #475569;">Senha temporária:</td>
                <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 700;">${temporaryPassword}</td>
              </tr>
            </table>
            <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 15px 0 0;">
              <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                <strong>Importante:</strong> Altere esta senha no primeiro acesso por segurança.
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      emailSubject = `🎓 Acesso Liberado - ${memberAreaName}`;
      loginInstructions = `
        <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Acesso Liberado</h3>
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px;">
            <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
              Use sua conta existente com o email: <strong>${normalizedEmail}</strong>
            </p>
          </div>
        </div>
      `;
    }

    // Create member access email HTML
    const memberAccessEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Acesso Liberado - ${memberAreaName}</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 15px !important; }
            .header-title { font-size: 20px !important; }
            .section { padding: 20px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
            <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #16a34a;">🎓 Acesso Liberado!</p>
            <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">Bem-vindo à ${memberAreaName}</p>
          </div>

          <!-- Greeting -->
          <div style="padding: 30px 30px 0;">
            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px;">
              Olá <strong>${studentName}</strong>,
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 25px;">
              Parabéns! Seu acesso à <strong>${memberAreaName}</strong> foi liberado com sucesso. ${sellerName ? `Você foi adicionado por <strong>${sellerName}</strong>.` : ''} Clique no botão abaixo para fazer login:
            </p>
          </div>

          ${loginInstructions}

          <!-- Access Button -->
          <div class="section" style="padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <a href="${memberAreaUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
              🚀 Acessar Área de Membros
            </a>
            <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">
              Ou copie e cole este link: <br>
              <code style="background: #f1f5f9; padding: 5px 10px; border-radius: 4px; font-size: 12px; color: #475569; word-break: break-all;">${memberAreaUrl}</code>
            </p>
          </div>

          <!-- What You'll Find -->
          <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">${isPasswordReset ? 'Próximos Passos:' : 'O que você encontrará:'}</h3>
            <div style="color: #475569; line-height: 1.6;">
              ${isPasswordReset ? `
                <p style="margin: 0 0 12px;">• Faça login com sua nova senha</p>
                <p style="margin: 0 0 12px;">• Altere a senha temporária por segurança</p>
                <p style="margin: 0 0 12px;">• Continue acessando todo o conteúdo</p>
              ` : `
                <p style="margin: 0 0 12px;">• Acesso imediato a todo conteúdo</p>
                <p style="margin: 0 0 12px;">• Materiais exclusivos e atualizados</p>
                <p style="margin: 0 0 12px;">• Suporte da nossa equipe</p>
                ${isNewAccount ? '<p style="margin: 0; color: #dc2626; font-weight: 500;">• Lembre-se de alterar sua senha temporária</p>' : ''}
              `}
            </div>
          </div>

          <!-- Support -->
          <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">Precisa de Ajuda?</h3>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
              Se tiver alguma dúvida, entre em contato conosco:
            </p>
            <div style="color: #475569; font-size: 14px;">
              ${supportEmail ? `<p style="margin: 0;"><strong>Email:</strong> ${supportEmail}</p>` : '<p style="margin: 0;"><strong>Email:</strong> suporte@kambafy.com</p>'}
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
      to: [normalizedEmail],
      subject: emailSubject || `🎓 Acesso Liberado - ${memberAreaName}`,
      html: memberAccessEmailHtml,
    });

    if (emailError) {
      console.error('Error sending member access email:', emailError);
      throw emailError;
    }

    console.log("Member access email sent successfully:", emailResponse);

    // Now create Kambafy account and send panel access email
    const newTemporaryPassword = generateTemporaryPassword();
    
    try {
      const accountResult = await createKambafyAccount(normalizedEmail, studentName, newTemporaryPassword);
      
      // Send Kambafy panel access email
      const panelEmailHtml = `
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Acesso ao Painel Kambafy</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #3b82f6;">🚀 Acesso ao Painel</p>
            </div>

            <!-- Greeting -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px;">
                Olá <strong>${studentName}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 25px;">
                ${accountResult.exists ? 'Você já possui acesso ao painel Kambafy!' : 'Sua conta no painel Kambafy foi criada automaticamente!'} Agora você pode gerenciar suas compras, acessar produtos e muito mais.
              </p>
            </div>

            <!-- Login Credentials -->
            <div style="padding: 0 30px 30px;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Dados de Acesso ao Painel</h3>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500; color: #475569; width: 30%;">Email:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace;">${normalizedEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 500; color: #475569;">Senha:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 700; background-color: #fff; padding: 10px; border-radius: 4px;">${newTemporaryPassword}</td>
                  </tr>
                </table>
                ${!accountResult.exists ? `
                <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 15px 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                    <strong>Importante:</strong> Esta é uma senha temporária. Altere-a no primeiro acesso por segurança.
                  </p>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Access Button -->
            <div style="padding: 0 30px 30px; text-align: center;">
              <a href="https://app.kambafy.com/auth" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
                🔐 Acessar Painel Kambafy
              </a>
              <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">
                Ou acesse: <br>
                <code style="background: #f1f5f9; padding: 5px 10px; border-radius: 4px; font-size: 12px; color: #475569;">https://app.kambafy.com/auth</code>
              </p>
            </div>

            <!-- Features -->
            <div style="padding: 0 30px 30px;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">O que você pode fazer no painel:</h3>
              <div style="color: #475569; line-height: 1.6;">
                <p style="margin: 0 0 12px;">• Ver todas suas compras e produtos</p>
                <p style="margin: 0 0 12px;">• Acessar áreas de membros</p>
                <p style="margin: 0 0 12px;">• Gerenciar seu perfil e dados</p>
                <p style="margin: 0 0 12px;">• Suporte direto da equipe</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b;">KAMBAFY</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Sua plataforma de produtos digitais
              </p>
            </div>

          </div>
        </body>
        </html>
      `;

      const { data: panelEmailResponse, error: panelEmailError } = await resend.emails.send({
        from: "Kambafy <noreply@kambafy.com>",
        to: [normalizedEmail],
        subject: `🚀 Acesso ao Painel Kambafy - ${studentName}`,
        html: panelEmailHtml,
      });

      if (panelEmailError) {
        console.error('Error sending panel access email:', panelEmailError);
      } else {
        console.log("Panel access email sent successfully:", panelEmailResponse);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Both emails sent successfully',
        memberEmailSent: true,
        panelEmailSent: !panelEmailError,
        memberEmailId: emailResponse?.id,
        panelEmailId: panelEmailResponse?.id,
        accountCreated: !accountResult.exists,
        temporaryPassword: newTemporaryPassword // Para debug (remover em produção)
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });

    } catch (accountError) {
      console.error('Error creating Kambafy account:', accountError);
      
      // Still return success for member email, but note panel email failed
      return new Response(JSON.stringify({
        success: true,
        message: 'Member email sent, but panel access failed',
        memberEmailSent: true,
        panelEmailSent: false,
        memberEmailId: emailResponse?.id,
        accountError: (accountError as Error)?.message || 'Unknown error'
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

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