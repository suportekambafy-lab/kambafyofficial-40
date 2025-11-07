import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReleaseResult {
  success: boolean;
  released_count: number;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [RELEASE-RETENTIONS] Iniciando verificação de retenções expiradas...');

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Call the database function to release expired retentions
    const { data, error } = await supabaseClient.rpc('release_expired_retentions');

    if (error) {
      console.error('❌ [RELEASE-RETENTIONS] Erro ao executar função:', error);
      throw error;
    }

    const result = data as ReleaseResult;
    
    console.log('✅ [RELEASE-RETENTIONS] Execução concluída:', {
      released_count: result.released_count,
      timestamp: result.timestamp,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Released ${result.released_count} expired retention(s)`,
        ...result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [RELEASE-RETENTIONS] Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
