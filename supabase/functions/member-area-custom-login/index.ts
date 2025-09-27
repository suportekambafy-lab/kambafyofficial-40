import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CustomLoginRequest {
  memberAreaId: string;
  email: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberAreaId, email, password }: CustomLoginRequest = await req.json();

    console.log('=== CUSTOM MEMBER AREA LOGIN START ===');
    console.log('Member Area:', memberAreaId, 'Email:', email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Primeiro tentar login normal com Supabase Auth
    console.log('🔐 Attempting normal Supabase login...');
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authData.user && authData.session) {
      console.log('✅ Normal login successful');
      
      // Verificar se tem acesso à área de membros
      const { data: studentData } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', email)
        .single();

      if (studentData) {
        // Criar sessão personalizada
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

        await supabase
          .from('member_area_sessions')
          .insert({
            member_area_id: memberAreaId,
            student_email: email,
            student_name: studentData.student_name,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
          });

        return new Response(JSON.stringify({
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          studentName: studentData.student_name
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
    }

    // Se login normal falhou, tentar login customizado para usuários não confirmados
    if (authError?.message?.includes('Email not confirmed')) {
      console.log('📧 Email not confirmed, trying custom verification...');
      
      // Buscar usuário pelos dados administrativos
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        throw usersError;
      }

      const user = users.users.find(u => u.email === email);
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar senha usando admin API (tentar fazer login para validar senha)
      const { data: tempSession, error: tempAuthError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });

      if (tempAuthError) {
        console.error('❌ Error generating recovery link:', tempAuthError);
        throw new Error('Credenciais inválidas');
      }

      // Se chegou aqui, verificar se tem acesso à área de membros
      const { data: studentData } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', email)
        .single();

      if (studentData) {
        // Criar sessão personalizada para usuário não confirmado
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

        await supabase
          .from('member_area_sessions')
          .insert({
            member_area_id: memberAreaId,
            student_email: email,
            student_name: studentData.student_name,
            session_token: sessionToken,
            expires_at: expiresAt.toISOString(),
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown'
          });

        console.log('✅ Custom login successful for unconfirmed user');

        return new Response(JSON.stringify({
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          studentName: studentData.student_name,
          customLogin: true
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
    }

    throw new Error('Acesso negado ou credenciais inválidas');

  } catch (error: any) {
    console.error("=== ERROR IN CUSTOM LOGIN ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);