import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { referencePaymentId, transactionId } = await req.json()

    console.log('Verifying AppyPay payment:', { referencePaymentId, transactionId })

    if (!referencePaymentId && !transactionId) {
      throw new Error('Missing reference payment ID or transaction ID')
    }

    // Buscar o pagamento na nossa base de dados
    let query = supabase.from('reference_payments').select('*')
    
    if (referencePaymentId) {
      query = query.eq('id', referencePaymentId)
    } else {
      query = query.eq('appypay_transaction_id', transactionId)
    }

    const { data: referencePayment, error: dbError } = await query.single()

    if (dbError || !referencePayment) {
      throw new Error('Payment reference not found')
    }

    // Se já está pago, retornar status
    if (referencePayment.status === 'paid') {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'paid',
            paid_at: referencePayment.paid_at,
            reference_number: referencePayment.reference_number
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Verificar status no AppyPay
    const appyPayBaseUrl = Deno.env.get('APPYPAY_BASE_URL')
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET')

    if (!appyPayBaseUrl || !clientId || !clientSecret) {
      throw new Error('AppyPay configuration not found')
    }

    const verifyPayload = {
      client_id: clientId,
      client_secret: clientSecret,
      transaction_id: referencePayment.appypay_transaction_id
    }

    console.log('Checking payment status with AppyPay:', referencePayment.appypay_transaction_id)

    const appyPayResponse = await fetch(`${appyPayBaseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(verifyPayload)
    })

    if (!appyPayResponse.ok) {
      const errorText = await appyPayResponse.text()
      console.error('AppyPay verification error:', errorText)
      throw new Error(`AppyPay verification error: ${appyPayResponse.status}`)
    }

    const appyPayData = await appyPayResponse.json()
    console.log('AppyPay verification response:', appyPayData)

    // Atualizar status se necessário
    if (appyPayData.status === 'paid' && referencePayment.status !== 'paid') {
      const { error: updateError } = await supabase
        .from('reference_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          webhook_data: appyPayData
        })
        .eq('id', referencePayment.id)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
      } else {
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
        } else {
          console.log('Order created successfully for:', referencePayment.order_id)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: appyPayData.status,
          paid_at: appyPayData.paid_at || null,
          reference_number: referencePayment.reference_number,
          amount: referencePayment.amount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in verify-appypay-payment:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})