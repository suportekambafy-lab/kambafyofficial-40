import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequestNotificationPayload {
  sellerEmail: string;
  sellerName: string;
  buyerName: string;
  buyerEmail: string;
  productName: string;
  orderId: string;
  amount: number;
  currency: string;
  reason: string;
  refundDeadline: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 [send-refund-request-notification] Iniciando...");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RefundRequestNotificationPayload = await req.json();
    console.log("📧 Payload recebido:", {
      sellerEmail: payload.sellerEmail,
      buyerName: payload.buyerName,
      productName: payload.productName,
      orderId: payload.orderId,
    });

    const {
      sellerEmail,
      sellerName,
      buyerName,
      buyerEmail,
      productName,
      orderId,
      amount,
      currency,
      reason,
      refundDeadline,
    } = payload;

    if (!sellerEmail) {
      console.error("❌ Email do vendedor não fornecido");
      return new Response(
        JSON.stringify({ error: "Email do vendedor é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedAmount = new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    const deadlineDate = refundDeadline 
      ? new Date(refundDeadline).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Não especificado';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Pedido de Reembolso</title>
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
                      ⚠️ Novo Pedido de Reembolso
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 20px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      Olá <strong>${sellerName || 'Vendedor'}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      Um cliente solicitou um reembolso para uma de suas vendas. Por favor, revise o pedido e responda o mais breve possível.
                    </p>
                    
                    <!-- Info Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding: 8px 0; color: #78350f; font-size: 14px;">
                                <strong>Pedido:</strong> #${orderId}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #78350f; font-size: 14px;">
                                <strong>Produto:</strong> ${productName}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #78350f; font-size: 14px;">
                                <strong>Valor:</strong> ${formattedAmount} ${currency || 'KZ'}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #78350f; font-size: 14px;">
                                <strong>Cliente:</strong> ${buyerName} (${buyerEmail})
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #78350f; font-size: 14px;">
                                <strong>Prazo para responder:</strong> ${deadlineDate}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Reason Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; border-radius: 12px; margin-bottom: 25px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 10px; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Motivo do reembolso:
                          </p>
                          <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.6;">
                            ${reason || 'Nenhum motivo especificado'}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="https://app.kambafy.com/vendedor/reembolsos" 
                             style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                            Ver Pedido de Reembolso
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

    console.log("📧 Enviando email para:", sellerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <reembolsos@kambafy.com>",
      to: [sellerEmail],
      subject: `⚠️ Novo Pedido de Reembolso - Pedido #${orderId}`,
      html: emailHtml,
    });

    console.log("✅ Email enviado com sucesso:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌ Erro ao enviar email de notificação de reembolso:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
