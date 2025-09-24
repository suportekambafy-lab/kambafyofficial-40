
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
        <meta charset="utf-8">
        <title>${isNewAccount ? 'Bem-vindo à Kambafy - Crie sua Senha' : 'Redefinir Senha - Kambafy'}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
            <span style="font-size: 24px; font-weight: bold;">K</span>
          </div>
          <div style="background-color: #16a34a; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="margin: 0; font-size: 24px;">
              ${isNewAccount ? '🎉 Bem-vindo à Kambafy!' : '🔑 Redefinir Senha'}
            </h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">
              ${isNewAccount ? `Olá ${displayName}! Sua conta foi criada.` : `Olá ${displayName}!`}
            </p>
          </div>
        </div>

        ${isNewAccount ? `
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #16a34a; margin: 0 0 15px 0;">🛒 Sua Compra foi Processada!</h3>
          <p style="margin: 0; color: #16a34a;">
            Criamos automaticamente uma conta para você ter acesso aos seus produtos.
            ${orderId ? `<br>Número do pedido: <strong>${orderId}</strong>` : ''}
          </p>
        </div>
        ` : ''}

        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #16a34a; margin: 0 0 20px 0;">
            ${isNewAccount ? 'Crie Sua Senha' : 'Redefinir Senha'}
          </h2>
          <p style="margin: 0 0 20px 0;">
            ${isNewAccount 
              ? 'Para acessar sua conta e seus produtos, você precisa criar uma senha segura.'
              : 'Clique no botão abaixo para redefinir sua senha.'
            }
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${actualResetLink}" 
               style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              ${isNewAccount ? 'Criar Minha Senha' : 'Redefinir Senha'}
            </a>
          </div>
          
          <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
            Este link é válido por 1 hora. Se não funcionar, copie e cole no seu navegador:
          </p>
          <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px; font-size: 12px; margin: 10px 0;">
            ${actualResetLink}
          </p>
        </div>

        ${isNewAccount ? `
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">📧 Próximos Passos</h3>
          <div style="color: #856404; margin: 0;">
            <p style="margin: 0 0 10px 0;">1. <strong>Crie sua senha</strong> usando o botão acima</p>
            <p style="margin: 0 0 10px 0;">2. <strong>Verifique seu email</strong> - enviaremos as confirmações dos produtos</p>
            <p style="margin: 0 0 10px 0;">3. <strong>Acesse seus produtos</strong> através dos links que receberá</p>
          </div>
        </div>
        ` : ''}

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">📞 Precisa de Ajuda?</h3>
          <p style="margin: 0; color: #856404;">
            Se tiver alguma dúvida, entre em contato conosco:
          </p>
          <p style="margin: 10px 0 0 0; color: #856404;">
            <strong>Email:</strong> suporte@kambafy.com<br>
            <strong>WhatsApp:</strong> (+244) 900 000 000
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #666;">
            <strong>Kambafy</strong><br>
            ${isNewAccount ? 'Bem-vindo à nossa comunidade!' : 'Aqui para ajudar!'}
          </p>
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
