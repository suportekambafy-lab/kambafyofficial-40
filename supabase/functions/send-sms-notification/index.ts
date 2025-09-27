import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const INFOBIP_API_KEY = Deno.env.get('INFOBIP_API_KEY');
const INFOBIP_BASE_URL = Deno.env.get('INFOBIP_BASE_URL');

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
  entity?: string;
  amount?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[SMS-NOTIFICATION] Function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SMS-NOTIFICATION] Infobip credentials check:', {
      hasApiKey: !!INFOBIP_API_KEY,
      hasBaseUrl: !!INFOBIP_BASE_URL,
      apiKeyLength: INFOBIP_API_KEY?.length || 0,
      baseUrl: INFOBIP_BASE_URL,
      formattedUrl: INFOBIP_BASE_URL ? (INFOBIP_BASE_URL.startsWith('http') ? INFOBIP_BASE_URL : `https://${INFOBIP_BASE_URL}`) : 'N/A'
    });
    
    if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
      console.error('[SMS-NOTIFICATION] Infobip API credentials not configured');
      throw new Error('Infobip API credentials not configured');
    }

    const requestData: SMSNotificationRequest = await req.json();
    console.log('[SMS-NOTIFICATION] Request data:', JSON.stringify(requestData, null, 2));

    // Validar dados obrigatórios
    if (!requestData.to) {
      throw new Error('Phone number is required');
    }

    // Formatar número de telefone para Infobip
    let phoneNumber = requestData.to.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
    
    // Se não começar com código do país, assumir Angola (+244)
    if (!phoneNumber.startsWith('244') && phoneNumber.length === 9) {
      phoneNumber = '244' + phoneNumber;
    }

    console.log('[SMS-NOTIFICATION] Formatted phone:', phoneNumber);

    // Preparar mensagem baseada no tipo
    let finalMessage = requestData.message;
    
    if (requestData.type === 'purchase_confirmation') {
      finalMessage = `Compra confirmada!\n\nOla ${requestData.customerName || 'Cliente'},\n\nSua compra do produto "${requestData.productName}" foi confirmada com sucesso!\n\n${requestData.memberAreaUrl ? `Acesse seu curso: ${requestData.memberAreaUrl}` : ''}\n\nObrigado por escolher a Kambafy!`;
    } else if (requestData.type === 'course_access') {
      finalMessage = `Acesso liberado!\n\nOla ${requestData.customerName || 'Cliente'},\n\nSeu acesso ao curso "${requestData.productName}" foi liberado!\n\n${requestData.memberAreaUrl ? `Acesse agora: ${requestData.memberAreaUrl}` : ''}\n\nBons estudos!`;
    } else if (requestData.type === 'payment_reminder') {
      finalMessage = `Lembrete de pagamento\n\nOla ${requestData.customerName || 'Cliente'},\n\nSeu pagamento esta pendente.\n\nEntidade: ${requestData.entity || 'N/A'}\nReferencia: ${requestData.referenceNumber || 'N/A'}\nValor: ${requestData.amount || 'N/A'} KZ\n\nComplete seu pagamento para ter acesso ao produto "${requestData.productName}".`;
    }

    // Preparar payload para Infobip SMS API
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

    // Preparar URL base para Infobip
    const baseUrl = INFOBIP_BASE_URL?.startsWith('http') ? INFOBIP_BASE_URL : `https://${INFOBIP_BASE_URL}`;

    console.log('[SMS-NOTIFICATION] Sending SMS via Infobip:', JSON.stringify(smsPayload, null, 2));
    console.log('[SMS-NOTIFICATION] Full URL:', `${baseUrl}/sms/2/text/advanced`);
    console.log('[SMS-NOTIFICATION] Headers:', {
      'Authorization': `App ${INFOBIP_API_KEY}`,
      'Content-Type': 'application/json'
    });

    // Enviar SMS via Infobip
    const infobipResponse = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(smsPayload)
    });

    const responseData = await infobipResponse.json();
    console.log('[SMS-NOTIFICATION] Infobip response:', JSON.stringify(responseData, null, 2));

    if (!infobipResponse.ok) {
      console.error('[SMS-NOTIFICATION] Infobip API error:', responseData);
      throw new Error(`Infobip API error: ${responseData.requestError?.serviceException?.text || 'Unknown error'}`);
    }

    // Verificar se a mensagem foi enviada com sucesso
    const message = responseData.messages?.[0];
    if (message?.status?.groupId !== 1) {
      console.error('[SMS-NOTIFICATION] Message failed:', message);
      throw new Error(`Message failed: ${message?.status?.description || 'Unknown error'}`);
    }

    console.log('[SMS-NOTIFICATION] SMS sent successfully via Infobip:', message?.messageId);

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