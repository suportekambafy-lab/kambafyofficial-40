import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  studentEmail: string;
  memberAreaId: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEMBER AREA PASSWORD RESET START ===');
    
    const requestBody = await req.json();
    console.log('📨 Raw request body:', requestBody);
    
    const { studentEmail, memberAreaId, newPassword }: ResetPasswordRequest = requestBody;
    console.log('Reset request for:', studentEmail, 'Member Area:', memberAreaId, 'Password provided:', !!newPassword);
    console.log('Password details:', { 
      hasPassword: !!newPassword, 
      passwordLength: newPassword ? newPassword.length : 0,
      passwordType: typeof newPassword 
    });

    if (!studentEmail || !memberAreaId || !newPassword) {
      console.log('❌ Campos obrigatórios ausentes:', { studentEmail: !!studentEmail, memberAreaId: !!memberAreaId, newPassword: !!newPassword });
      throw new Error('Email, ID da área de membros e nova senha são obrigatórios');
    }

    if (newPassword.length < 6) {
      console.log('❌ Senha muito curta:', newPassword.length);
      throw new Error('A nova senha deve ter pelo menos 6 caracteres');
    }

    // Criar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Verificando se o estudante tem acesso à área de membros...');

    // Verificar se o estudante tem acesso à área de membros
    const { data: studentAccess, error: accessError } = await supabase
      .from('member_area_students')
      .select('*')
      .eq('member_area_id', memberAreaId)
      .eq('student_email', studentEmail)
      .single();

    if (accessError || !studentAccess) {
      console.log('❌ Estudante não encontrado na área de membros');
      throw new Error('Email não encontrado nesta área de membros');
    }

    console.log('✅ Estudante encontrado na área de membros');

    // Usar admin API para buscar ou criar usuário
    let userId: string | null = null;
    
    try {
      // Primeiro, tentar atualizar senha de usuário existente
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Erro ao buscar usuários:', listError);
        throw new Error('Erro ao acessar sistema de usuários');
      }

      const existingUser = users.find(u => u.email === studentEmail);
      
      if (existingUser) {
        console.log('✅ Usuário encontrado, atualizando senha...');
        userId = existingUser.id;
        
        // Atualizar senha do usuário existente
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword,
          email_confirm: true
        });

        if (updateError) {
          console.error('❌ Erro ao atualizar senha:', updateError);
          throw new Error('Erro ao atualizar senha');
        }

        console.log('✅ Senha atualizada com sucesso');
        
      } else {
        console.log('⚠️ Usuário não encontrado, criando nova conta...');
        
        // Tentar criar novo usuário
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: studentEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: studentEmail.split('@')[0] // Usar parte do email como nome
          }
        });

        if (createError) {
          // Se erro de email existente, buscar o usuário novamente
          if (createError.message?.includes('already been registered') || createError.message?.includes('email_exists')) {
            console.log('🔄 Email já existe, buscando usuário...');
            
            // Buscar novamente
            const { data: { users: refreshedUsers }, error: refreshError } = await supabase.auth.admin.listUsers();
            if (!refreshError) {
              const foundUser = refreshedUsers.find(u => u.email === studentEmail);
              if (foundUser) {
                console.log('✅ Usuário encontrado após busca, atualizando senha...');
                userId = foundUser.id;
                
                const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                  password: newPassword,
                  email_confirm: true
                });

                if (updateError) {
                  throw new Error('Erro ao atualizar senha');
                }
              } else {
                throw new Error('Não foi possível localizar conta do usuário');
              }
            } else {
              throw new Error('Erro ao buscar usuários');
            }
          } else {
            console.error('❌ Erro ao criar usuário:', createError);
            throw createError;
          }
        } else {
          console.log('✅ Nova conta criada com sucesso');
          userId = newUser.user.id;
        }
      }

    } catch (authError: any) {
      console.error('❌ Erro de autenticação:', authError);
      throw new Error('Erro ao processar conta: ' + authError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Nova senha definida com sucesso! Agora você pode fazer login.',
      data: {
        email: studentEmail,
        member_area_id: memberAreaId,
        password_updated: true
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERRO NO RESET DE SENHA ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Erro ao processar reset de senha'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);