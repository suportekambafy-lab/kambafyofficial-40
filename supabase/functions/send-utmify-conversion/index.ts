import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Taxa de câmbio KZ para USD (aproximada)
const KZ_TO_USD_RATE = 920; // 1 USD = 920 KZ

interface OrderData {
  orderId: string;
  orderUuid: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCountry?: string;
  productId: string;
  productName: string;
  paymentMethod: string;
  utmParams?: {
    src?: string;
    sck?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  orderBumpData?: {
    bump_product_name?: string;
    bump_product_price?: string;
    discounted_price?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orderData: OrderData = await req.json();

    console.log('📤 Processando envio UTMify para ordem:', orderData.orderId);

    // Buscar configuração UTMify do produto
    const { data: utmifySettings, error: settingsError } = await supabase
      .from('utmify_settings')
      .select('*')
      .eq('product_id', orderData.productId)
      .eq('enabled', true)
      .single();

    if (settingsError || !utmifySettings) {
      console.log('ℹ️ UTMify não está habilitado para este produto');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'UTMify not enabled for this product' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ UTMify habilitado, preparando payload...');

    // Converter valor para USD (em centavos)
    let amountInCents: number;
    const amount = parseFloat(orderData.amount.toString());

    if (orderData.currency?.toUpperCase() === 'KZ') {
      // Converter KZ para USD e depois para centavos
      const amountInUSD = amount / KZ_TO_USD_RATE;
      amountInCents = Math.round(amountInUSD * 100);
      console.log(`💱 Conversão: ${amount} KZ → $${(amountInCents / 100).toFixed(2)} USD`);
    } else if (orderData.currency?.toUpperCase() === 'EUR') {
      // Converter EUR para USD (aproximado 1 EUR = 1.08 USD)
      const amountInUSD = amount * 1.08;
      amountInCents = Math.round(amountInUSD * 100);
    } else if (orderData.currency?.toUpperCase() === 'USD') {
      amountInCents = Math.round(amount * 100);
    } else {
      // Para outras moedas, assumir que já está em USD
      amountInCents = Math.round(amount * 100);
    }

    // Garantir valor mínimo de 1 centavo
    if (amountInCents < 1) {
      amountInCents = 1;
    }

    // Mapear método de pagamento para formato UTMify
    const paymentMethodMap: Record<string, string> = {
      'express': 'pix',
      'transfer': 'bank_transfer',
      'bank_transfer': 'bank_transfer',
      'transferencia': 'bank_transfer',
      'multicaixa': 'pix',
      'reference': 'boleto',
      'card': 'credit_card',
      'stripe': 'credit_card',
      'multibanco': 'boleto'
    };

    const mappedPaymentMethod = paymentMethodMap[orderData.paymentMethod?.toLowerCase()] || 'other';

    // Preparar produtos (incluindo order bump se existir)
    const products = [{
      id: orderData.productId,
      name: orderData.productName,
      planId: orderData.productId, // Requerido pela UTMify
      planName: orderData.productName, // Requerido pela UTMify
      quantity: 1,
      priceInCents: amountInCents
    }];

    // Adicionar order bump como produto separado
    if (orderData.orderBumpData?.bump_product_name) {
      let bumpPriceInCents = 0;
      if (orderData.orderBumpData.discounted_price) {
        const bumpPriceKZ = orderData.orderBumpData.discounted_price;
        bumpPriceInCents = Math.round((bumpPriceKZ / KZ_TO_USD_RATE) * 100);
      } else if (orderData.orderBumpData.bump_product_price) {
        const priceStr = orderData.orderBumpData.bump_product_price.replace(/[^\d.,]/g, '').replace(',', '.');
        const bumpPriceKZ = parseFloat(priceStr) || 0;
        bumpPriceInCents = Math.round((bumpPriceKZ / KZ_TO_USD_RATE) * 100);
      }

      if (bumpPriceInCents > 0) {
        const bumpId = `${orderData.productId}-bump`;
        products.push({
          id: bumpId,
          name: orderData.orderBumpData.bump_product_name,
          planId: bumpId, // Requerido pela UTMify
          planName: orderData.orderBumpData.bump_product_name, // Requerido pela UTMify
          quantity: 1,
          priceInCents: bumpPriceInCents
        });
      }
    }

    // Calcular total
    const totalPriceInCents = products.reduce((sum, p) => sum + p.priceInCents, 0);

    // Preparar payload UTMify
    const utmifyPayload = {
      orderId: orderData.orderId,
      platform: 'kambafy',
      paymentMethod: mappedPaymentMethod,
      status: 'paid',
      createdAt: new Date().toISOString(),
      approvedDate: new Date().toISOString(),
      refundedAt: null,
      customer: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        phone: orderData.customerPhone || null,
        document: null,
        country: orderData.customerCountry || 'AO'
      },
      products: products,
      trackingParameters: {
        src: orderData.utmParams?.src || null,
        sck: orderData.utmParams?.sck || null,
        utm_source: orderData.utmParams?.utm_source || null,
        utm_medium: orderData.utmParams?.utm_medium || null,
        utm_campaign: orderData.utmParams?.utm_campaign || null,
        utm_content: orderData.utmParams?.utm_content || null,
        utm_term: orderData.utmParams?.utm_term || null
      },
      commission: {
        totalPriceInCents: totalPriceInCents,
        gatewayFeeInCents: 0,
        userCommissionInCents: totalPriceInCents,
        currency: 'USD'
      },
      isTest: false
    };

    console.log('📤 Enviando para UTMify:', JSON.stringify(utmifyPayload, null, 2));

    // Enviar para UTMify
    const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': utmifySettings.api_token
      },
      body: JSON.stringify(utmifyPayload)
    });

    const responseText = await response.text();
    console.log('📥 Resposta UTMify:', response.status, responseText);

    if (!response.ok) {
      console.error('❌ Erro ao enviar para UTMify:', response.status, responseText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `UTMify API error: ${response.status}`,
        details: responseText
      }), {
        status: 200, // Retornar 200 para não falhar o fluxo principal
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('✅ Conversão enviada para UTMify com sucesso');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Conversion sent to UTMify',
      data: responseData,
      convertedAmount: {
        originalAmount: amount,
        originalCurrency: orderData.currency,
        usdCents: totalPriceInCents,
        usdDollars: (totalPriceInCents / 100).toFixed(2)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no send-utmify-conversion:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200, // Retornar 200 para não falhar o fluxo principal
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
