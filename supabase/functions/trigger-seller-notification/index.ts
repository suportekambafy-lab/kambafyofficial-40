import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { notification_id, user_id, title, message, order_id, amount, currency, seller_commission } = await req.json()

    console.log('🔔 [Trigger Seller Notification] Iniciando envio de notificação...')
    console.log('📊 [Trigger Seller Notification] Dados:', { notification_id, user_id, order_id, seller_commission, amount, currency })

    // Buscar email do vendedor para usar como external_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      console.error('❌ [Trigger Seller Notification] Erro ao buscar perfil:', profileError)
      throw new Error(`Erro ao buscar perfil do vendedor: ${profileError.message}`)
    }

    if (!profile?.email) {
      console.warn('⚠️ [Trigger Seller Notification] Vendedor sem email registrado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Vendedor não tem email registrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [Trigger Seller Notification] Email encontrado:', profile.email)

    // Calcular comissão (usar seller_commission se disponível, senão usar amount)
    const commission = seller_commission || amount;

    // Helper para formatar preço como no dashboard
    const formatPrice = (amount: number, currency: string = 'KZ'): string => {
      let amountInKZ = amount;
      
      if (currency.toUpperCase() !== 'KZ') {
        const exchangeRates: Record<string, number> = {
          'EUR': 1100,
          'MZN': 14.3
        };
        const rate = exchangeRates[currency.toUpperCase()] || 1;
        amountInKZ = Math.round(amount * rate);
      }
      
      return `${parseFloat(amountInKZ.toString()).toLocaleString('pt-BR')} KZ`;
    };

    const formattedPrice = formatPrice(commission, currency);

    // Chamar função de envio de notificação OneSignal
    const { data: notificationResult, error: notificationError } = await supabaseClient.functions.invoke(
      'send-onesignal-notification',
      {
        body: {
          external_id: profile.email,
          title: 'Kambafy - Venda aprovada',
          message: `Sua comissão: ${formattedPrice}`,
          data: {
            type: 'sale',
            order_id: order_id,
            amount: amount,
            seller_commission: commission,
            currency: currency,
            notification_id: notification_id,
            url: 'https://mobile.kambafy.com/app'
          }
        }
      }
    )

    if (notificationError) {
      console.error('❌ [Trigger Seller Notification] Erro ao enviar notificação:', notificationError)
      throw notificationError
    }

    console.log('✅ [Trigger Seller Notification] Notificação enviada com sucesso!')
    console.log('📤 [Trigger Seller Notification] Resultado:', notificationResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id,
        external_id: profile.email,
        result: notificationResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ [Trigger Seller Notification] Erro crítico:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
