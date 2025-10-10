import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, productId, productPrice, customerName, customerPhone } = await req.json();

    console.log('Processing KambaPay payment:', { email, productId, productPrice });

    // 1. Verificar se o email tem saldo suficiente
    const { data: balance, error: balanceError } = await supabaseAdmin
      .from('customer_balances')
      .select('*')
      .eq('email', email)
      .single();

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ 
          error: 'Email não encontrado no KambaPay ou sem saldo', 
          code: 'INVALID_EMAIL' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (balance.balance < productPrice) {
      return new Response(
        JSON.stringify({ 
          error: 'Saldo insuficiente', 
          availableBalance: balance.balance,
          requiredAmount: productPrice,
          code: 'INSUFFICIENT_BALANCE' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Buscar informações do produto
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Criar o pedido
    const orderId = `KAMBAPAY_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Calcular seller_commission com desconto de 8%
    const grossAmount = productPrice;
    const sellerCommission = grossAmount * 0.92; // 8% platform fee
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        order_id: orderId,
        product_id: productId,
        customer_email: email,
        customer_name: customerName || 'Cliente KambaPay',
        customer_phone: customerPhone || null,
        amount: grossAmount.toString(),
        currency: 'KZ',
        payment_method: 'kambapay',
        status: 'completed',
        user_id: null, // Anonymous checkout - user_id should be null
        seller_commission: sellerCommission // 8% platform fee
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pedido' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Debitar o saldo
    const newBalance = balance.balance - productPrice;
    
    const { error: balanceUpdateError } = await supabaseAdmin
      .from('customer_balances')
      .update({ balance: newBalance })
      .eq('email', email);

    if (balanceUpdateError) {
      console.error('Error updating balance:', balanceUpdateError);
      // Reverter o pedido se falhar ao debitar
      await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', order.id);
        
      return new Response(
        JSON.stringify({ error: 'Erro ao processar pagamento' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Criar transação de débito
    const { error: transactionError } = await supabaseAdmin
      .from('balance_transactions')
      .insert([{
        user_id: null,
        email: email,
        type: 'debit',
        amount: productPrice,
        description: `Compra de ${product.name}`,
        order_id: orderId,
        currency: 'KZ'
      }]);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    // 6. Adicionar saldo ao vendedor (se aplicável)
    if (product.user_id) {
      // Buscar ou criar saldo do vendedor
      const { data: sellerBalance } = await supabaseAdmin
        .from('customer_balances')
        .select('*')
        .eq('user_id', product.user_id)
        .maybeSingle();

      if (sellerBalance) {
        // Atualizar saldo existente
        await supabaseAdmin
          .from('customer_balances')
          .update({ balance: sellerBalance.balance + productPrice })
          .eq('user_id', product.user_id);
      } else {
        // Criar novo saldo para o vendedor
        await supabaseAdmin
          .from('customer_balances')
          .insert([{
            user_id: product.user_id,
            balance: productPrice,
            currency: 'KZ'
          }]);
      }

      // Criar transação de crédito para o vendedor
      await supabaseAdmin
        .from('balance_transactions')
        .insert([{
          user_id: product.user_id,
          type: 'credit',
          amount: productPrice,
          description: `Venda de ${product.name} via KambaPay`,
          order_id: orderId,
          currency: 'KZ'
        }]);
    }

    console.log('KambaPay payment processed successfully:', orderId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId,
        transactionId: orderId,
        newBalance
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing KambaPay payment:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});