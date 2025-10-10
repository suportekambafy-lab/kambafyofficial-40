import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tempo máximo de impersonation: 30 minutos
const IMPERSONATION_DURATION_MINUTES = 30

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

    const { targetUserId, adminEmail, twoFactorCode } = await req.json()

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

    // 1.5 Exigir 2FA antes de impersonation
    if (!twoFactorCode) {
      // Enviar código 2FA
      const { error: twoFAError } = await supabaseAdmin.functions.invoke('send-2fa-code', {
        body: {
          email: adminEmail,
          event_type: 'admin_impersonation',
          user_email: adminEmail
        }
      })

      if (twoFAError) {
        console.error('❌ Erro ao enviar 2FA:', twoFAError)
        throw new Error('Erro ao enviar código de verificação')
      }

      return new Response(
        JSON.stringify({
          success: false,
          requires2FA: true,
          message: 'Código de verificação necessário para impersonation'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // 1.6 Verificar código 2FA
    const { data: verifyData, error: verifyError } = await supabaseAdmin.functions.invoke('verify-2fa-code', {
      body: {
        email: adminEmail,
        code: twoFactorCode,
        event_type: 'admin_impersonation'
      }
    })

    if (verifyError || !verifyData?.valid) {
      console.error('❌ Código 2FA inválido')
      throw new Error('Código de verificação inválido para impersonation')
    }

    console.log('✅ 2FA verificado, prosseguindo com impersonation')

    // 2. Buscar dados do usuário alvo
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (userError || !targetUser) {
      console.error('❌ Usuário não encontrado:', userError)
      throw new Error('Usuário não encontrado')
    }

    console.log(`✅ Usuário encontrado: ${targetUser.user.email}`)

    // 3. Gerar sessão administrativa para o usuário alvo
    // Isso cria um access token válido para o usuário sem precisar da senha
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email!,
    })

    if (magicLinkError || !magicLinkData) {
      console.error('❌ Erro ao gerar link mágico:', magicLinkError)
      throw new Error('Erro ao criar sessão de impersonation')
    }

    console.log(`✅ Sessão de impersonation criada com sucesso`)

    // 3.5 Criar registro de sessão de impersonation
    const expiresAt = new Date(Date.now() + IMPERSONATION_DURATION_MINUTES * 60 * 1000)
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    const { data: impersonationSession, error: sessionError } = await supabaseAdmin
      .from('admin_impersonation_sessions')
      .insert({
        admin_email: adminEmail,
        target_user_id: targetUserId,
        target_user_email: targetUser.user.email,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        read_only_mode: true, // Modo somente leitura por padrão
        is_active: true
      })
      .select()
      .single()

    if (sessionError) {
      console.error('⚠️ Erro ao criar sessão de impersonation:', sessionError)
    }

    console.log(`✅ Sessão de impersonation registrada: ${impersonationSession?.id}`)

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
        magicLink: magicLinkData.properties.action_link,
        targetUser: {
          id: targetUser.user.id,
          email: targetUser.user.email,
          full_name: targetUser.user.user_metadata?.full_name || targetUser.user.email
        },
        impersonationSession: {
          id: impersonationSession?.id,
          expiresAt: expiresAt.toISOString(),
          readOnlyMode: true,
          durationMinutes: IMPERSONATION_DURATION_MINUTES
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
