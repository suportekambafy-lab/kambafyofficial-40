import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3'

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

    const { email, password, secretKey } = await req.json()

    // Verificação de segurança simples
    if (secretKey !== 'kambafy-setup-2025') {
      throw new Error('Chave de acesso inválida')
    }

    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios')
    }

    console.log(`🔐 Definindo senha para admin: ${email}`)

    // Gerar hash bcrypt
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    console.log(`✅ Hash gerado com sucesso`)

    // Atualizar no banco
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()

    if (error) {
      console.error('❌ Erro ao atualizar:', error)
      throw new Error('Erro ao atualizar senha')
    }

    if (!data || data.length === 0) {
      throw new Error('Admin não encontrado')
    }

    console.log(`✅ Senha atualizada com sucesso para: ${email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha atualizada com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
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
