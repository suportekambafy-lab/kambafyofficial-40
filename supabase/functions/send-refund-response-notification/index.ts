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
  rejectedBy?: 'seller' | 'admin';
}

// Formatar moeda corretamente
const formatCurrency = (amount: number, currency: string): string => {
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  switch (currency?.toUpperCase()) {
    case 'EUR': return `€${formatted}`;
    case 'GBP': return `£${formatted}`;
    case 'USD': return `$${formatted}`;
    case 'MZN': return `${formatted} MZN`;
    case 'KZ':
    case 'AOA':
    default: return `${formatted} KZ`;
  }
};

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
      rejectedBy: payload.rejectedBy,
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
      rejectedBy,
    } = payload;

    if (!buyerEmail) {
      console.error("❌ Email do cliente não fornecido");
      return new Response(
        JSON.stringify({ error: "Email do cliente é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isApproved = status === 'approved';
    const formattedAmount = formatCurrency(amount, currency);
    const comment = sellerComment || adminComment || '';

    let emailHtml: string;
    let subject: string;

    if (isApproved) {
      // EMAIL DE APROVAÇÃO
      subject = `✅ Seu Reembolso foi Aprovado - Pedido #${orderId}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reembolso Aprovado</title>
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
                      <h1 style="margin: 0; color: #10b981; font-size: 28px; font-weight: 700;">
                        ✅ Reembolso Aprovado!
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
                        Ótima notícia! Seu pedido de reembolso foi <strong style="color: #10b981;">aprovado</strong>. O valor será creditado de acordo com o método de pagamento original.
                      </p>
                      
                      <!-- Status Badge -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <span style="display: inline-block; padding: 12px 28px; background-color: #d1fae5; color: #065f46; font-weight: 700; font-size: 18px; border-radius: 24px;">
                              ✅ APROVADO
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
                                  <strong>📦 Pedido:</strong> #${orderId}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>🛒 Produto:</strong> ${productName}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>💰 Valor a receber:</strong> <span style="color: #10b981; font-weight: 600;">${formattedAmount}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>👤 Vendedor:</strong> ${sellerName || 'Vendedor'}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${comment ? `
                      <!-- Comment Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #d1fae5; border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                              💬 Comentário:
                            </p>
                            <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                              ${comment}
                            </p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Next Steps -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dbeafe; border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                              💡 <strong>Próximos passos:</strong> O reembolso será processado em até 5-10 dias úteis, dependendo do método de pagamento utilizado na compra original.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="https://kambafy.com/meus-acessos" 
                               style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
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
    } else if (rejectedBy === 'admin') {
      // EMAIL DE REJEIÇÃO PELO ADMIN (DECISÃO FINAL)
      subject = `❌ Reembolso Rejeitado - Decisão Final - Pedido #${orderId}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reembolso Rejeitado - Decisão Final</title>
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
                      <h1 style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">
                        ❌ Reembolso Rejeitado
                      </h1>
                      <p style="margin: 10px 0 0; color: #71717a; font-size: 14px;">
                        Decisão Final da Equipe Kambafy
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        Olá <strong>${buyerName || 'Cliente'}</strong>,
                      </p>
                      <p style="margin: 0 0 25px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                        Após análise detalhada da nossa equipe, seu pedido de reembolso foi <strong style="color: #dc2626;">rejeitado</strong>.
                      </p>
                      
                      <!-- Status Badge -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                        <tr>
                          <td align="center">
                            <span style="display: inline-block; padding: 12px 28px; background-color: #fee2e2; color: #991b1b; font-weight: 700; font-size: 16px; border-radius: 24px;">
                              ❌ REJEITADO - DECISÃO FINAL
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
                                  <strong>📦 Pedido:</strong> #${orderId}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>🛒 Produto:</strong> ${productName}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>💰 Valor:</strong> ${formattedAmount}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>👤 Vendedor:</strong> ${sellerName || 'Vendedor'}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${comment ? `
                      <!-- Admin Decision Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 0 12px 12px 0; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; color: #991b1b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                              ⚖️ Decisão da Equipe Kambafy:
                            </p>
                            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                              ${comment}
                            </p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Final Decision Notice -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                              ⚠️ <strong>Nota:</strong> Esta é a decisão final da plataforma Kambafy após análise completa do caso. Se tiver dúvidas adicionais, pode entrar em contato com nosso suporte.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="https://kambafy.com/meus-acessos" 
                               style="display: inline-block; padding: 14px 32px; background-color: #71717a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                              Ver Detalhes
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
    } else {
      // EMAIL DE REJEIÇÃO PELO VENDEDOR (pode contestar)
      subject = `⚠️ Resposta sobre seu Pedido de Reembolso - Pedido #${orderId}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Resposta do Vendedor sobre Reembolso</title>
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
                      <h1 style="margin: 0; color: #f59e0b; font-size: 24px; font-weight: 700;">
                        ⚠️ Resposta sobre seu Reembolso
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
                        O vendedor <strong>${sellerName || 'Vendedor'}</strong> não aprovou seu pedido de reembolso para o produto "<strong>${productName}</strong>".
                      </p>
                      
                      <!-- Info Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>📦 Pedido:</strong> #${orderId}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>🛒 Produto:</strong> ${productName}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>💰 Valor:</strong> ${formattedAmount}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #3f3f46; font-size: 14px;">
                                  <strong>👤 Vendedor:</strong> ${sellerName || 'Vendedor'}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      ${comment ? `
                      <!-- Seller Comment Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-radius: 12px; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; color: #991b1b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                              💬 Motivo do vendedor:
                            </p>
                            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                              ${comment}
                            </p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Option 1: Already Resolved -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 700;">
                              ✅ Já resolveu com o vendedor?
                            </p>
                            <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                              Se você e o vendedor já chegaram a um acordo ou a situação foi resolvida de outra forma, pode <strong>ignorar este email</strong>.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Option 2: Contest -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 0 12px 12px 0; margin-bottom: 25px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;">
                              ❓ Não concordou? Conteste!
                            </p>
                            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                              Se não conseguiu resolver com o vendedor, você pode <strong>contestar esta decisão</strong>. Acesse "Meus Acessos" e nossa equipe Kambafy analisará o caso e dará a <strong>decisão final</strong>.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center">
                            <a href="https://kambafy.com/meus-acessos" 
                               style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                              Contestar em Meus Acessos
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
    }

    console.log("📧 Enviando email para:", buyerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <reembolsos@kambafy.com>",
      to: [buyerEmail],
      subject: subject,
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
