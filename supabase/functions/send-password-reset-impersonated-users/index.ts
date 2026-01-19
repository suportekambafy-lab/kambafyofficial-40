import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada')
    }

    const resend = new Resend(RESEND_API_KEY)
    
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

    console.log('🔍 Buscando usuários que foram impersonados...')

    // Buscar todos os emails únicos de usuários que foram impersonados
    // Esses são os usuários potencialmente afetados pelo bug de senha
    const { data: impersonatedUsers, error: queryError } = await supabaseAdmin
      .from('admin_impersonation_sessions')
      .select('target_user_email, target_user_id')
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('❌ Erro ao buscar sessões de impersonation:', queryError)
      throw new Error('Erro ao buscar usuários afetados: ' + queryError.message)
    }

    // Extrair emails únicos
    const uniqueEmails = [...new Set(impersonatedUsers?.map(u => u.target_user_email).filter(Boolean))]
    
    console.log(`📧 Encontrados ${uniqueEmails.length} usuários únicos para enviar reset de senha`)

    const results = {
      total: uniqueEmails.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://kambafy.com'

    for (const email of uniqueEmails) {
      try {
        console.log(`📤 Gerando link de reset para: ${email}`)
        
        // Gerar link de redefinição de senha usando a Admin API
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${siteUrl}/reset-password`
          }
        })

        if (linkError || !linkData) {
          console.error(`❌ Erro ao gerar link para ${email}:`, linkError)
          results.failed++
          results.errors.push(`${email}: ${linkError?.message || 'Erro desconhecido'}`)
          continue
        }

        // Extrair token_hash do link gerado
        const actionLink = linkData.properties?.action_link
        let resetLink = actionLink

        // Converter o link para usar nosso domínio com token_hash
        if (actionLink) {
          try {
            const url = new URL(actionLink)
            const token = url.searchParams.get('token')
            if (token) {
              resetLink = `${siteUrl}/reset-password?token_hash=${encodeURIComponent(token)}&type=recovery`
            }
          } catch (e) {
            console.warn('⚠️ Não foi possível extrair token do link, usando link original')
          }
        }

        // Buscar nome do usuário
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('email', email)
          .single()

        const userName = profile?.full_name || email.split('@')[0]

        // Enviar email personalizado via Resend
        const { error: emailError } = await resend.emails.send({
          from: 'Kambafy <no-reply@kambafy.com>',
          to: email,
          subject: 'Importante: Redefina sua senha - Kambafy',
          html: `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Kambafy</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <h2 style="color: #1f2937; margin-top: 0;">Olá, ${userName}!</h2>
    
    <p style="color: #4b5563;">
      Identificamos uma necessidade de atualização na sua conta Kambafy. Para garantir a segurança da sua conta, pedimos que você redefina sua senha.
    </p>
    
    <p style="color: #4b5563;">
      <strong>Por que estou recebendo isso?</strong><br>
      Realizamos uma atualização de segurança no nosso sistema e algumas contas precisam ter suas senhas redefinidas.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Redefinir Minha Senha
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Se o botão não funcionar, copie e cole este link no seu navegador:<br>
      <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      Este link expira em 24 horas. Se você não solicitou esta redefinição, ignore este email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Este é um email automático do Kambafy. Não responda a este email.<br>
      © ${new Date().getFullYear()} Kambafy. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
          `
        })

        if (emailError) {
          console.error(`❌ Erro ao enviar email para ${email}:`, emailError)
          results.failed++
          results.errors.push(`${email}: Erro ao enviar email`)
        } else {
          console.log(`✅ Email enviado com sucesso para: ${email}`)
          results.sent++
        }

        // Delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`❌ Erro ao processar ${email}:`, error)
        results.failed++
        results.errors.push(`${email}: ${error.message}`)
      }
    }

    console.log('📊 Resultado final:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${results.total} usuários afetados pelo bug de impersonation`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
