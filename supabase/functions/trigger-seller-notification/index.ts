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

    const { notification_id, user_id, title, message, order_id, amount, currency } = await req.json()

    console.log('🔔 [Trigger Seller Notification] Iniciando envio de notificação...')
    console.log('📊 [Trigger Seller Notification] Dados:', { notification_id, user_id, title, order_id })

    // Buscar player_id do vendedor
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('onesignal_player_id')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      console.error('❌ [Trigger Seller Notification] Erro ao buscar perfil:', profileError)
      throw new Error(`Erro ao buscar perfil do vendedor: ${profileError.message}`)
    }

    if (!profile?.onesignal_player_id) {
      console.warn('⚠️ [Trigger Seller Notification] Vendedor sem player_id registrado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Vendedor não tem OneSignal player_id registrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ [Trigger Seller Notification] Player ID encontrado:', profile.onesignal_player_id)

    // Chamar função de envio de notificação OneSignal
    const { data: notificationResult, error: notificationError } = await supabaseClient.functions.invoke(
      'send-onesignal-notification',
      {
        body: {
          player_id: profile.onesignal_player_id,
          user_id: user_id,
          title: title,
          message: message,
          data: {
            type: 'new_sale',
            order_id: order_id,
            amount: amount,
            currency: currency,
            notification_id: notification_id
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
        player_id: profile.onesignal_player_id,
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
