import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, password } = await req.json();

    if (!email || !code || !password) {
      return Response.json(
        { success: false, error: 'Email, código e senha são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Criar cliente Supabase para verificar código
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verificar se o código é válido
    const { data: codeData, error: codeError } = await supabaseClient
      .from('two_factor_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('event_type', 'signup')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (codeError || !codeData) {
      console.log('❌ Código inválido ou expirado:', codeError);
      return Response.json(
        { success: false, error: 'Código inválido ou expirado' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ Código válido, confirmando email no Supabase...');

    // Criar cliente admin para confirmar usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar usuário pelo email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Erro ao buscar usuários:', userError);
      return Response.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500, headers: corsHeaders }
      );
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ Usuário não encontrado:', email);
      return Response.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Confirmar o email do usuário
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error('❌ Erro ao confirmar email:', confirmError);
      return Response.json(
        { success: false, error: 'Erro ao confirmar email' },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Email confirmado com sucesso!');

    // Marcar código como usado
    await supabaseClient
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', codeData.id);

    // Tentar fazer login automático
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (loginError) {
      console.log('⚠️ Email confirmado mas login falhou:', loginError.message);
      return Response.json(
        { 
          success: true, 
          message: 'Conta confirmada com sucesso! Faça login manualmente.',
          autoLoginFailed: true 
        },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log('✅ Login automático realizado com sucesso!');

    return Response.json(
      { 
        success: true, 
        message: 'Conta confirmada e login realizado com sucesso!',
        session: loginData.session,
        user: loginData.user
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return Response.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
})