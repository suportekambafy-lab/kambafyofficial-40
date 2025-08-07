
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface TwoFARequest {
  email: string;
  code: string;
  context?: 'login' | 'bank_details_change' | 'withdrawal' | 'password_change' | 'disable_2fa';
}

const getEmailContent = (code: string, context: string = 'login') => {
  const contexts = {
    login: {
      subject: "Código de Login - Kambafy",
      title: "Código de Login",
      message: "Use o código abaixo para completar seu login na Kambafy:",
      footer: "Se você não tentou fazer login, ignore este email."
    },
    bank_details_change: {
      subject: "Verificação para Alterar IBAN - Kambafy",
      title: "Alteração de Dados Bancários",
      message: "Use o código abaixo para confirmar a alteração do seu IBAN:",
      footer: "Se você não solicitou esta alteração, ignore este email e entre em contato conosco."
    },
    withdrawal: {
      subject: "Confirmação de Saque - Kambafy",
      title: "Confirmação de Saque",
      message: "Use o código abaixo para confirmar seu saque:",
      footer: "Se você não solicitou este saque, ignore este email e entre em contato conosco imediatamente."
    },
    password_change: {
      subject: "Alteração de Senha - Kambafy",
      title: "Alteração de Senha",
      message: "Use o código abaixo para confirmar a alteração da sua senha:",
      footer: "Se você não solicitou esta alteração, ignore este email e altere sua senha imediatamente."
    },
    disable_2fa: {
      subject: "Desativação do 2FA - Kambafy",
      title: "Desativação da Autenticação de Dois Fatores",
      message: "Use o código abaixo para confirmar a desativação do 2FA:",
      footer: "Se você não solicitou esta desativação, ignore este email e mantenha seu 2FA ativo."
    }
  };

  const content = contexts[context as keyof typeof contexts] || contexts.login;

  return {
    subject: content.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="font-size: 24px; font-weight: bold;">K</span>
          </div>
          <h2 style="color: #16a34a; text-align: center;">${content.title}</h2>
        </div>
        
        <p>Olá,</p>
        <p>${content.message}</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; font-weight: bold; color: #16a34a; margin: 0; letter-spacing: 4px;">${code}</h1>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Este código é válido por 5 minutos. ${content.footer}
        </p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #888; font-size: 12px; text-align: center;">
          Kambafy - Plataforma de Infoprodutos
        </p>
      </div>
    `
  };
};

const handler = async (req: Request): Promise<Response> => {
  console.log('🔧 send-2fa-code function called');
  
  if (req.method === "OPTIONS") {
    console.log('🔧 CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log('🔧 Method not allowed:', req.method);
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { email, code, context }: TwoFARequest = await req.json();
    console.log('🔧 Request data:', { email, code: code ? 'REDACTED' : 'MISSING', context });

    if (!email || !code) {
      console.log('🔧 Missing required fields');
      return new Response(
        JSON.stringify({ error: "Email e código são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('🔧 Sending 2FA code to:', email, 'Context:', context);

    const emailContent = getEmailContent(code, context);

    const { data: emailResponse, error } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('🔧 Resend error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("🔧 2FA code email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Código 2FA enviado com sucesso"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("🔧 Error sending 2FA code:", error);
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
