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
  memberAreaId?: string; // Para validar o dono
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== AUTENTICAÇÃO DO DONO DA ÁREA ==========
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Token de autenticação ausente')
      return new Response(
        JSON.stringify({ error: 'Token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Criar cliente com o token do usuário para verificar autenticação
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Usuário não autenticado:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`✅ Usuário autenticado: ${user.email}`)
    // ========== FIM DA AUTENTICAÇÃO ==========

    const { customerName, customerEmail, temporaryPassword, memberAreaId }: AddStudentRequest = await req.json();
    
    // Normalizar email para lowercase
    const normalizedEmail = customerEmail.toLowerCase().trim();

    console.log('=== ADD STUDENT TO MEMBER AREA START ===');
    console.log('Student:', customerName, normalizedEmail);
    console.log('Requested by:', user.email);

    // Se memberAreaId foi fornecido, verificar se o usuário é o dono
    if (memberAreaId) {
      const { data: memberArea, error: maError } = await supabase
        .from('member_areas')
        .select('id, user_id, name')
        .eq('id', memberAreaId)
        .single()

      if (maError || !memberArea) {
        console.error('❌ Área de membros não encontrada')
        return new Response(
          JSON.stringify({ error: 'Área de membros não encontrada' }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      if (memberArea.user_id !== user.id) {
        console.error('❌ Usuário não é dono da área de membros')
        return new Response(
          JSON.stringify({ error: 'Você não tem permissão para adicionar alunos nesta área' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      console.log(`✅ Usuário é dono da área: ${memberArea.name}`)
    }

    // Verificar se o usuário já existe
    console.log('🔍 Checking if user exists...');
    const { data: existingUsers, error: userCheckError } = await supabase.auth.admin.listUsers();
    
    if (userCheckError) {
      console.error('❌ Error checking existing users:', userCheckError);
      throw userCheckError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
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
        email: normalizedEmail,
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          full_name: customerName,
          created_via: 'manual_add',
          added_by: user.email
        }
      });

      if (createUserError) {
        console.error('❌ Error creating user:', createUserError);
        throw createUserError;
      }

      if (!newUser.user) {
        throw new Error('Failed to create user');
      }

      console.log('✅ User created successfully:', newUser.user.email);
      
      // Garantir confirmação de email
      console.log('🔍 Double-checking email confirmation...');
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        newUser.user.id,
        { email_confirm: true }
      );
      
      if (confirmError) {
        console.error('⚠️ Warning: Could not confirm email via update:', confirmError);
      } else {
        console.log('✅ Email confirmation double-checked');
      }
      
      isNewAccount = true;
      passwordToReturn = finalPassword;

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          full_name: customerName,
          email: normalizedEmail
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
      } else {
        console.log('✅ Profile created successfully');
      }
      
    } else if (temporaryPassword) {
      // Usuário existe e foi fornecida nova senha temporária
      console.log('🔑 Updating existing user password and confirming email...');
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: temporaryPassword,
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        throw updateError;
      }

      console.log('✅ User password updated and email confirmed');
      isNewAccount = true;
      passwordToReturn = temporaryPassword;
      
    } else {
      console.log('✅ User already exists, ensuring email is confirmed...');
      
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );
      
      if (confirmError) {
        console.error('⚠️ Warning: Could not confirm existing user email:', confirmError);
      } else {
        console.log('✅ Existing user email confirmed');
      }
      
      isNewAccount = false;
      passwordToReturn = undefined;
    }

    console.log('=== ADD STUDENT PROCESS COMPLETE ===');

    return new Response(JSON.stringify({
      success: true,
      userCreated: !existingUser,
      passwordUpdated: !!existingUser && !!temporaryPassword,
      isNewAccount: isNewAccount,
      temporaryPassword: passwordToReturn,
      addedBy: user.email
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
