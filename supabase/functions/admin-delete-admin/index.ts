import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

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

    const { adminId, adminEmail } = await req.json()

    if (!adminId) {
      throw new Error('Admin ID is required')
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
