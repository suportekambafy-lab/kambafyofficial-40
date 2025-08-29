import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookData = await req.json()
    console.log('Received AppyPay webhook:', webhookData)

    // Validar webhook (você pode adicionar validação de assinatura aqui)
    const { transaction_id, status, reference_number, amount, paid_at } = webhookData

    if (!transaction_id) {
      throw new Error('Missing transaction_id in webhook')
    }

    // Buscar o pagamento na nossa base de dados
    const { data: referencePayment, error: dbError } = await supabase
      .from('reference_payments')
      .select('*')
      .eq('appypay_transaction_id', transaction_id)
      .single()

    if (dbError || !referencePayment) {
      console.error('Payment reference not found for transaction:', transaction_id)
      throw new Error('Payment reference not found')
    }

    console.log('Found reference payment:', referencePayment.id)

    // Atualizar status do pagamento se mudou para 'paid'
    if (status === 'paid' && referencePayment.status !== 'paid') {
      // Atualizar referência de pagamento
      const { error: updateError } = await supabase
        .from('reference_payments')
        .update({
          status: 'paid',
          paid_at: paid_at || new Date().toISOString(),
          webhook_data: webhookData
        })
        .eq('id', referencePayment.id)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
        throw updateError
      }

      console.log('Payment status updated to paid:', referencePayment.id)

      // Criar o pedido na tabela orders
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          order_id: referencePayment.order_id,
          product_id: referencePayment.product_id,
          customer_email: referencePayment.customer_email,
          customer_name: referencePayment.customer_name,
          customer_phone: referencePayment.customer_phone,
          amount: referencePayment.amount.toString(),
          currency: referencePayment.currency,
          payment_method: 'reference',
          status: 'completed'
        })

      if (orderError) {
        console.error('Error creating order:', orderError)
        // Não fazer throw aqui para não afetar o webhook
      } else {
        console.log('Order created successfully for:', referencePayment.order_id)

        // Enviar email de confirmação (opcional)
        try {
          await supabase.functions.invoke('send-purchase-confirmation', {
            body: {
              order_id: referencePayment.order_id,
              customer_email: referencePayment.customer_email,
              customer_name: referencePayment.customer_name,
              product_id: referencePayment.product_id,
              amount: referencePayment.amount,
              payment_method: 'Pagamento por Referência'
            }
          })
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError)
          // Não fazer throw para não afetar o webhook
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in AppyPay webhook:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})