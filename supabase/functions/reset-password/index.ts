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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, memberAreaId }: ResetPasswordRequest = await req.json();

    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log("🔐 RESET PASSWORD START:", {
      email: normalizedEmail,
      memberAreaId: memberAreaId ?? "none",
    });

    // Criar cliente Supabase (Service Role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar usuário no Auth (paginação para não falhar em projetos com muitos usuários)
    const perPage = 1000;
    const maxPages = 25;

    let existingUser:
      | { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
      | null = null;

    for (let page = 1; page <= maxPages; page++) {
      const { data: usersPage, error: usersError } = await supabase.auth.admin
        .listUsers({ page, perPage });

      if (usersError) {
        console.error("❌ Error listing users:", usersError);
        return new Response(JSON.stringify({ error: "Erro ao buscar usuário" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const found = usersPage.users.find(
        (u) => (u.email ?? "").toLowerCase() === normalizedEmail
      );

      if (found) {
        existingUser = found as any;
        break;
      }

      // Se não veio uma página completa, não há mais páginas
      if (usersPage.users.length < perPage) {
        break;
      }

      // Se o total existe e já passamos do total estimado, parar
      if (usersPage.total && page >= Math.ceil(usersPage.total / perPage)) {
        break;
      }
    }

    if (!existingUser) {
      console.error("❌ User not found:", normalizedEmail);
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ User found:", existingUser.id);

    // Gerar link de recuperação usando generateLink
    // O link gerado contém token_hash que extraímos para enviar um link customizado
    const { data: linkData, error: linkError } = await supabase.auth.admin
      .generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: "https://app.kambafy.com/reset-password",
        },
      });

    if (linkError) {
      console.error("❌ Error generating link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de recuperação" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Extrair token_hash da action_link gerada
    // A URL gerada é algo como: https://...supabase.co/auth/v1/verify?token=XXX&type=recovery&redirect_to=...
    // O hashed_token está em linkData.properties.hashed_token
    const tokenHash = linkData.properties?.hashed_token;

    if (!tokenHash) {
      console.error("❌ No token_hash in link data:", linkData);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar token de recuperação" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Token hash generated successfully");

    // Criar link customizado que NÃO passa pelo /auth/v1/verify do Supabase
    // O app vai usar verifyOtp com token_hash para validar
    const customResetLink = `https://app.kambafy.com/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    console.log("🔗 Custom reset link created (token_hash based)");

    // Buscar nome (best-effort)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    const userName = profile?.full_name ||
      existingUser.user_metadata?.full_name ||
      "Usuário";

    // Info do vendedor (opcional)
    let sellerInfo: {
      memberAreaName: string;
      sellerName: string;
      sellerEmail: string;
    } | null = null;
    if (memberAreaId) {
      const { data: memberArea } = await supabase
        .from("member_areas")
        .select("name, profiles!inner(full_name, email)")
        .eq("id", memberAreaId)
        .single();

      if (memberArea) {
        sellerInfo = {
          memberAreaName: memberArea.name,
          sellerName: (memberArea.profiles as any).full_name,
          sellerEmail: (memberArea.profiles as any).email,
        };
      }
    }

    console.log("📧 Sending password reset email with custom link...");
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [normalizedEmail],
      subject: sellerInfo
        ? `🔐 Redefinir Senha - ${sellerInfo.memberAreaName}`
        : "🔐 Redefinir Senha - Kambafy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background-color: #16a34a; color: white; width: 56px; height: 56px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <span style="font-size: 22px; font-weight: bold;">K</span>
            </div>
            <h1 style="color: #16a34a; margin: 0 0 6px;">Redefinir Senha</h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Clique no botão abaixo para criar uma nova senha</p>
            ${sellerInfo ? `<p style="color:#475569;font-size:13px;margin:10px 0 0;">Para: <strong>${sellerInfo.memberAreaName}</strong></p>` : ""}
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 10px;">Olá <strong>${userName}</strong>,</p>
          <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 18px;">
            Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha segura.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${customResetLink}"
              style="background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 15px;">
              Criar Nova Senha
            </a>
          </div>

          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 10px; padding: 14px; margin: 18px 0;">
            <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
              <strong>⏰ Importante:</strong> Este link expira em <strong>1 hora</strong> por motivos de segurança.
            </p>
          </div>

          <p style="color:#6b7280;font-size:12px;text-align:center;margin:14px 0 0;">
            Se o botão não funcionar, copie e cole este link no navegador:<br>
            <span style="word-break:break-all;color:#16a34a;font-size:11px;">${customResetLink}</span>
          </p>

          ${sellerInfo ? `
            <div style="background-color:#f8fafc;padding:16px;border-radius:10px;margin:18px 0;border-left:3px solid #3b82f6;">
              <div style="font-weight:700;color:#0f172a;margin-bottom:8px;">📧 Informações de Contato</div>
              <div style="color:#475569;font-size:13px;line-height:1.6;">
                <div><strong>Vendedor:</strong> ${sellerInfo.sellerName}</div>
                <div><strong>Email:</strong> <a href="mailto:${sellerInfo.sellerEmail}" style="color:#3b82f6;text-decoration:none;">${sellerInfo.sellerEmail}</a></div>
                <div style="margin-top:8px;"><strong>Suporte Kambafy:</strong> <a href="mailto:suporte@kambafy.com" style="color:#3b82f6;text-decoration:none;">suporte@kambafy.com</a></div>
              </div>
            </div>
          ` : ""}

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 18px;">
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
              Se você não solicitou a redefinição, ignore este email ou entre em contato com o suporte.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("❌ Error sending email:", emailError);
      return new Response(JSON.stringify({ error: "Erro ao enviar email" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ Password reset email sent:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de recuperação enviado com sucesso",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in reset-password function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
