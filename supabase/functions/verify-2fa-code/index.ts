import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyCodeRequest {
  email: string;
  code: string;
  event_type: string;
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

    const { email, code, event_type }: VerifyCodeRequest = await req.json();

    console.log('Verificando código 2FA:', { email, code, event_type });

    if (!email || !code || !event_type) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Email, código e tipo de evento são obrigatórios' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Buscar o código na tabela two_factor_codes
    const { data: codeRecord, error: fetchError } = await supabase
      .from('two_factor_codes')
      .select('*')
      .eq('user_email', email)
      .eq('code', code)
      .eq('event_type', event_type)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (fetchError || !codeRecord) {
      console.log('Código não encontrado ou inválido:', fetchError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Código inválido ou expirado' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Marcar o código como usado
    const { error: updateError } = await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    if (updateError) {
      console.error('Erro ao marcar código como usado:', updateError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Erro interno do servidor' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Código 2FA verificado com sucesso para:', email);

    return new Response(
      JSON.stringify({ 
        valid: true, 
        message: 'Código verificado com sucesso' 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na verificação 2FA:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
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