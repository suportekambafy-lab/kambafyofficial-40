import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Send2FARequest {
  email: string;
  event_type?: string;
  user_email?: string;
  context?: string; // Legacy support
  purchase_data?: {
    product_id: string;
    amount: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const requestBody: Send2FARequest = await req.json();
    const { email, event_type, user_email, context, purchase_data } = requestBody;

    // Support legacy format and new format
    const finalEventType = event_type || context || 'admin_login';
    const finalUserEmail = user_email || email;

    console.log('Enviando código 2FA:', { 
      email, 
      event_type: finalEventType, 
      user_email: finalUserEmail,
      body: requestBody 
    });

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email é obrigatório' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Salvar código na base de dados
    const { error: insertError } = await supabase
      .from('two_factor_codes')
      .insert({
        user_email: finalUserEmail,
        code: code,
        event_type: finalEventType,
        used: false,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos
      });

    if (insertError) {
      console.error('Erro ao salvar código 2FA:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro interno do servidor' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Preparar conteúdo do email baseado no tipo de evento
    let subject = '';
    let htmlContent = '';
    let codeDisplay = `<div style="text-align: center; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 20px 0;"><span style="font-size: 32px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; letter-spacing: 3px;">${code}</span></div>`;

    switch (finalEventType) {
      case 'signup':
        subject = 'Código de verificação - Confirmação de cadastro';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Bem-vindo à Kambafy!</h2>
                <p style="margin: 0 0 25px; color: #475569;">Para finalizar seu cadastro, use o código de verificação abaixo:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Se você não fez este cadastro, ignore este email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
        
      case 'kambapay_login':
        subject = 'Código de verificação - Login KambaPay';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Código de verificação para login</h2>
                <p style="margin: 0 0 25px; color: #475569;">Seu código de verificação para login no KambaPay é:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Se você não solicitou este login, ignore este email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'kambapay_register':
        subject = 'Código de verificação - Criação de conta KambaPay';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Bem-vindo ao KambaPay!</h2>
                <p style="margin: 0 0 25px; color: #475569;">Seu código de verificação para criar sua conta KambaPay é:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Após a verificação, você poderá carregar saldo e usar seu email para pagamentos rápidos e seguros.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'kambapay_purchase':
        const amount = purchase_data?.amount || 0;
        subject = 'Código de verificação - Compra com KambaPay';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Confirmação de compra</h2>
                <p style="margin: 0 0 25px; color: #475569;">Para sua segurança, confirme sua compra de <strong>${amount.toLocaleString()} KZ</strong> com o código:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Se você não fez esta compra, não compartilhe este código.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'admin_login':
        subject = 'Código de verificação - Login Admin';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #dc2626;">Código de verificação para Admin</h2>
                <p style="margin: 0 0 25px; color: #475569;">Seu código de verificação para login administrativo é:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Se você não solicitou este login, ignore este email e entre em contato conosco.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'member_area_login':
        subject = 'Código de verificação - Acesso Área de Membros';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Verificação de Segurança</h2>
                <p style="margin: 0 0 25px; color: #475569;">Detectamos uma tentativa de login como proprietário da área de membros. Para sua segurança, confirme sua identidade com o código:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #64748b; font-size: 14px;">Se você não fez essa tentativa de login, alguém pode estar tentando acessar sua área. Entre em contato conosco.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'bank_details_change':
        subject = 'Código de verificação - Alteração de IBAN';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #f59e0b;">Alteração de Dados Bancários</h2>
                <p style="margin: 0 0 25px; color: #475569;">Você solicitou a alteração do seu IBAN. Para confirmar esta ação, use o código abaixo:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #dc2626; font-size: 14px;"><strong>⚠️ Se você não solicitou esta alteração, não compartilhe este código e entre em contato conosco imediatamente.</strong></p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'withdrawal':
        subject = 'Código de verificação - Solicitação de Saque';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Confirmação de Saque</h2>
                <p style="margin: 0 0 25px; color: #475569;">Você solicitou um saque da sua conta. Para confirmar esta operação, use o código abaixo:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #dc2626; font-size: 14px;"><strong>⚠️ Se você não solicitou este saque, não compartilhe este código e entre em contato conosco imediatamente.</strong></p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'password_change':
        subject = 'Código de verificação - Alteração de Senha';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #f59e0b;">Alteração de Senha</h2>
                <p style="margin: 0 0 25px; color: #475569;">Você solicitou a alteração da sua senha. Para confirmar, use o código abaixo:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #dc2626; font-size: 14px;"><strong>⚠️ Se você não solicitou esta alteração, sua conta pode estar em risco. Entre em contato conosco.</strong></p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      case 'disable_2fa':
        subject = 'Código de verificação - Desativar 2FA';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #dc2626;">Desativar Autenticação de 2 Fatores</h2>
                <p style="margin: 0 0 25px; color: #475569;">Você solicitou desativar a autenticação de dois fatores. Para confirmar, use o código abaixo:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
                <p style="margin: 10px 0 0; color: #dc2626; font-size: 14px;"><strong>⚠️ Atenção: Desativar o 2FA reduz a segurança da sua conta. Se você não solicitou isso, entre em contato conosco imediatamente.</strong></p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
      
      default:
        subject = 'Código de verificação - KambaPay';
        htmlContent = `
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="text-align: center; padding: 40px 30px;">
                <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 700; color: #1e293b;">KAMBAFY</h1>
                <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #16a34a;">Código de verificação</h2>
                <p style="margin: 0 0 25px; color: #475569;">Seu código de verificação é:</p>
                ${codeDisplay}
                <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Este código é válido por 10 minutos.</p>
              </div>
            </div>
          </body>
          </html>
        `;
    }

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [email],
      subject: subject,
      html: htmlContent
    });

    if (emailResponse.error) {
      console.error('Erro ao enviar email:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao enviar email' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Código 2FA enviado com sucesso para:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código enviado com sucesso',
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao enviar código 2FA:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);