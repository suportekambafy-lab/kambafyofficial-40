import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CustomAuthLoginRequest {
  email: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password }: CustomAuthLoginRequest = await req.json();

    console.log('=== CUSTOM AUTH LOGIN START ===');
    console.log('Email:', email);

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
      
      return new Response(JSON.stringify({
        success: true,
        user: authData.user,
        session: authData.session
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
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

      // Verificar se o usuário tem um perfil válido (foi criado corretamente)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        console.log('✅ User has valid profile, confirming email and creating session...');
        
        // Usar admin API para confirmar o email
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          user.id,
          { 
            email_confirm: true
          }
        );

        if (confirmError) {
          console.error('❌ Error confirming email:', confirmError);
        } else {
          console.log('✅ Email confirmed via admin API');
        }

        // Pequena pausa para garantir que a confirmação foi processada
        await new Promise(resolve => setTimeout(resolve, 500));

        // Tentar login novamente após confirmação
        const { data: retryAuthData, error: retryAuthError } = await supabaseAnon.auth.signInWithPassword({
          email,
          password,
        });

        if (retryAuthData.user && retryAuthData.session) {
          console.log('✅ Retry login successful after email confirmation');
          
          return new Response(JSON.stringify({
            success: true,
            user: retryAuthData.user,
            session: retryAuthData.session,
            emailConfirmed: true
          }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          });
        } else {
          console.error('❌ Retry login failed after confirmation:', retryAuthError);
          
          // Tentar uma última vez com um pequeno delay adicional
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: finalRetryData, error: finalRetryError } = await supabaseAnon.auth.signInWithPassword({
            email,
            password,
          });
          
          if (finalRetryData.user && finalRetryData.session) {
            console.log('✅ Final retry login successful');
            
            return new Response(JSON.stringify({
              success: true,
              user: finalRetryData.user,
              session: finalRetryData.session,
              emailConfirmed: true
            }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            });
          } else {
            console.error('❌ Final retry also failed:', finalRetryError);
          }
        }
      }
    }

    throw new Error('Credenciais inválidas ou acesso negado');

  } catch (error: any) {
    console.error("=== ERROR IN CUSTOM AUTH LOGIN ===");
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