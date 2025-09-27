import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const VONAGE_API_KEY = Deno.env.get('VONAGE_API_KEY');
const VONAGE_API_SECRET = Deno.env.get('VONAGE_API_SECRET');

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
    console.log('[SMS-NOTIFICATION] Vonage credentials check:', {
      hasApiKey: !!VONAGE_API_KEY,
      hasApiSecret: !!VONAGE_API_SECRET,
      apiKeyLength: VONAGE_API_KEY?.length || 0,
      apiSecretLength: VONAGE_API_SECRET?.length || 0
    });
    
    if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
      console.error('[SMS-NOTIFICATION] Vonage API credentials not configured');
      throw new Error('Vonage API credentials not configured');
    }

    const requestData: SMSNotificationRequest = await req.json();
    console.log('[SMS-NOTIFICATION] Request data:', JSON.stringify(requestData, null, 2));

    // Validar dados obrigatórios
    if (!requestData.to) {
      throw new Error('Phone number is required');
    }

    // Formatar número de telefone para Vonage
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

    // Preparar payload para Vonage SMS API
    const smsPayload = {
      from: requestData.from || 'Kambafy',
      to: phoneNumber,
      text: finalMessage
    };

    console.log('[SMS-NOTIFICATION] Sending SMS via Vonage:', JSON.stringify(smsPayload, null, 2));

    // Enviar SMS via Vonage
    const vonageResponse = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...smsPayload,
        api_key: VONAGE_API_KEY,
        api_secret: VONAGE_API_SECRET
      })
    });

    const responseData = await vonageResponse.json();
    console.log('[SMS-NOTIFICATION] Vonage response:', JSON.stringify(responseData, null, 2));

    if (!vonageResponse.ok) {
      console.error('[SMS-NOTIFICATION] Vonage API error:', responseData);
      throw new Error(`Vonage API error: ${responseData['error-text'] || 'Unknown error'}`);
    }

    // Verificar se a mensagem foi enviada com sucesso
    const message = responseData.messages?.[0];
    if (message?.status !== '0') {
      console.error('[SMS-NOTIFICATION] Message failed:', message);
      throw new Error(`Message failed: ${message['error-text'] || 'Unknown error'}`);
    }

    console.log('[SMS-NOTIFICATION] SMS sent successfully via Vonage:', message?.['message-id']);

    return new Response(JSON.stringify({
      success: true,
      messageId: message?.['message-id'],
      status: message?.status,
      vonageResponse: responseData
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