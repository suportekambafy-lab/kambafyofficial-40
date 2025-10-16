import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Admin toggle marketplace function loaded")

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { productId, isApproved, adminEmail } = await req.json()

    console.log('Toggle marketplace request:', { productId, isApproved, adminEmail })

    // Verificar se o usuário é admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('email', adminEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !adminData) {
      console.error('Admin não encontrado ou inativo:', adminError)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      )
    }

    console.log('Admin verificado:', adminData)

    // Atualizar o produto
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ admin_approved: isApproved })
      .eq('id', productId)

    if (updateError) {
      console.error('Erro ao atualizar produto:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Produto atualizado com sucesso')

    // Log da ação do admin
    await supabaseAdmin
      .from('admin_action_logs')
      .insert({
        admin_email: adminEmail,
        action: 'toggle_marketplace_visibility',
        target_type: 'product',
        target_id: productId,
        details: {
          admin_approved: isApproved,
          admin_id: adminData.id
        }
      })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})