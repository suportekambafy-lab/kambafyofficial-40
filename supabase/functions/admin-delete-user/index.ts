import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verificar autenticação via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Token de autenticação não fornecido')
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const adminJwtSecret = Deno.env.get('ADMIN_JWT_SECRET')

    if (!adminJwtSecret) {
      console.error('❌ ADMIN_JWT_SECRET não configurado')
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar e decodificar o JWT
    let payload: any
    try {
      const secret = new TextEncoder().encode(adminJwtSecret)
      const { payload: decoded } = await jose.jwtVerify(token, secret)
      payload = decoded
      console.log('✅ JWT verificado com sucesso:', payload.email)
    } catch (jwtError) {
      console.error('❌ Token JWT inválido:', jwtError)
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o usuário é admin
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

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, is_active, role')
      .eq('email', payload.email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ Usuário não é admin ou não está ativo:', payload.email)
      return new Response(
        JSON.stringify({ error: 'Acesso não autorizado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔐 Admin autenticado: ${adminUser.email} (${adminUser.role})`)

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log(`🗑️ Deletando usuário: ${userId}`)

    // Deletar o usuário usando a API de admin
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Erro ao deletar usuário:', error)
      throw error
    }

    console.log('✅ Usuário deletado com sucesso!')

    // Log da ação de admin
    await supabaseAdmin.from('admin_action_logs').insert({
      admin_email: adminUser.email,
      action: 'delete_user',
      target_type: 'user',
      target_id: userId,
      details: { deleted_by: adminUser.email, role: adminUser.role }
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário deletado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
