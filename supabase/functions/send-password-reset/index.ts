
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  customerName?: string;
  isNewAccount?: boolean;
  orderId?: string;
  resetLink?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, customerName, isNewAccount = false, orderId, resetLink }: PasswordResetRequest = await req.json();

    console.log('=== PASSWORD RESET EMAIL START ===');
    console.log('Email:', email, 'Name:', customerName, 'IsNewAccount:', isNewAccount);

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let actualResetLink = resetLink;

    // Se não foi fornecido um link personalizado, gerar um novo
    if (!resetLink) {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: 'https://app.kambafy.com/reset-password'
        }
      });

      if (error) {
        console.error('❌ Error generating reset link:', error);
        throw error;
      }

      actualResetLink = data.properties?.action_link;
    }
    
    if (!actualResetLink) {
      throw new Error('Failed to generate reset link');
    }

    const displayName = customerName || email.split('@')[0];

    // Create email content
    const emailHtml = `
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${isNewAccount ? 'Bem-vindo à Kambafy - Crie sua Senha' : 'Redefinir Senha - Kambafy'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
            <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: ${isNewAccount ? '#16a34a' : '#f59e0b'};">${isNewAccount ? 'Bem-vindo à Kambafy!' : 'Redefinir Senha'}</p>
            <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">
              ${isNewAccount ? `Olá ${displayName}! Sua conta foi criada.` : `Olá ${displayName}!`}
            </p>
          </div>

          ${isNewAccount ? `
          <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
              <h3 style="color: #16a34a; margin: 0 0 15px; font-size: 18px; font-weight: 600;">Sua Compra foi Processada!</h3>
              <p style="margin: 0; color: #16a34a; line-height: 1.6;">
                Criamos automaticamente uma conta para você ter acesso aos seus produtos.
                ${orderId ? `<br>Número do pedido: <strong>${orderId}</strong>` : ''}
              </p>
            </div>
          </div>
          ` : ''}

          <!-- Main Content -->
          <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 20px; font-weight: 600;">
              ${isNewAccount ? 'Crie Sua Senha' : 'Redefinir Senha'}
            </h2>
            <p style="margin: 0 0 25px; color: #475569; line-height: 1.6;">
              ${isNewAccount 
                ? 'Para acessar sua conta e seus produtos, você precisa criar uma senha segura.'
                : 'Clique no botão abaixo para redefinir sua senha.'
              }
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${actualResetLink}" 
                 style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                ${isNewAccount ? 'Criar Minha Senha' : 'Redefinir Senha'}
              </a>
            </div>
            
            <p style="margin: 15px 0 0; font-size: 14px; color: #64748b;">
              Este link é válido por 1 hora. Se não funcionar, copie e cole no seu navegador:
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 10px 0; word-break: break-all; font-size: 12px; color: #475569;">
              ${actualResetLink}
            </div>
          </div>

          ${isNewAccount ? `
          <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 20px; font-size: 18px; font-weight: 600;">Próximos Passos</h3>
            <div style="color: #475569; line-height: 1.6;">
              <p style="margin: 0 0 12px;">1. <strong>Crie sua senha</strong> usando o botão acima</p>
              <p style="margin: 0 0 12px;">2. <strong>Verifique seu email</strong> - enviaremos as confirmações dos produtos</p>
              <p style="margin: 0;">3. <strong>Acesse seus produtos</strong> através dos links que receberá</p>
            </div>
          </div>
          ` : ''}

          <!-- Support -->
          <div style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">Precisa de Ajuda?</h3>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
              Se tiver alguma dúvida, entre em contato conosco:
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
              ${isNewAccount ? 'Bem-vindo à nossa comunidade!' : 'Aqui para ajudar!'}
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    // Send email
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [email.trim()],
      subject: isNewAccount 
        ? `Bem-vindo à Kambafy - Crie sua Senha` 
        : `Redefinir Senha - Kambafy`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      throw emailError;
    }

    console.log('✅ Password reset email sent successfully:', emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset email sent successfully',
      emailSent: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERROR IN PASSWORD RESET ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro ao enviar email de redefinição de senha'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
