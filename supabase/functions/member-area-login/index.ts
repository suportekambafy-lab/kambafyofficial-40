import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔐 Member Area Login - Request received');
  
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

    const { memberAreaId, email, name } = await req.json();
    
    console.log('📋 Login attempt:', { memberAreaId, email, name });

    // Validate required fields
    if (!memberAreaId || !email || !name) {
      throw new Error('Missing required fields: memberAreaId, email, name');
    }

    // Check if member area exists
    const { data: memberArea, error: memberAreaError } = await supabase
      .from('member_areas')
      .select('id, name, user_id')
      .eq('id', memberAreaId)
      .single();

    if (memberAreaError || !memberArea) {
      console.error('❌ Member area not found:', memberAreaError);
      throw new Error('Área de membros não encontrada');
    }

    // Check if student has access (purchased a product with this member area)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_email,
        products!inner (
          member_area_id
        )
      `)
      .eq('customer_email', email)
      .eq('status', 'completed')
      .eq('products.member_area_id', memberAreaId);

    if (ordersError) {
      console.error('❌ Error checking orders:', ordersError);
      throw new Error('Erro ao verificar acesso');
    }

    // Check if user is the creator of the member area
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('email', email)
      .eq('user_id', memberArea.user_id)
      .single();

    const isCreator = !profileError && profiles;
    const hasPurchased = orders && orders.length > 0;

    if (!isCreator && !hasPurchased) {
      console.log('❌ Access denied - no purchase found and not creator');
      throw new Error('Você não tem acesso a esta área de membros. Verifique se comprou o curso relacionado.');
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Get client info
    const userAgent = req.headers.get('user-agent') || '';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Clean up expired sessions first
    await supabase
      .from('member_area_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Delete any existing sessions for this user in this member area
    await supabase
      .from('member_area_sessions')
      .delete()
      .eq('member_area_id', memberAreaId)
      .eq('student_email', email);

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from('member_area_sessions')
      .insert({
        member_area_id: memberAreaId,
        student_email: email,
        student_name: name,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Error creating session:', sessionError);
      throw new Error('Erro ao criar sessão');
    }

    console.log('✅ Session created successfully for:', email);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionToken: session.session_token,
          expiresAt: session.expires_at,
          memberArea: {
            id: memberArea.id,
            name: memberArea.name
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
    console.error('💥 Error in member-area-login:', error);
    
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