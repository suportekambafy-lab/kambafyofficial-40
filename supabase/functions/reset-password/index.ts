import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  email: string;
  memberAreaId?: string;
}

// Function to generate a secure temporary password
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
    const { email, memberAreaId }: ResetPasswordRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔐 Resetting password for:', normalizedEmail);
    console.log('📧 Member Area ID:', memberAreaId || 'none');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar o usuário no sistema de auth
    const { data: listResponse, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuário" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const existingUser = listResponse.users.find(user => user.email?.toLowerCase() === normalizedEmail);

    if (!existingUser) {
      console.error('❌ User not found:', normalizedEmail);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Gerar nova senha temporária
    const temporaryPassword = generateTemporaryPassword();

    // Atualizar senha do usuário
    console.log('🔑 Updating user password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { 
        password: temporaryPassword,
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar senha" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ Password updated successfully');
    
    // Buscar informações do vendedor se memberAreaId fornecido
    let sellerInfo = null;
    let loginUrl = 'https://app.kambafy.com/auth';
    
    if (memberAreaId) {
      const { data: memberArea } = await supabase
        .from('member_areas')
        .select('name, user_id, profiles!inner(full_name, email)')
        .eq('id', memberAreaId)
        .single();
      
      if (memberArea) {
        sellerInfo = {
          memberAreaName: memberArea.name,
          sellerName: memberArea.profiles.full_name,
          sellerEmail: memberArea.profiles.email
        };
        loginUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
        console.log('✅ Seller info found:', sellerInfo);
      }
    }

    // Buscar nome do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', existingUser.id)
      .single();

    const userName = profile?.full_name || existingUser.user_metadata?.full_name || 'Usuário';

    // Enviar email com a nova senha
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [normalizedEmail],
      subject: sellerInfo ? `🔐 Nova Senha - ${sellerInfo.memberAreaName}` : "🔐 Nova Senha - Kambafy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <span style="font-size: 24px; font-weight: bold;">K</span>
            </div>
            <h1 style="color: #16a34a; margin-bottom: 10px;">Nova Senha Gerada</h1>
            <p style="color: #666; font-size: 16px;">Sua senha foi redefinida com sucesso</p>
            ${sellerInfo ? `<p style="color: #475569; font-size: 14px; margin-top: 10px;">Para: <strong>${sellerInfo.memberAreaName}</strong></p>` : ''}
          </div>

          <div style="padding: 30px 0;">
            <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px;">
              Olá <strong>${userName}</strong>,
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 25px;">
              Sua solicitação de recuperação de senha foi processada. Abaixo estão seus novos dados de acesso:
            </p>
          </div>
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1e293b;">Dados de Acesso</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: 500; color: #475569; width: 35%;">📧 Email:</td>
                <td style="padding: 10px 0; color: #1e293b; font-family: 'Courier New', monospace;">${normalizedEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 500; color: #475569;">🔑 Nova Senha:</td>
                <td style="padding: 10px 0; color: #1e293b; font-family: 'Courier New', monospace; font-weight: 700; background-color: #fff; padding: 12px; border-radius: 4px; font-size: 18px;">${temporaryPassword}</td>
              </tr>
            </table>
            <div style="background-color: #dc2626; color: white; border-radius: 6px; padding: 15px; margin: 20px 0 0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6;">
                <strong>⚠️ Importante:</strong> Por segurança, recomendamos que altere esta senha após fazer login.
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #16a34a; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              🚀 Fazer Login Agora
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
            Ou copie e cole este link no seu navegador:<br>
            <code style="background: #f1f5f9; padding: 5px 10px; border-radius: 4px; font-size: 12px; color: #475569; word-break: break-all;">${loginUrl}</code>
          </p>
          
          ${sellerInfo ? `
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 3px solid #3b82f6;">
            <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; color: #1e293b;">📧 Informações de Contato</h3>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
              <strong>Vendedor:</strong> ${sellerInfo.sellerName}
            </p>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px;">
              <strong>📧 Contato do Vendedor:</strong><br>
              <a href="mailto:${sellerInfo.sellerEmail}" style="color: #3b82f6; text-decoration: none;">${sellerInfo.sellerEmail}</a>
            </p>
            <p style="margin: 0; color: #475569; font-size: 14px;">
              <strong>🏢 Suporte Kambafy:</strong><br>
              <a href="mailto:suporte@kambafy.com" style="color: #3b82f6; text-decoration: none;">suporte@kambafy.com</a>
            </p>
          </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Se você não solicitou a redefinição de senha, entre em contato com o suporte imediatamente.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px;">
              © 2024 Kambafy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Password reset email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        message: "Nova senha enviada com sucesso para o email",
        success: true 
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
    console.error("❌ Error in reset-password function:", error);
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
