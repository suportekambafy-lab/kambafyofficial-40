
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { 
      amount, 
      productId, 
      customerData, 
      orderId 
    } = requestBody;

    console.log('Creating reference payment:', { amount, productId, customerData, orderId });

    if (!amount || !productId || !customerData || !orderId) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar informações do produto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      throw new Error('Produto não encontrado');
    }

    // Criar pagamento via AppyPay API
    const appyPayData = {
      merchant_name: "Kambafy - Comércio e Serviços",
      amount: amount / 100, // AppyPay usa valores decimais
      currency: "AOA",
      description: `Compra de ${product.name}`,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      order_id: orderId,
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/appypay-webhook`,
      return_url: `${req.headers.get('origin')}/obrigado?order=${orderId}`,
    };

    console.log('Creating AppyPay charge:', appyPayData);

    const appyPayResponse = await fetch('https://api.appypay.co.ao/v1/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer kVo8Q~-e~OxZrzFzcrsLdLrINrRGYvow_7DTEdsJ`,
        'X-Client-Id': '47d451f4-2f6d-4032-ab13-3ab70c5d8298',
      },
      body: JSON.stringify(appyPayData)
    });

    if (!appyPayResponse.ok) {
      const errorText = await appyPayResponse.text();
      console.error('AppyPay API error:', errorText);
      throw new Error('Erro ao criar pagamento por referência');
    }

    const appyPayResult = await appyPayResponse.json();
    console.log('AppyPay response:', appyPayResult);

    // Salvar ordem no banco com status "pending"
    const orderData = {
      product_id: productId,
      order_id: orderId,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      amount: (amount / 100).toString(),
      currency: 'KZ',
      payment_method: 'reference',
      status: 'pending',
      user_id: product.user_id,
      appypay_charge_id: appyPayResult.id,
      appypay_reference: appyPayResult.reference
    };

    console.log('Saving order:', orderData);

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orderData);

    if (orderError) {
      console.error('Erro ao salvar ordem:', orderError);
      throw new Error('Erro ao salvar pedido');
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference: appyPayResult.reference,
        amount: amount / 100,
        order_id: orderId,
        payment_url: appyPayResult.payment_url,
        instructions: appyPayResult.instructions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na criação do pagamento por referência:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
