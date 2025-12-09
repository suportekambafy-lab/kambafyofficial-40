import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

console.log('🚀 [EMAIL] Iniciando função send-seller-notification-email');

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
console.log('🔑 [EMAIL] Resend API Key presente:', !!RESEND_API_KEY);

if (!RESEND_API_KEY) {
  console.error('❌ [EMAIL] CRITICAL: RESEND_API_KEY não está configurada!');
}

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SellerNotificationRequest {
  sellerEmail: string;
  sellerName: string;
  productName: string;
  orderNumber: string;
  amount: string;
  currency: string;
  customerName: string;
  customerEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('📨 [EMAIL] Recebeu requisição para send-seller-notification-email');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log('⚙️ [EMAIL] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 [EMAIL] Fazendo parse do body da requisição');
    
    const { 
      sellerEmail, 
      sellerName, 
      productName, 
      orderNumber, 
      amount, 
      currency,
      customerName,
      customerEmail 
    }: SellerNotificationRequest = await req.json();
    
    console.log('✅ [EMAIL] Body parsed com sucesso:', {
      sellerEmail,
      productName,
      orderNumber,
      amount,
      currency
    });

    console.log('📧 Enviando email de notificação para vendedor:', {
      sellerEmail,
      productName,
      orderNumber,
      amount,
      currency
    });

    // Formatar valor (valor já vem no formato correto, não dividir por 100)
    let formattedAmount: string;
    try {
      const numericAmount = parseFloat(String(amount).replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(numericAmount)) {
        formattedAmount = `${amount} ${currency}`;
      } else {
        formattedAmount = new Intl.NumberFormat('pt-AO', {
          style: 'currency',
          currency: currency === 'KZ' ? 'AOA' : (currency || 'AOA')
        }).format(numericAmount);
      }
    } catch (formatError) {
      console.log('⚠️ [EMAIL] Error formatting amount, using fallback:', formatError);
      formattedAmount = `${amount} ${currency}`;
    }
    
    console.log('💰 [EMAIL] Formatted amount:', formattedAmount);

    const emailResponse = await resend.emails.send({
      from: "Kambafy Vendas <vendas@kambafy.com>",
      to: [sellerEmail],
      subject: `🎉 Nova Venda Aprovada - ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nova Venda Aprovada</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .sale-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; }
            .btn { display: inline-block; background: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Parabéns! Nova Venda Aprovada</h1>
            <p>Sua transferência bancária foi aprovada com sucesso</p>
          </div>
          
          <div class="content">
            <p>Olá <strong>${sellerName}</strong>,</p>
            
            <p>Temos uma ótima notícia! Sua venda foi aprovada e processada com sucesso.</p>
            
            <div class="sale-details">
              <h3>📦 Detalhes da Venda</h3>
              <p><strong>Produto:</strong> ${productName}</p>
              <p><strong>Pedido:</strong> #${orderNumber}</p>
              <p><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>
              <p><strong>Valor:</strong> <span class="amount">${formattedAmount}</span></p>
              <p><strong>Status:</strong> ✅ Aprovado e Processado</p>
            </div>
            
            <h3>✨ Próximos Passos</h3>
            <ul>
              <li>💰 O valor já foi creditado em sua conta na Kambafy</li>
              <li>📧 O cliente recebeu acesso ao produto automaticamente</li>
              <li>📊 Você pode acompanhar suas vendas no dashboard</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://kambafy.com/dashboard" class="btn">Ver Dashboard de Vendas</a>
            </div>
            
            <p><strong>Dica:</strong> Continue promovendo seus produtos para aumentar suas vendas! Lembre-se que você pode usar o sistema de afiliados da Kambafy para expandir seu alcance.</p>
          </div>
          
          <div class="footer">
            <p>📱 <strong>Kambafy</strong> - Sua plataforma de vendas digitais</p>
            <p>🌐 <a href="https://kambafy.com">kambafy.com</a> | 📧 <a href="mailto:suporte@kambafy.com">suporte@kambafy.com</a></p>
            <p>Este e-mail foi enviado automaticamente. Se você não solicitou esta informação, pode ignorar este e-mail.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email de notificação enviado com sucesso:", emailResponse);

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
    console.error("Erro ao enviar email de notificação:", error);
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