import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔍 Member Area Verify - Request received');
  
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
    
    console.log('📋 Verifying session token');

    if (!sessionToken) {
      throw new Error('Session token is required');
    }

    // Find and verify session
    const { data: session, error: sessionError } = await supabase
      .from('member_area_sessions')
      .select(`
        *,
        member_areas!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.log('❌ Invalid or expired session');
      throw new Error('Sessão inválida ou expirada');
    }

    // Update last activity
    await supabase
      .from('member_area_sessions')
      .update({ 
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_token', sessionToken);

    console.log('✅ Session verified for:', session.student_email);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session: {
            id: session.id,
            expiresAt: session.expires_at,
            lastActivity: new Date().toISOString()
          },
          memberArea: {
            id: session.member_areas.id,
            name: session.member_areas.name,
            userId: session.member_areas.user_id
          },
          student: {
            email: session.student_email,
            name: session.student_name
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('💥 Error in member-area-verify:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})