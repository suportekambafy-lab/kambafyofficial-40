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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MEMBER AREA PASSWORD RESET START ===');
    
    const { studentEmail, memberAreaId }: ResetPasswordRequest = await req.json();
    console.log('Reset request for:', studentEmail, 'Member Area:', memberAreaId);

    if (!studentEmail || !memberAreaId) {
      throw new Error('Email do estudante e ID da área de membros são obrigatórios');
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

    // Verificar se o usuário existe no auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Erro ao listar usuários:', usersError);
      throw usersError;
    }

    // Gerar nova senha temporária
    const newTempPassword = Math.random().toString(36).slice(-8) + 
                           Math.random().toString(36).slice(-4).toUpperCase() +
                           Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    console.log('🔐 Nova senha temporária gerada para:', studentEmail);

    let userId = '';
    const existingUser = users.find(u => u.email === studentEmail);
    
    if (!existingUser) {
      console.log('⚠️ Usuário não encontrado no sistema de autenticação, criando nova conta...');
      
      // Criar novo usuário com senha temporária
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: studentEmail,
        password: newTempPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        throw createError;
      }

      console.log('✅ Nova conta criada:', newUser.user?.id);
      userId = newUser.user!.id;
    } else {
      console.log('✅ Usuário encontrado:', existingUser.id);
      userId = existingUser.id;

      // Atualizar a senha do usuário existente
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newTempPassword }
      );

      if (updateError) {
        console.error('❌ Erro ao atualizar senha:', updateError);
        throw updateError;
      }

      console.log('✅ Senha atualizada com sucesso');
    }

    // Buscar dados da área de membros para o email
    const { data: memberAreaData, error: memberAreaError } = await supabase
      .from('member_areas')
      .select('name')
      .eq('id', memberAreaId)
      .single();

    if (memberAreaError) {
      console.error('Erro ao buscar dados da área de membros:', memberAreaError);
    }

    // Enviar email com nova senha
    console.log('📧 Enviando email com nova senha...');
    
    try {
      const emailPayload = {
        studentEmail: studentEmail,
        studentName: studentAccess.student_name,
        memberAreaName: memberAreaData?.name || 'Área de Membros',
        memberAreaUrl: `https://kambafy.com/members/login/${memberAreaId}`,
        isPasswordReset: true,
        temporaryPassword: newTempPassword
      };
      
      console.log('📧 Dados para envio de email:', emailPayload);
      
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-member-access-email',
        {
          body: emailPayload
        }
      );

      if (emailError) {
        console.error('❌ Erro ao invocar função de email:', emailError);
      } else {
        console.log('✅ Email enviado com sucesso:', emailResult);
      }
    } catch (emailSendError) {
      console.error('❌ Erro no envio do email:', emailSendError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Nova senha enviada para o seu email',
      data: {
        email: studentEmail,
        member_area_id: memberAreaId,
        password_reset: true
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