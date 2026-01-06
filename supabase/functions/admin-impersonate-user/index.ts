import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import * as jose from 'https://esm.sh/jose@5.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tempo máximo de impersonation: 30 minutos
const IMPERSONATION_DURATION_MINUTES = 30

// Verificar JWT do admin
async function verifyAdminJWT(token: string): Promise<{ email: string } | null> {
  const JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET')
  if (!JWT_SECRET) {
    console.error('❌ ADMIN_JWT_SECRET não configurado')
    return null
  }
  
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    console.log('🔐 JWT verificado - payload:', { email: payload.email, role: payload.role, exp: payload.exp })
    
    // Verificar se tem email e role admin
    if (payload.email && payload.role === 'admin') {
      console.log('✅ JWT válido para admin:', payload.email)
      return { email: payload.email as string }
    }
    
    console.error('❌ JWT não tem permissão admin:', { email: payload.email, role: payload.role })
    return null
  } catch (error) {
    console.error('❌ Erro ao verificar JWT:', error.message)
    return null
  }
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

    // ========== AUTENTICAÇÃO (adminJwt OU Supabase Auth) ==========
    const { targetUserId, adminJwt } = await req.json()

    let adminEmail: string | null = null

    // 1) Tentar JWT customizado (admin-login) se fornecido
    if (adminJwt) {
      const adminPayload = await verifyAdminJWT(adminJwt)
      if (adminPayload?.email) {
        adminEmail = adminPayload.email
      } else {
        console.warn('⚠️ adminJwt inválido/expirado - tentando Supabase Auth token')
      }
    }

    // 2) Fallback: usar token do Supabase Auth (Authorization header)
    if (!adminEmail) {
      const authHeader = req.headers.get('Authorization')
      const accessToken =
        authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

      if (accessToken) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken)
        if (userError) {
          console.error('❌ Falha ao validar Supabase Auth token:', userError.message)
        } else if (userData?.user?.email) {
          adminEmail = userData.user.email
          console.log('✅ Admin autenticado via Supabase Auth token:', adminEmail)
        }
      }
    }

    if (!adminEmail) {
      console.error('❌ Admin não autenticado (adminJwt inválido e sem Supabase Auth token)')
      return new Response(
        JSON.stringify({ success: false, error: 'Admin não autenticado. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminEmailNormalized = adminEmail.trim().toLowerCase()
    // ========== FIM DA AUTENTICAÇÃO ==========

    if (!targetUserId) {
      throw new Error('targetUserId é obrigatório')
    }

    console.log(`🎭 Admin ${adminEmailNormalized} tentando impersonar usuário: ${targetUserId}`)

    // 1. Verificar se o admin existe e está ativo no banco
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, is_active')
      .ilike('email', adminEmailNormalized)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ Admin não autorizado:', adminError)
      throw new Error('Acesso negado: Privilégios de admin necessários')
    }

    console.log('✅ Admin verificado no banco, prosseguindo com impersonation')

    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (userError || !targetUser) {
      console.error('❌ Usuário não encontrado:', userError)
      throw new Error('Usuário não encontrado')
    }

    console.log(`✅ Usuário encontrado: ${targetUser.user.email}`)

    // ========== ABORDAGEM SEGURA: Usar createSession para criar sessão sem invalidar outras ==========
    // Isso NÃO afeta as sessões existentes do utilizador em outros dispositivos
    
    console.log('🔐 Criando sessão de impersonation sem afetar outras sessões...')
    
    // Gerar tokens diretamente para o utilizador usando a Admin API
    // Isto cria uma NOVA sessão sem invalidar as existentes
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email!,
      options: {
        // Não especificar redirectTo para evitar processamento de URL
      }
    })

    if (sessionError || !sessionData) {
      console.error('❌ Erro ao gerar sessão:', sessionError)
      throw new Error('Erro ao criar sessão de impersonation: ' + (sessionError?.message || 'Sessão não gerada'))
    }

    console.log('✅ Token de impersonation gerado com sucesso')

    // Extrair o token do link gerado
    const actionLink = sessionData.properties?.action_link
    const hashedToken = sessionData.properties?.hashed_token
    
    console.log('📧 Token gerado:', { 
      hasActionLink: !!actionLink, 
      hasHashedToken: !!hashedToken 
    })
    
    // IMPORTANTE: Informar que o magic link NÃO invalida sessões existentes por si só
    // O que invalida é a rotação de refresh tokens - isso é uma config do servidor Supabase

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
        read_only_mode: true,
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
          timestamp: new Date().toISOString(),
          method: 'magic_link' // Registrar que usamos magic link
        }
      })
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log:', logError)
    }

    // 5. Retornar dados necessários para o frontend fazer login via magic link
    return new Response(
      JSON.stringify({
        success: true,
        // Nova abordagem: enviar token do magic link
        magicLinkToken: hashedToken,
        actionLink: actionLink,
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
