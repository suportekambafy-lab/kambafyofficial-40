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

    // Retornar sucesso sem fazer login automático
    // O usuário deve definir sua senha posteriormente
    return Response.json(
      { 
        success: true, 
        message: 'Email confirmado com sucesso! Agora você pode definir sua senha.',
        emailConfirmed: true,
        email: email
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