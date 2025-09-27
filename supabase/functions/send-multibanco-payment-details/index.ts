import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MultibancoPaymentRequest {
  customerEmail: string;
  customerName: string;
  productName: string;
  amount: string;
  currency: string;
  entity: string;
  reference: string;
  paymentIntentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const {
      customerEmail,
      customerName,
      productName,
      amount,
      currency,
      entity,
      reference,
      paymentIntentId
    }: MultibancoPaymentRequest = await req.json();

    console.log("📧 Enviando email de pagamento Multibanco para:", customerEmail);

    const emailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [customerEmail],
      subject: `Dados para Pagamento - ${productName}`,
      html: `
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Dados para Pagamento Multibanco</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; padding: 15px !important; }
              .header-title { font-size: 20px !important; }
              .section { padding: 20px !important; }
              .payment-table td { display: block !important; width: 100% !important; padding: 5px 0 !important; }
              .payment-table td:first-child { font-weight: bold; margin-bottom: 5px; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px 30px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <h1 class="header-title" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">KAMBAFY</h1>
              <p style="margin: 15px 0 0; font-size: 18px; font-weight: 500; color: #f59e0b;">Dados para Pagamento</p>
              <p style="margin: 8px 0 0; font-size: 16px; color: #64748b;">Complete seu pagamento com os dados abaixo</p>
            </div>

            <!-- Greeting -->
            <div style="padding: 30px 30px 0;">
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px;">
                Olá <strong>${customerName}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 25px;">
                Recebemos seu pedido para <strong>${productName}</strong>. Para completar a compra, efetue o pagamento usando os dados Multibanco abaixo:
              </p>
            </div>

            <!-- Payment Details -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Dados de Pagamento Multibanco</h2>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <table class="payment-table" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569; width: 30%;">Entidade:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace;">${entity}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569;">Referência:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace;">${reference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-weight: 500; color: #475569;">Valor:</td>
                    <td style="padding: 12px 0; font-size: 20px; font-weight: 700; color: #059669;">${amount} ${currency}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Instructions -->
            <div class="section" style="padding: 30px; border-bottom: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Como Pagar</h3>
              <div style="color: #475569; line-height: 1.6;">
                <p style="margin: 0 0 12px;">1. Acesse o multibanco ou homebanking</p>
                <p style="margin: 0 0 12px;">2. Selecione "Pagamentos" ou "Serviços"</p>
                <p style="margin: 0 0 12px;">3. Insira a entidade e referência acima</p>
                <p style="margin: 0;">4. Confirme o valor e efetue o pagamento</p>
              </div>
              
              <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0 0;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                  <strong>Importante:</strong> Após efetuar o pagamento, você receberá automaticamente um email de confirmação com os detalhes de acesso ao produto. O processamento pode levar até alguns minutos.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">KAMBAFY</h3>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Este email foi enviado automaticamente
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Email de pagamento Multibanco enviado:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Erro ao enviar email de pagamento Multibanco:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);