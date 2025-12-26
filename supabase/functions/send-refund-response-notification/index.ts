import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundResponseNotificationPayload {
  buyerEmail: string;
  buyerName: string;
  sellerName: string;
  productName: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'approved' | 'rejected';
  sellerComment?: string;
  adminComment?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 [send-refund-response-notification] Iniciando...");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RefundResponseNotificationPayload = await req.json();
    console.log("📧 Payload recebido:", {
      buyerEmail: payload.buyerEmail,
      status: payload.status,
      productName: payload.productName,
      orderId: payload.orderId,
    });

    const {
      buyerEmail,
      buyerName,
      sellerName,
      productName,
      orderId,
      amount,
      currency,
      status,
      sellerComment,
      adminComment,
    } = payload;

    if (!buyerEmail) {
      console.error("❌ Email do cliente não fornecido");
      return new Response(
        JSON.stringify({ error: "Email do cliente é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = status === 'approved';
    const formattedAmount = new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    const statusEmoji = isApproved ? '✅' : '❌';
    const statusText = isApproved ? 'Aprovado' : 'Rejeitado';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusBgColor = isApproved ? '#d1fae5' : '#fee2e2';
    const statusTextColor = isApproved ? '#065f46' : '#991b1b';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resposta do Pedido de Reembolso</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e4e4e7;">
                    <img src="https://kambafy.com/kambafy-logo-new.svg" alt="Kambafy" height="40" style="margin-bottom: 20px;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 700;">
                      ${statusEmoji} Reembolso ${statusText}
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      Olá <strong>${buyerName || 'Cliente'}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      ${isApproved 
                        ? 'Seu pedido de reembolso foi <strong style="color: #10b981;">aprovado</strong>! O valor será creditado de acordo com o método de pagamento original.'
                        : 'Infelizmente, seu pedido de reembolso foi <strong style="color: #ef4444;">rejeitado</strong>. Veja abaixo os detalhes.'
                      }
                    </p>
                    
                    <!-- Status Badge -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                      <tr>
                        <td align="center">
                          <span style="display: inline-block; padding: 10px 24px; background-color: ${statusBgColor}; color: ${statusTextColor}; font-weight: 600; font-size: 16px; border-radius: 24px;">
                            ${statusEmoji} ${statusText.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Info Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                <strong>Pedido:</strong> #${orderId}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                <strong>Produto:</strong> ${productName}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                <strong>Valor:</strong> ${formattedAmount} ${currency || 'KZ'}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                <strong>Vendedor:</strong> ${sellerName || 'Vendedor'}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    ${(sellerComment || adminComment) ? `
                    <!-- Comment Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${isApproved ? '#d1fae5' : '#fee2e2'}; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 10px; color: ${isApproved ? '#065f46' : '#991b1b'}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Comentário:
                          </p>
                          <p style="margin: 0; color: ${isApproved ? '#065f46' : '#991b1b'}; font-size: 14px; line-height: 1.6;">
                            ${sellerComment || adminComment || ''}
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    ${isApproved ? `
                    <!-- Refund Info -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dbeafe; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                            💡 <strong>Próximos passos:</strong> O reembolso será processado em até 5-10 dias úteis, dependendo do método de pagamento utilizado na compra original.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : `
                    <!-- Rejection Info -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                            💡 <strong>O que fazer agora?</strong> Se você discordar desta decisão, pode entrar em contato com nosso suporte para uma análise adicional.
                          </p>
                        </td>
                      </tr>
                    </table>
                    `}
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="https://app.kambafy.com/meus-acessos" 
                             style="display: inline-block; padding: 14px 32px; background-color: ${statusColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                            Ver Meus Acessos
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f4f4f5; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                      Se tiver dúvidas, entre em contato com nosso suporte.
                    </p>
                    <p style="margin: 15px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} Kambafy. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    console.log("📧 Enviando email para:", buyerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <reembolsos@kambafy.com>",
      to: [buyerEmail],
      subject: `${statusEmoji} Seu Reembolso foi ${statusText} - Pedido #${orderId}`,
      html: emailHtml,
    });

    console.log("✅ Email enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌ Erro ao enviar email de resposta de reembolso:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
