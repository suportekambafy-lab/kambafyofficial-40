import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { studentEmail, memberAreaId, newPassword }: ResetPasswordRequest = await req.json();

    if (!studentEmail || !memberAreaId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email, memberAreaId e newPassword são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Normalizar email
    const normalizedEmail = studentEmail.toLowerCase().trim();

    console.log('🔐 RESET PASSWORD START:', {
      email: normalizedEmail,
      memberAreaId: memberAreaId
    });

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar informações da área de membros e vendedor
    const { data: memberArea, error: memberAreaError } = await supabase
      .from('member_areas')
      .select('id, name, url, user_id, profiles!inner(full_name, email)')
      .eq('id', memberAreaId)
      .single();

    if (memberAreaError || !memberArea) {
      console.error('❌ Error fetching member area:', memberAreaError);
      return new Response(
        JSON.stringify({ error: "Área de membros não encontrada" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Buscar informações do estudante
    const { data: student, error: studentError } = await supabase
      .from('member_area_students')
      .select('student_name, student_email')
      .eq('member_area_id', memberAreaId)
      .eq('student_email', normalizedEmail)
      .single();

    if (studentError || !student) {
      console.error('❌ Error fetching student:', studentError);
      return new Response(
        JSON.stringify({ error: "Estudante não encontrado nesta área de membros" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Listar usuários para encontrar o ID
    const { data: listResponse, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw listError;
    }

    const existingUser = listResponse.users.find(user => user.email?.toLowerCase() === normalizedEmail);

    if (!existingUser) {
      console.error('❌ User not found in auth system');
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Atualizar senha do usuário
    console.log('🔑 Updating user password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { 
        password: newPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      throw updateError;
    }

    console.log('✅ Password updated successfully');

    // Enviar email de notificação usando a função send-member-access-email
    console.log('📧 Sending password reset notification email...');
    const { error: emailError } = await supabase.functions.invoke('send-member-access-email', {
      body: {
        studentName: student.student_name,
        studentEmail: normalizedEmail,
        memberAreaName: memberArea.name,
        memberAreaUrl: `https://membros.kambafy.com/login/${memberAreaId}`,
        sellerName: memberArea.profiles.full_name,
        isPasswordReset: true,
        temporaryPassword: newPassword,
        supportEmail: memberArea.profiles.email
      }
    });

    if (emailError) {
      console.error('⚠️ Warning: Failed to send email notification:', emailError);
      // Não falhar a operação por causa do email
    } else {
      console.log('✅ Email notification sent successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Senha redefinida com sucesso e email enviado"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in member-area-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
