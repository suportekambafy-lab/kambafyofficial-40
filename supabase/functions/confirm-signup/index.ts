import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmSignupRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, code }: ConfirmSignupRequest = await req.json();

    console.log('Confirmando signup para:', email);

    if (!email || !code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email e código são obrigatórios' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Primeiro, verificar se o código é válido e ainda não foi usado
    const { data: codeRecord, error: codeError } = await supabase
      .from('two_factor_codes')
      .select('*')
      .eq('user_email', email)
      .eq('code', code)
      .eq('event_type', 'signup')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !codeRecord) {
      console.error('Código inválido ou expirado:', codeError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Código inválido ou expirado' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Marcar código como usado
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    // Encontrar o usuário não confirmado
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Erro ao listar usuários:', usersError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao encontrar usuário' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Encontrar usuário não confirmado com o email específico
    const unconfirmedUser = users?.find(user => 
      user.email === email && !user.email_confirmed_at
    );

    if (!unconfirmedUser) {
      console.error('Usuário não encontrado ou já confirmado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Usuário não encontrado ou já confirmado' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Confirmar o usuário
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      unconfirmedUser.id,
      { 
        email_confirm: true,
        email_confirmed_at: new Date().toISOString()
      }
    );

    if (confirmError) {
      console.error('Erro ao confirmar usuário:', confirmError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao confirmar conta' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Usuário confirmado com sucesso:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta confirmada com sucesso' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro ao confirmar signup:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);