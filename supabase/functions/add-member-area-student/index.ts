import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AddStudentRequest {
  customerName: string;
  customerEmail: string;
  temporaryPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, temporaryPassword }: AddStudentRequest = await req.json();

    console.log('=== ADD STUDENT TO MEMBER AREA START ===');
    console.log('Student:', customerName, customerEmail);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o usuário já existe
    console.log('🔍 Checking if user exists...');
    const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('❌ Error checking existing users:', userCheckError);
      throw userCheckError;
    }

    const existingUser = existingUsers?.users?.find(user => user.email === customerEmail);
    let isNewAccount = false;
    let passwordToReturn = temporaryPassword;

    if (!existingUser) {
      // Usuário não existe, criar novo
      console.log('👤 Creating new user account...');
      
      // Usar senha fornecida ou gerar uma nova
      const finalPassword = temporaryPassword || Math.random().toString(36).slice(-8) + 
                           Math.random().toString(36).slice(-4).toUpperCase() +
                           Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: finalPassword,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          full_name: customerName,
          created_via: 'manual_add'
        }
      });

      if (createUserError) {
        console.error('❌ Error creating user:', createUserError);
        throw createUserError;
      }

      // Em vez de forçar confirmação, vamos usar login customizado
      if (newUser.user) {
        console.log('✅ User created - will use custom login flow');
      }

      console.log('✅ User created successfully:', newUser.user?.email);
      isNewAccount = true;
      passwordToReturn = finalPassword;

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user?.id,
          full_name: customerName,
          email: customerEmail
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        // Não falhar por causa do perfil
      } else {
        console.log('✅ Profile created successfully');
      }
      
    } else if (temporaryPassword) {
      // Usuário existe e foi fornecida nova senha temporária
      console.log('🔑 Updating existing user password...');
      
      const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: temporaryPassword }
      );

      if (updatePasswordError) {
        console.error('❌ Error updating user password:', updatePasswordError);
        throw updatePasswordError;
      }

      console.log('✅ User password updated successfully');
      isNewAccount = true; // Tratamos como nova conta para envio de credenciais
      passwordToReturn = temporaryPassword;
      
    } else {
      console.log('✅ User already exists:', existingUser.email);
      isNewAccount = false;
      passwordToReturn = undefined;
    }

    console.log('=== ADD STUDENT PROCESS COMPLETE ===');

    return new Response(JSON.stringify({
      success: true,
      userCreated: !existingUser,
      passwordUpdated: !!existingUser && !!temporaryPassword,
      isNewAccount: isNewAccount,
      temporaryPassword: passwordToReturn
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERROR IN ADD STUDENT PROCESS ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro no processo de adição de estudante'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);