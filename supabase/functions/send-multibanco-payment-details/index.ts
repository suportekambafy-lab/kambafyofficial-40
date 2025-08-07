import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dados para Pagamento Multibanco</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Dados para Pagamento</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Complete seu pagamento com os dados abaixo</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              
              <!-- Greeting -->
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Olá <strong>${customerName}</strong>,
              </p>
              
              <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 25px 0;">
                Recebemos seu pedido para <strong>${productName}</strong>. Para completar a compra, efetue o pagamento usando os dados Multibanco abaixo:
              </p>
              
              <!-- Payment Details Card -->
              <div style="background-color: #f8fffe; border: 2px solid #10b981; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <h3 style="margin: 0 0 20px 0; color: #10b981; font-size: 18px; text-align: center;">
                  💳 Dados de Pagamento Multibanco
                </h3>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="font-weight: bold; color: #333; font-size: 14px;">Entidade:</span>
                  <span style="font-size: 18px; font-weight: bold; color: #10b981; font-family: monospace;">${entity}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="font-weight: bold; color: #333; font-size: 14px;">Referência:</span>
                  <span style="font-size: 18px; font-weight: bold; color: #10b981; font-family: monospace;">${reference}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0;">
                  <span style="font-weight: bold; color: #333; font-size: 14px;">Valor:</span>
                  <span style="font-size: 18px; font-weight: bold; color: #10b981;">${amount} ${currency}</span>
                </div>
              </div>
              
              <!-- Instructions -->
              <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">ℹ️ Como pagar:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <li>Acesse o multibanco ou homebanking</li>
                  <li>Selecione "Pagamentos" ou "Serviços"</li>
                  <li>Insira a entidade e referência acima</li>
                  <li>Confirme o valor e efetue o pagamento</li>
                </ul>
              </div>
              
              <p style="font-size: 13px; color: #666; line-height: 1.6; margin: 25px 0 0 0;">
                ⏰ <strong>Importante:</strong> Após efetuar o pagamento, você receberá automaticamente um email de confirmação com os detalhes de acesso ao produto. O processamento pode levar até alguns minutos.
              </p>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Este email foi enviado automaticamente. Se precisar de ajuda, entre em contato conosco.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280;">
                © 2024 Kambafy. Todos os direitos reservados.
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