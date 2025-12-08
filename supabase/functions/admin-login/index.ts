import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import * as jose from 'https://esm.sh/jose@5.2.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Chave secreta para assinar JWT - DEVE estar configurada no ambiente
const JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET')

if (!JWT_SECRET) {
  console.error('❌ ADMIN_JWT_SECRET não configurado - função desabilitada')
}

async function generateJWT(email: string): Promise<string> {
  if (!JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET não configurado')
  }
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  const jwt = await new jose.SignJWT({ 
    email, 
    role: 'admin'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(secret)

  return jwt
}

async function verifyJWT(token: string): Promise<any> {
  if (!JWT_SECRET) {
    return null
  }
  const secret = new TextEncoder().encode(JWT_SECRET)

  try {
    const { payload } = await jose.jwtVerify(token, secret)
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

    const { email, password, twoFactorCode, codeAlreadyVerified } = await req.json()

    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios')
    }

    // Normalizar email (trim e lowercase)
    const normalizedEmail = email.trim().toLowerCase()
    
    console.log(`🔐 Tentativa de login admin: ${normalizedEmail}`)

    // 1. Verificar se é admin na tabela admin_users
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, password_hash, full_name, is_active, role')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ Admin não encontrado:', adminError)
      console.error('📧 Email buscado:', normalizedEmail)
      throw new Error('Credenciais inválidas')
    }

    console.log('✅ Admin encontrado:', { 
      email: adminUser.email, 
      role: adminUser.role,
      hasPasswordHash: !!adminUser.password_hash 
    })

    // 2. Verificar senha usando bcrypt
    if (!adminUser.password_hash) {
      console.error('❌ Admin sem senha definida')
      throw new Error('Conta admin sem senha configurada. Contate o administrador.')
    }
    
    // Verificar se a senha fornecida corresponde ao hash armazenado
    const passwordMatch = await bcrypt.compare(password, adminUser.password_hash)
    
    if (!passwordMatch) {
      console.error('❌ Senha incorreta')
      throw new Error('Credenciais inválidas')
    }
    
    console.log('✅ Senha verificada com sucesso')

    // 3. Se código não foi verificado ainda, solicitar ou verificar
    if (!codeAlreadyVerified) {
      // Se não tem código 2FA, solicitar
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

      // Verificar código 2FA
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
    } else {
      console.log('✅ Código 2FA já foi verificado no frontend')
    }

    // 4. Garantir que o admin existe no auth.users para RLS funcionar
    console.log('🔄 Verificando/criando usuário no auth.users...')
    
    // Verificar se já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === normalizedEmail)
    
    if (!existingUser) {
      console.log('📝 Criando usuário no auth.users para admin...')
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: adminUser.full_name,
          is_admin: true
        }
      })
      
      if (createError) {
        console.error('⚠️ Erro ao criar usuário auth (continuando):', createError.message)
      } else {
        console.log('✅ Usuário auth criado:', newUser?.user?.id)
      }
    } else {
      console.log('✅ Usuário auth já existe:', existingUser.id)
      
      // Atualizar a senha para garantir sincronização
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      )
      
      if (updateError) {
        console.error('⚠️ Erro ao atualizar senha (continuando):', updateError.message)
      } else {
        console.log('✅ Senha sincronizada no auth.users')
      }
    }

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
          full_name: adminUser.full_name,
          role: adminUser.role
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
