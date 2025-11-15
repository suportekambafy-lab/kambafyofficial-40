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

    const { userId } = await req.json()

    console.log('🧪 Criando notificação de teste para:', userId)

    // Criar notificação de teste
    const { data, error } = await supabaseClient
      .from('seller_notifications')
      .insert({
        user_id: userId,
        type: 'new_sale',
        title: '🎉 Nova Venda de Teste!',
        message: 'Teste do sistema de notificações em tempo real',
        data: {
          product_name: 'Produto Teste',
          amount: '15000',
          currency: 'KZ',
          customer_name: 'Cliente Teste',
          customer_email: 'teste@kambafy.com'
        }
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('✅ Notificação de teste criada:', data.id)

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})