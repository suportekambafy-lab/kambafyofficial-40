
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
    const { email, memberAreaId }: ResetPasswordRequest & { memberAreaId?: string } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('🔐 Sending password reset email to:', email);
    console.log('📧 Member Area ID:', memberAreaId || 'none');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gerar link de reset usando Supabase Admin API
    // O redirectTo deve apontar para a rota correta da aplicação
    const redirectTo = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://app.kambafy.com'}/reset-password`;
    
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://app.kambafy.com/reset-password'
      }
    });

    if (error) {
      console.error('Erro ao gerar link de reset:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Password reset link generated successfully");

    // Enviar email com o link de reset
    const resetLink = data.properties.action_link;
    
    // Buscar informações do vendedor se memberAreaId fornecido
    let sellerInfo = null;
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
        console.log('✅ Seller info found:', sellerInfo);
      }
    }
    
    // Log para debug
    console.log("🔗 Reset link gerado:", resetLink);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [email],
      subject: sellerInfo ? `Recuperação de Senha - ${sellerInfo.memberAreaName}` : "Recuperação de Senha - Kambafy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <span style="font-size: 24px; font-weight: bold;">K</span>
            </div>
            <h1 style="color: #16a34a; margin-bottom: 10px;">Recuperação de Senha</h1>
            <p style="color: #666; font-size: 16px;">Recebemos uma solicitação para redefinir sua senha</p>
            ${sellerInfo ? `<p style="color: #475569; font-size: 14px; margin-top: 10px;">Para: <strong>${sellerInfo.memberAreaName}</strong></p>` : ''}
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              Clique no botão abaixo para redefinir sua senha:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <span style="word-break: break-all; color: #16a34a;">${resetLink}</span>
            </p>
          </div>
          
          ${sellerInfo ? `
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #3b82f6;">
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
            <p style="margin: 15px 0 0; color: #64748b; font-size: 13px; font-style: italic;">
              💡 Para dúvidas sobre o produto, contacte o vendedor. Para questões técnicas da plataforma, contacte o suporte Kambafy.
            </p>
          </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="color: #9ca3af; font-size: 14px; text-align: center;">
              Se você não solicitou a redefinição de senha, pode ignorar este email com segurança.
            </p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Este link expira em 1 hora por motivos de segurança.
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
      console.error('Erro ao enviar email:', emailError);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Password reset email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        message: "Email de recuperação enviado com sucesso",
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
    console.error("Error in reset-password function:", error);
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
