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

    const { 
      productId, 
      customerEmail, 
      customerName, 
      customerPhone, 
      amount, 
      orderId 
    } = await req.json()

    console.log('Creating AppyPay reference for order:', orderId)

    // Validar dados obrigatórios
    if (!productId || !customerEmail || !customerName || !amount || !orderId) {
      throw new Error('Missing required fields')
    }

    // Buscar configurações AppyPay
    const appyPayBaseUrl = Deno.env.get('APPYPAY_BASE_URL')
    const clientId = Deno.env.get('APPYPAY_CLIENT_ID')
    const clientSecret = Deno.env.get('APPYPAY_CLIENT_SECRET')

    if (!appyPayBaseUrl || !clientId || !clientSecret) {
      throw new Error('AppyPay configuration not found')
    }

    // Preparar dados para AppyPay
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 horas para expirar

    const appyPayPayload = {
      client_id: clientId,
      client_secret: clientSecret,
      amount: parseFloat(amount),
      currency: 'KZ',
      reference: `REF-${orderId}`,
      description: `Pagamento do pedido ${orderId}`,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone,
      expires_at: expiresAt.toISOString()
    }

    console.log('Sending request to AppyPay:', { ...appyPayPayload, client_secret: '[HIDDEN]' })

    // Criar referência no AppyPay
    const appyPayResponse = await fetch(`${appyPayBaseUrl}/api/references/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(appyPayPayload)
    })

    if (!appyPayResponse.ok) {
      const errorText = await appyPayResponse.text()
      console.error('AppyPay API error:', errorText)
      throw new Error(`AppyPay API error: ${appyPayResponse.status} - ${errorText}`)
    }

    const appyPayData = await appyPayResponse.json()
    console.log('AppyPay response:', appyPayData)

    // Salvar referência na nossa base de dados
    const { data: referencePayment, error: dbError } = await supabase
      .from('reference_payments')
      .insert({
        order_id: orderId,
        product_id: productId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        amount: parseFloat(amount),
        currency: 'KZ',
        reference_number: appyPayData.reference_number,
        appypay_transaction_id: appyPayData.transaction_id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        webhook_data: appyPayData
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    console.log('Reference payment created:', referencePayment.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference_payment_id: referencePayment.id,
          reference_number: appyPayData.reference_number,
          transaction_id: appyPayData.transaction_id,
          amount: parseFloat(amount),
          currency: 'KZ',
          expires_at: expiresAt.toISOString(),
          payment_instructions: appyPayData.payment_instructions || 'Use a referência para fazer o pagamento'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in create-appypay-reference:', error)
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