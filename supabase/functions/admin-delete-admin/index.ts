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

    // Verificar se o chamador é admin ativo com role super_admin
    const { data: callerAdmin, error: callerError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, is_active, role')
      .eq('email', payload.email)
      .eq('is_active', true)
      .single()

    if (callerError || !callerAdmin) {
      console.error('❌ Chamador não é admin ou não está ativo:', payload.email)
      return new Response(
        JSON.stringify({ error: 'Acesso não autorizado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Apenas super_admin pode deletar outros admins
    if (callerAdmin.role !== 'super_admin') {
      console.error('❌ Apenas super_admin pode deletar admins:', callerAdmin.email)
      return new Response(
        JSON.stringify({ error: 'Apenas super administradores podem deletar admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔐 Super admin autenticado: ${callerAdmin.email}`)

    const { adminId, adminEmail } = await req.json()

    if (!adminId) {
      throw new Error('Admin ID is required')
    }

    // Impedir que o admin delete a si mesmo
    if (adminId === callerAdmin.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode deletar sua própria conta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🗑️ Deletando admin: ${adminId} (${adminEmail})`)

    // 1. Deletar da tabela admin_users
    const { error: deleteAdminError } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('id', adminId)

    if (deleteAdminError) {
      console.error('❌ Erro ao deletar admin_users:', deleteAdminError)
      throw deleteAdminError
    }

    console.log('✅ Admin deletado da tabela admin_users')

    // 2. Buscar usuário no auth.users pelo email
    if (adminEmail) {
      const { data: authUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (searchError) {
        console.error('⚠️ Erro ao buscar usuários:', searchError)
      } else {
        const authUser = authUsers.users.find(u => u.email === adminEmail)
        
        if (authUser) {
          console.log(`🔍 Encontrado usuário no auth: ${authUser.id}`)
          
          // Deletar do auth.users
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)
          
          if (deleteAuthError) {
            console.error('⚠️ Erro ao deletar do auth.users:', deleteAuthError)
          } else {
            console.log('✅ Usuário deletado do auth.users')
          }
        } else {
          console.log('ℹ️ Usuário não encontrado no auth.users')
        }
      }
    }

    // Log da ação de admin
    await supabaseAdmin.from('admin_action_logs').insert({
      admin_email: callerAdmin.email,
      action: 'delete_admin',
      target_type: 'admin',
      target_id: adminId,
      details: { 
        deleted_admin_email: adminEmail,
        deleted_by: callerAdmin.email, 
        role: callerAdmin.role 
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin deletado com sucesso' 
      }),
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
