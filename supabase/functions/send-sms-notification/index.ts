import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = 'https://api.infobip.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSNotificationRequest {
  to: string; // Número do telefone do destinatário
  message: string; // Mensagem a ser enviada
  from?: string; // Sender ID (opcional)
  type: 'purchase_confirmation' | 'course_access' | 'payment_reminder' | 'custom';
  customerName?: string;
  productName?: string;
  memberAreaUrl?: string;
  referenceNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[SMS-NOTIFICATION] Function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!INFOBIP_API_KEY) {
      console.error('[SMS-NOTIFICATION] Infobip API key not configured');
      throw new Error('Infobip API key not configured');
    }

    const requestData: SMSNotificationRequest = await req.json();
    console.log('[SMS-NOTIFICATION] Request data:', JSON.stringify(requestData, null, 2));

    // Validar dados obrigatórios
    if (!requestData.to || !requestData.message) {
      throw new Error('Phone number and message are required');
    }

    // Limpar e formatar número de telefone
    let phoneNumber = requestData.to.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
    
    // Se não começar com código do país, assumir Angola (+244)
    if (!phoneNumber.startsWith('244') && phoneNumber.length === 9) {
      phoneNumber = '244' + phoneNumber;
    }

    console.log('[SMS-NOTIFICATION] Formatted phone:', phoneNumber);

    // Preparar mensagem baseada no tipo
    let finalMessage = requestData.message;
    
    if (requestData.type === 'purchase_confirmation') {
      finalMessage = `🎉 Compra confirmada!\n\nOlá ${requestData.customerName || 'Cliente'},\n\nSua compra do produto "${requestData.productName}" foi confirmada com sucesso!\n\n${requestData.memberAreaUrl ? `Acesse seu curso: ${requestData.memberAreaUrl}` : ''}\n\nObrigado por escolher a Kambafy!`;
    } else if (requestData.type === 'course_access') {
      finalMessage = `🎓 Acesso liberado!\n\nOlá ${requestData.customerName || 'Cliente'},\n\nSeu acesso ao curso "${requestData.productName}" foi liberado!\n\n${requestData.memberAreaUrl ? `Acesse agora: ${requestData.memberAreaUrl}` : ''}\n\nBons estudos!`;
    } else if (requestData.type === 'payment_reminder') {
      finalMessage = `💰 Lembrete de pagamento\n\nOlá ${requestData.customerName || 'Cliente'},\n\nSeu pagamento está pendente.\n\n${requestData.referenceNumber ? `Referência: ${requestData.referenceNumber}` : ''}\n\nComplete seu pagamento para ter acesso ao produto "${requestData.productName}".`;
    }

    // Enviar SMS via Infobip
    const smsPayload = {
      messages: [
        {
          destinations: [
            {
              to: phoneNumber
            }
          ],
          from: requestData.from || 'Kambafy',
          text: finalMessage
        }
      ]
    };

    console.log('[SMS-NOTIFICATION] Sending SMS:', JSON.stringify(smsPayload, null, 2));

    const infobipResponse = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const responseData = await infobipResponse.json();
    console.log('[SMS-NOTIFICATION] Infobip response:', JSON.stringify(responseData, null, 2));

    if (!infobipResponse.ok) {
      console.error('[SMS-NOTIFICATION] Infobip API error:', responseData);
      throw new Error(`Infobip API error: ${responseData.requestError?.serviceException?.text || 'Unknown error'}`);
    }

    // Verificar se a mensagem foi aceita
    const message = responseData.messages?.[0];
    if (message?.status?.groupName === 'REJECTED') {
      console.error('[SMS-NOTIFICATION] Message rejected:', message.status);
      throw new Error(`Message rejected: ${message.status.description}`);
    }

    console.log('[SMS-NOTIFICATION] SMS sent successfully:', message?.messageId);

    return new Response(JSON.stringify({
      success: true,
      messageId: message?.messageId,
      status: message?.status,
      infobipResponse: responseData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('[SMS-NOTIFICATION] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json', 
        ...corsHeaders
      },
    });
  }
};

serve(handler);