import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

console.log('🚀 [REFERRAL-EMAIL] Iniciando função send-referral-program-email');

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  console.error('❌ [REFERRAL-EMAIL] CRITICAL: RESEND_API_KEY não está configurada!');
}

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReferralEmailRequest {
  type: 'application_submitted' | 'application_approved' | 'application_rejected';
  userEmail: string;
  userName: string;
  referralCode?: string;
  rewardOption?: 'long_term' | 'short_term';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('📨 [REFERRAL-EMAIL] Recebeu requisição');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type,
      userEmail, 
      userName,
      referralCode,
      rewardOption,
      rejectionReason
    }: ReferralEmailRequest = await req.json();
    
    console.log('✅ [REFERRAL-EMAIL] Dados recebidos:', {
      type,
      userEmail,
      userName,
      referralCode,
      rewardOption
    });

    let subject = '';
    let htmlContent = '';

    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header-pending { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); }
        .header-rejected { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .highlight-box-pending { border-left-color: #F59E0B; }
        .code-box { background: #1a1a2e; color: #10B981; font-size: 24px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; font-family: monospace; letter-spacing: 2px; }
        .btn { display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .commission-info { display: flex; gap: 10px; margin: 15px 0; }
        .commission-badge { background: #10B981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
      </style>
    `;

    if (type === 'application_submitted') {
      subject = '📝 Candidatura Recebida - Programa Indique e Ganhe';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Candidatura Recebida</title>
          ${baseStyles}
        </head>
        <body>
          <div class="header header-pending">
            <h1>📝 Candidatura Recebida</h1>
            <p>Programa Indique e Ganhe - Kambafy</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Recebemos sua candidatura ao programa <strong>Indique e Ganhe</strong> da Kambafy!</p>
            
            <div class="highlight-box highlight-box-pending">
              <h3>⏳ Status: Em Análise</h3>
              <p>Nossa equipe está analisando sua candidatura. Você receberá uma resposta em até <strong>48 horas úteis</strong>.</p>
              ${rewardOption ? `
                <p><strong>Opção escolhida:</strong> ${rewardOption === 'long_term' ? '1,5% por 12 meses (Longo Prazo)' : '2% por 6 meses (Curto Prazo)'}</p>
              ` : ''}
            </div>
            
            <h3>📋 O que acontece agora?</h3>
            <ul>
              <li>✅ Sua candidatura foi registada com sucesso</li>
              <li>🔍 Nossa equipe irá analisar suas informações</li>
              <li>📧 Você receberá um email com o resultado</li>
              <li>🎉 Se aprovado, receberá seu código exclusivo de indicação</li>
            </ul>
            
            <h3>💡 Enquanto isso...</h3>
            <p>Continue vendendo seus produtos na Kambafy! Quando for aprovado, você poderá começar a indicar novos vendedores imediatamente.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.kambafy.com/vendedor/produtos" class="btn" style="background: #F59E0B;">Ir para Meus Produtos</a>
            </div>
          </div>
          
          <div class="footer">
            <p>📱 <strong>Kambafy</strong> - Sua plataforma de vendas digitais</p>
            <p>🌐 <a href="https://kambafy.com">kambafy.com</a> | 📧 <a href="mailto:suporte@kambafy.com">suporte@kambafy.com</a></p>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'application_approved') {
      const referralLink = `https://app.kambafy.com/auth?mode=signup&type=seller&ref=${referralCode}`;
      const commissionText = rewardOption === 'long_term' 
        ? '1,5% por 12 meses' 
        : '2% por 6 meses';

      subject = '🎉 Parabéns! Sua candidatura foi APROVADA - Indique e Ganhe';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Candidatura Aprovada</title>
          ${baseStyles}
        </head>
        <body>
          <div class="header">
            <h1>🎉 Parabéns! Você foi Aprovado!</h1>
            <p>Programa Indique e Ganhe - Kambafy</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Temos uma excelente notícia! Sua candidatura ao programa <strong>Indique e Ganhe</strong> foi <strong style="color: #10B981;">APROVADA</strong>! 🎊</p>
            
            <div class="highlight-box">
              <h3>🎁 Seu Código de Indicação</h3>
              <div class="code-box">${referralCode}</div>
              <p style="text-align: center; margin-top: 15px; font-size: 14px; color: #666;">
                Guarde este código! Ele é único e exclusivo para você.
              </p>
            </div>
            
            <div class="highlight-box">
              <h3>💰 Sua Comissão</h3>
              <p style="font-size: 20px; font-weight: bold; color: #10B981; margin: 10px 0;">${commissionText}</p>
              <p>Você receberá esta comissão sobre as vendas líquidas de cada vendedor que indicar.</p>
            </div>
            
            <h3>🔗 Seu Link de Indicação</h3>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px;">
              ${referralLink}
            </div>
            
            <h3 style="margin-top: 25px;">🚀 Como Funciona?</h3>
            <ol>
              <li><strong>Partilhe seu link</strong> nas redes sociais, grupos e com amigos</li>
              <li><strong>Novos vendedores</strong> se cadastram usando seu link</li>
              <li><strong>Quando eles vendem</strong>, você recebe sua comissão automaticamente</li>
              <li><strong>Acompanhe tudo</strong> no seu painel de indicações</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.kambafy.com/vendedor/indicacoes" class="btn">Ver Meu Painel de Indicações</a>
            </div>
            
            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Dica:</strong> Quanto mais vendedores você indicar, mais você ganha! Não há limite de indicações.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>📱 <strong>Kambafy</strong> - Sua plataforma de vendas digitais</p>
            <p>🌐 <a href="https://kambafy.com">kambafy.com</a> | 📧 <a href="mailto:suporte@kambafy.com">suporte@kambafy.com</a></p>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'application_rejected') {
      subject = '📋 Atualização sobre sua candidatura - Indique e Ganhe';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Candidatura Não Aprovada</title>
          ${baseStyles}
        </head>
        <body>
          <div class="header header-rejected">
            <h1>📋 Atualização da Candidatura</h1>
            <p>Programa Indique e Ganhe - Kambafy</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <p>Agradecemos seu interesse no programa <strong>Indique e Ganhe</strong> da Kambafy.</p>
            
            <div class="highlight-box" style="border-left-color: #EF4444;">
              <h3>❌ Candidatura Não Aprovada</h3>
              <p>Após análise, infelizmente sua candidatura não foi aprovada neste momento.</p>
              ${rejectionReason ? `<p><strong>Motivo:</strong> ${rejectionReason}</p>` : ''}
            </div>
            
            <h3>🔄 O que você pode fazer?</h3>
            <ul>
              <li>Continue vendendo e construindo seu histórico na plataforma</li>
              <li>Amplie sua presença nas redes sociais</li>
              <li>Você pode se candidatar novamente em 30 dias</li>
            </ul>
            
            <p>Enquanto isso, continue aproveitando todas as funcionalidades da Kambafy para vender seus produtos digitais!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://app.kambafy.com/vendedor/produtos" class="btn" style="background: #6B7280;">Ir para Meus Produtos</a>
            </div>
          </div>
          
          <div class="footer">
            <p>📱 <strong>Kambafy</strong> - Sua plataforma de vendas digitais</p>
            <p>🌐 <a href="https://kambafy.com">kambafy.com</a> | 📧 <a href="mailto:suporte@kambafy.com">suporte@kambafy.com</a></p>
          </div>
        </body>
        </html>
      `;
    }

    console.log('📧 [REFERRAL-EMAIL] Enviando email:', { type, to: userEmail, subject });

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    console.log("✅ [REFERRAL-EMAIL] Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ [REFERRAL-EMAIL] Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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
