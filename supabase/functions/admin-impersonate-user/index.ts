import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const { targetUserId, adminEmail } = await req.json()

    if (!targetUserId || !adminEmail) {
      throw new Error('targetUserId and adminEmail são obrigatórios')
    }

    console.log(`🎭 Admin ${adminEmail} tentando impersonar usuário: ${targetUserId}`)

    // 1. Verificar se quem está fazendo a requisição é admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, is_active')
      .eq('email', adminEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ Admin não autorizado:', adminError)
      throw new Error('Acesso negado: Privilégios de admin necessários')
    }

    // 2. Buscar dados do usuário alvo
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (userError || !targetUser) {
      console.error('❌ Usuário não encontrado:', userError)
      throw new Error('Usuário não encontrado')
    }

    console.log(`✅ Usuário encontrado: ${targetUser.user.email}`)

    // 3. Gerar sessão administrativa para o usuário alvo
    // Isso cria um access token válido para o usuário sem precisar da senha
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email!,
    })

    if (sessionError || !sessionData) {
      console.error('❌ Erro ao gerar link mágico:', sessionError)
      throw new Error('Erro ao criar sessão de impersonation')
    }

    console.log(`✅ Sessão de impersonation criada com sucesso`)

    // 4. Registrar ação de impersonation no log de admin
    try {
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: adminUser.id,
        action: 'impersonate_user',
        target_type: 'user',
        target_id: targetUserId,
        details: {
          target_email: targetUser.user.email,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log:', logError)
      // Não falhar a operação por causa do log
    }

    // 5. Retornar dados necessários para o frontend fazer login
    return new Response(
      JSON.stringify({
        success: true,
        magicLink: sessionData.properties.action_link,
        targetUser: {
          id: targetUser.user.id,
          email: targetUser.user.email,
          full_name: targetUser.user.user_metadata?.full_name || targetUser.user.email
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro no impersonate:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
