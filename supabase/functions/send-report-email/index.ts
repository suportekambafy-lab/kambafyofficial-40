import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  reportId: string;
  reporterName: string;
  reporterEmail: string;
  reportedUrl: string;
  category: string;
  description: string;
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Produto fraudulento': '#ef4444',
    'Golpe/Burla': '#ef4444',
    'Conteúdo pirata': '#f97316',
    'Violação de direitos autorais': '#f97316',
    'Informações enganosas': '#eab308',
    'Outro': '#6b7280',
  };
  return colors[category] || '#6b7280';
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-report-email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, reporterName, reporterEmail, reportedUrl, category, description }: ReportEmailRequest = await req.json();
    
    console.log("Processing report email for:", reportId);
    console.log("Category:", category);
    console.log("Reporter:", reporterEmail);

    const categoryColor = getCategoryColor(category);
    const displayName = reporterName || 'Anônimo';
    const protocolNumber = reportId.substring(0, 8).toUpperCase();

    // Email para o suporte
    const supportEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚨 Nova Denúncia Recebida</h1>
                  </td>
                </tr>
                
                <!-- Category Badge -->
                <tr>
                  <td style="padding: 20px 30px 0;">
                    <div style="display: inline-block; background-color: ${categoryColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                      ${category}
                    </div>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 30px;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">Protocolo:</strong>
                          <span style="color: #6b7280; float: right; font-family: monospace;">#${protocolNumber}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">Denunciante:</strong>
                          <span style="color: #6b7280; float: right;">${displayName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">Email:</strong>
                          <span style="color: #6b7280; float: right;">${reporterEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <strong style="color: #374151;">URL/Produto Reportado:</strong>
                          <div style="color: #2563eb; margin-top: 5px; word-break: break-all;">${reportedUrl}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Description -->
                <tr>
                  <td style="padding: 0 30px 20px;">
                    <strong style="color: #374151;">Descrição:</strong>
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-top: 10px; color: #374151; line-height: 1.6;">
                      ${description.replace(/\n/g, '<br>')}
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Esta denúncia foi enviada através do formulário de denúncias da Kambafy.
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

    // Email de confirmação para o denunciante
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Denúncia Recebida</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Olá${reporterName ? ` ${reporterName}` : ''},
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Obrigado por nos ajudar a manter a Kambafy segura. Recebemos a sua denúncia e nossa equipe irá analisá-la.
                    </p>
                    
                    <!-- Protocol Box -->
                    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                      <p style="color: #166534; font-size: 14px; margin: 0 0 5px;">Número do Protocolo</p>
                      <p style="color: #166534; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace;">#${protocolNumber}</p>
                    </div>
                    
                    <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 15px; margin: 20px 0;">
                      <p style="color: #854d0e; font-size: 14px; margin: 0;">
                        <strong>⏱️ Prazo de Análise:</strong> Até 48 horas úteis
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                      Você receberá uma atualização por email sobre o resultado da análise.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Equipe Kambafy
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

    // Enviar email para suporte
    console.log("Sending notification email to support...");
    const supportEmailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: ["suporte@kambafy.com"],
      subject: `🚨 Nova Denúncia: ${category} - #${protocolNumber}`,
      html: supportEmailHtml,
    });
    console.log("Support email sent:", supportEmailResponse);

    // Enviar email de confirmação para o denunciante
    console.log("Sending confirmation email to reporter:", reporterEmail);
    const confirmationEmailResponse = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [reporterEmail],
      subject: `Denúncia Recebida - Protocolo #${protocolNumber}`,
      html: confirmationEmailHtml,
    });
    console.log("Confirmation email sent:", confirmationEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        protocolNumber,
        supportEmail: supportEmailResponse,
        confirmationEmail: confirmationEmailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-report-email function:", error);
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
