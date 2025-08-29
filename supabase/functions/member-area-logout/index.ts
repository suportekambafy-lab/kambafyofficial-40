import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚪 Member Area Logout - Request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionToken } = await req.json();
    
    console.log('📋 Logging out session');

    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    // Delete session
    const { error: deleteError } = await supabase
      .from('member_area_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (deleteError) {
      console.error('❌ Error deleting session:', deleteError);
      throw new Error('Erro ao encerrar sessão');
    }

    console.log('✅ Session logged out successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Logout realizado com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('💥 Error in member-area-logout:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})