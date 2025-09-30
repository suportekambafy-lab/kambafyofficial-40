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
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('✅ Confirmando email no Supabase para:', email);

    // Criar cliente admin para confirmar usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar usuário pelo email usando query filter
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Erro ao buscar usuários:', userError);
      return Response.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Buscar usuário específico (incluindo não confirmados)
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('❌ Usuário não encontrado:', email);
      console.log('📋 Total de usuários na busca:', users.length);
      return Response.json(
        { success: false, error: 'Usuário não encontrado. Por favor, tente criar a conta novamente.' },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('👤 Usuário encontrado:', user.id, 'Email confirmado:', user.email_confirmed_at);

    // Confirmar o email do usuário
    const { data: updateData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
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

    console.log('✅ Email confirmado com sucesso!', updateData);

    // Tentar fazer login automático
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (signInError) {
      console.error('⚠️ Login automático falhou:', signInError.message);
      return Response.json(
        { 
          success: true, 
          message: 'Email confirmado! Faça login manualmente.',
          autoLoginFailed: true,
          email: email
        },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log('✅ Login automático realizado com sucesso!');

    return Response.json(
      { 
        success: true, 
        message: 'Conta confirmada e login realizado com sucesso!',
        session: signInData.session,
        user: signInData.user
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