import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Send2FARequest {
  email: string;
  event_type: string;
  user_email: string;
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

    const { email, event_type, user_email, purchase_data }: Send2FARequest = await req.json();

    console.log('Enviando código 2FA:', { email, event_type, user_email });

    if (!email || !event_type) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email e tipo de evento são obrigatórios' 
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
        user_email: email,
        code: code,
        event_type: event_type,
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

    switch (event_type) {
      case 'kambapay_login':
        subject = 'Código de verificação - Login KambaPay';
        htmlContent = `
          <h1>Código de verificação para login</h1>
          <p>Seu código de verificação para login no KambaPay é:</p>
          <h2 style="color: #006b02; font-size: 32px; text-align: center; background: #f0f9f0; padding: 20px; border-radius: 8px;">${code}</h2>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não solicitou este login, ignore este email.</p>
          <br>
          <p>Equipe Kambafy</p>
        `;
        break;
      
      case 'kambapay_register':
        subject = 'Código de verificação - Criação de conta KambaPay';
        htmlContent = `
          <h1>Bem-vindo ao KambaPay!</h1>
          <p>Seu código de verificação para criar sua conta KambaPay é:</p>
          <h2 style="color: #006b02; font-size: 32px; text-align: center; background: #f0f9f0; padding: 20px; border-radius: 8px;">${code}</h2>
          <p>Este código é válido por 10 minutos.</p>
          <p>Após a verificação, você poderá carregar saldo e usar seu email para pagamentos rápidos e seguros.</p>
          <br>
          <p>Equipe Kambafy</p>
        `;
        break;
      
      case 'kambapay_purchase':
        const amount = purchase_data?.amount || 0;
        subject = 'Código de verificação - Compra com KambaPay';
        htmlContent = `
          <h1>Confirmação de compra</h1>
          <p>Para sua segurança, confirme sua compra de <strong>${amount.toLocaleString()} KZ</strong> com o código:</p>
          <h2 style="color: #006b02; font-size: 32px; text-align: center; background: #f0f9f0; padding: 20px; border-radius: 8px;">${code}</h2>
          <p>Este código é válido por 10 minutos.</p>
          <p>Se você não fez esta compra, não compartilhe este código.</p>
          <br>
          <p>Equipe Kambafy</p>
        `;
        break;
      
      default:
        subject = 'Código de verificação - KambaPay';
        htmlContent = `
          <h1>Código de verificação</h1>
          <p>Seu código de verificação é:</p>
          <h2 style="color: #006b02; font-size: 32px; text-align: center; background: #f0f9f0; padding: 20px; border-radius: 8px;">${code}</h2>
          <p>Este código é válido por 10 minutos.</p>
          <br>
          <p>Equipe Kambafy</p>
        `;
    }

    // Enviar email
    const emailResponse = await resend.emails.send({
      from: "KambaPay <noreply@kambafy.com>",
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