import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'express' | 'reference';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  
  // Para Express (obrigatório se paymentMethod === 'express')
  phoneNumber?: string;
}

interface GetOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.replace('/kambafy-payments-api', '');
  const method = req.method;

  try {
    // Inicializar Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autenticar via API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar parceiro
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('api_key', apiKey)
      .eq('status', 'approved')
      .single();

    if (partnerError || !partner) {
      await logApiUsage(supabaseAdmin, null, path, method, 401, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rotas
    if (method === 'POST' && (path === '' || path === '/')) {
      return await createPayment(req, partner, supabaseAdmin, startTime);
    }

    if (method === 'GET' && path.startsWith('/payment/')) {
      const paymentId = path.replace('/payment/', '');
      return await getPayment(paymentId, partner, supabaseAdmin, startTime);
    }

    if (method === 'GET' && path === '/payments') {
      return await listPayments(req, partner, supabaseAdmin, startTime);
    }

    await logApiUsage(supabaseAdmin, partner.id, path, method, 404, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: 'Endpoint not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createPayment(
  req: Request,
  partner: any,
  supabaseAdmin: any,
  startTime: number
) {
  try {
    const body: CreatePaymentRequest = await req.json();
    const { orderId, amount, currency = 'AOA', paymentMethod, customerName, customerEmail, customerPhone, metadata, phoneNumber } = body;

    // Validações
    if (!orderId || !amount || !paymentMethod || !customerName || !customerEmail) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          code: 'VALIDATION_ERROR',
          required: ['orderId', 'amount', 'paymentMethod', 'customerName', 'customerEmail']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentMethod === 'express' && !phoneNumber) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'phoneNumber is required for express payments', 
          code: 'VALIDATION_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount <= 0) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 400, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ error: 'Amount must be greater than 0', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se orderId já existe
    const { data: existing } = await supabaseAdmin
      .from('external_payments')
      .select('id, status')
      .eq('partner_id', partner.id)
      .eq('order_id', orderId)
      .single();

    if (existing) {
      await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 409, Date.now() - startTime, req);
      return new Response(
        JSON.stringify({ 
          error: 'Order ID already exists', 
          code: 'DUPLICATE_ORDER_ID',
          existingPayment: {
            id: existing.id,
            status: existing.status
          }
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obter token OAuth AppyPay
    const oauthToken = await getAppyPayOAuthToken();

    // Criar cobrança com AppyPay
    const appypayResponse = await createAppyPayCharge(oauthToken, {
      amount,
      paymentMethod,
      phoneNumber,
      customerName,
      customerEmail,
      orderId,
    });

    // Definir expiração
    const expiresAt = paymentMethod === 'express'
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()  // 5 minutos
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();  // 48 horas

    // Salvar no banco
    const { data: payment, error: insertError } = await supabaseAdmin
      .from('external_payments')
      .insert({
        partner_id: partner.id,
        order_id: orderId,
        amount,
        currency,
        payment_method: paymentMethod,
        status: 'pending',
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: phoneNumber || customerPhone,
        appypay_transaction_id: appypayResponse.transactionId,
        reference_entity: appypayResponse.entity,
        reference_number: appypayResponse.reference,
        expires_at: expiresAt,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw new Error('Failed to save payment');
    }

    await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 201, Date.now() - startTime, req);

    // Resposta
    const response: any = {
      id: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      expiresAt: payment.expires_at,
      createdAt: payment.created_at,
    };

    if (paymentMethod === 'express') {
      response.instructions = {
        message: `Um código USSD foi enviado para ${phoneNumber}. O cliente deve digitar o código no telefone para confirmar o pagamento.`,
        transactionId: payment.appypay_transaction_id,
        expiresIn: '5 minutos',
      };
    } else if (paymentMethod === 'reference') {
      response.reference = {
        entity: payment.reference_entity,
        reference: payment.reference_number,
        instructions: `Pague em qualquer ATM Multicaixa usando:\nEntidade: ${payment.reference_entity}\nReferência: ${payment.reference_number}`,
        expiresIn: '48 horas',
      };
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Create payment error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/create-payment', 'POST', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment', code: 'CREATE_PAYMENT_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getPayment(paymentId: string, partner: any, supabaseAdmin: any, startTime: number) {
  try {
    const { data: payment, error } = await supabaseAdmin
      .from('external_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('partner_id', partner.id)
      .single();

    if (error || !payment) {
      await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 404, Date.now() - startTime, null);
      return new Response(
        JSON.stringify({ error: 'Payment not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 200, Date.now() - startTime, null);

    const response: any = {
      id: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      customerName: payment.customer_name,
      customerEmail: payment.customer_email,
      customerPhone: payment.customer_phone,
      transactionId: payment.appypay_transaction_id,
      expiresAt: payment.expires_at,
      completedAt: payment.completed_at,
      createdAt: payment.created_at,
      metadata: payment.metadata,
    };

    if (payment.payment_method === 'reference') {
      response.reference = {
        entity: payment.reference_entity,
        reference: payment.reference_number,
      };
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Get payment error:', error);
    await logApiUsage(supabaseAdmin, partner.id, `/payment/${paymentId}`, 'GET', 500, Date.now() - startTime, null);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to get payment', code: 'GET_PAYMENT_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listPayments(req: Request, partner: any, supabaseAdmin: any, startTime: number) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('external_payments')
      .select('*', { count: 'exact' })
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error, count } = await query;

    if (error) {
      throw error;
    }

    await logApiUsage(supabaseAdmin, partner.id, '/payments', 'GET', 200, Date.now() - startTime, req);

    return new Response(
      JSON.stringify({
        data: payments.map((p: any) => ({
          id: p.id,
          orderId: p.order_id,
          status: p.status,
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.payment_method,
          customerName: p.customer_name,
          customerEmail: p.customer_email,
          transactionId: p.appypay_transaction_id,
          completedAt: p.completed_at,
          createdAt: p.created_at,
        })),
        pagination: {
          total: count,
          limit,
          offset,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ List payments error:', error);
    await logApiUsage(supabaseAdmin, partner.id, '/payments', 'GET', 500, Date.now() - startTime, req);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to list payments', code: 'LIST_PAYMENTS_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper: Obter OAuth token do AppyPay
async function getAppyPayOAuthToken(): Promise<string> {
  const clientId = Deno.env.get('APPYPAY_CLIENT_ID');
  const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET');
  const resource = Deno.env.get('APPYPAY_RESOURCE') || 'https://gwy-api.appypay.co.ao/';

  if (!clientId || !clientSecret) {
    throw new Error('AppyPay credentials not configured');
  }

  const tokenUrl = 'https://login.microsoftonline.com/auth.appypay.co.ao/oauth2/token';
  const tokenParams = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    resource: resource
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OAuth error:', errorText);
    throw new Error(`Failed to get OAuth token: ${response.status}`);
  }

  const data: GetOAuthTokenResponse = await response.json();
  return data.access_token;
}

// Helper: Criar cobrança AppyPay (Express ou Reference)
async function createAppyPayCharge(token: string, data: {
  amount: number;
  paymentMethod: 'express' | 'reference';
  phoneNumber?: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
}) {
  // Gerar merchantTransactionId (máx 15 chars alfanuméricos)
  const now = new Date();
  const timestamp = now.getDate().toString().padStart(2, '0') + 
                   now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  const merchantTxId = `TR${timestamp}${randomSuffix}`;

  const payload: any = {
    amount: data.amount,
    currency: 'AOA',
    description: `Payment for order ${data.orderId}`,
    merchantTransactionId: merchantTxId,
    paymentMethod: data.paymentMethod === 'express' 
      ? 'GPO_b1cfa3d3-f34a-4cfa-bcff-d52829991567'
      : 'REF_96ee61a9-e9ff-4030-8be6-0b775e847e5f'
  };

  // Adicionar phoneNumber para Express
  if (data.paymentMethod === 'express' && data.phoneNumber) {
    payload.paymentInfo = { phoneNumber: data.phoneNumber };
  }

  const response = await fetch('https://gwy-api.appypay.co.ao/v2.0/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'pt-BR'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ AppyPay charge error:', errorText);
    throw new Error(`Failed to create AppyPay charge: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // Estrutura de resposta da AppyPay v2.0
  return {
    transactionId: result.id,
    entity: result.responseStatus?.reference?.entity || null,
    reference: result.responseStatus?.reference?.referenceNumber || null,
  };
}

// Helper: Log de uso da API
async function logApiUsage(
  supabaseAdmin: any,
  partnerId: string | null,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  req: Request | null
) {
  try {
    await supabaseAdmin.from('api_usage_logs').insert({
      partner_id: partnerId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTime,
      ip_address: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip'),
      user_agent: req?.headers.get('user-agent'),
    });
  } catch (error) {
    console.error('⚠️ Failed to log API usage:', error);
  }
}
