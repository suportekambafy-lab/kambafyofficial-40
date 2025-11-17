import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavePlayerIdRequest {
  user_id_input: string;
  player_id_input: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id_input, player_id_input } = await req.json() as SavePlayerIdRequest;

    console.log('📝 Salvando Player ID:', { user_id_input, player_id_input });

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Atualizar o player_id no perfil do usuário
    const { data, error } = await supabase
      .from('profiles')
      .update({ onesignal_player_id: player_id_input })
      .eq('user_id', user_id_input)
      .select();

    if (error) {
      console.error('❌ Erro ao salvar Player ID:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Player ID salvo com sucesso:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Player ID salvo com sucesso!',
        data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
