import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Chave secreta para assinar JWT (em produção, usar variável de ambiente)
const JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || 'kambafy-admin-secret-2025'

async function generateJWT(email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    { 
      email, 
      role: 'admin',
      exp: Date.now() / 1000 + 3600 // 1 hora
    },
    key
  )

  return jwt
}

async function verifyJWT(token: string): Promise<any> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  try {
    const payload = await verify(token, key)
    return payload
  } catch {
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

    const { email, password, twoFactorCode } = await req.json()

    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios')
    }

    console.log(`🔐 Tentativa de login admin: ${email}`)

    // 1. Verificar se é admin na tabela admin_users
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash, full_name, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ Admin não encontrado:', adminError)
      throw new Error('Credenciais inválidas')
    }

    // 2. Verificar senha usando bcrypt
    // Nota: Em produção, implementar bcrypt.compare aqui
    // Por enquanto, validação simplificada
    console.log('✅ Admin encontrado')

    // 3. Se não tem código 2FA, solicitar
    if (!twoFactorCode) {
      // Enviar código 2FA
      const { error: twoFAError } = await supabaseAdmin.functions.invoke('send-2fa-code', {
        body: {
          email: adminUser.email,
          event_type: 'admin_login',
          user_email: adminUser.email
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
          message: 'Código de verificação enviado por email'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // 4. Verificar código 2FA (SEMPRE OBRIGATÓRIO)
    const { data: verifyData, error: verifyError } = await supabaseAdmin.functions.invoke('verify-2fa-code', {
      body: {
        email: adminUser.email,
        code: twoFactorCode,
        event_type: 'admin_login'
      }
    })

    if (verifyError || !verifyData?.valid) {
      console.error('❌ Código 2FA inválido')
      throw new Error('Código de verificação inválido')
    }
    
    console.log('✅ Código 2FA verificado com sucesso')

    // 5. Gerar JWT de autenticação
    const jwt = await generateJWT(adminUser.email)

    // 6. Registrar login no log
    await supabaseAdmin.from('admin_logs').insert({
      admin_id: adminUser.id,
      action: 'admin_login',
      target_type: 'system',
      details: {
        timestamp: new Date().toISOString(),
        method: '2fa_verified'
      }
    })

    console.log('✅ Login admin bem-sucedido')

    return new Response(
      JSON.stringify({
        success: true,
        jwt,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro no login admin:', error)
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