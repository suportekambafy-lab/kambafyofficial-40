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

function generateTemporaryPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const random = new Uint32Array(length);
  crypto.getRandomValues(random);

  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[random[i] % chars.length];
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

    // Buscar usuário no Auth
    const { data: listResponse, error: listError } = await supabase.auth.admin
      .listUsers();

    if (listError) {
      console.error("❌ Error listing users:", listError);
      return new Response(JSON.stringify({ error: "Erro ao buscar usuário" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const existingUser = listResponse.users.find((u) =>
      (u.email ?? "").toLowerCase() === normalizedEmail
    );

    if (!existingUser) {
      console.error("❌ User not found:", normalizedEmail);
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ✅ Em vez de link (que pode ser consumido por scanners de email), definimos senha temporária
    const temporaryPassword = generateTemporaryPassword(12);

    console.log("🔑 Updating user password...");
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: temporaryPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error("❌ Error updating password:", updateError);
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ Password updated successfully");

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
    let sellerInfo: { memberAreaName: string; sellerName: string; sellerEmail: string } | null = null;
    if (memberAreaId) {
      const { data: memberArea } = await supabase
        .from("member_areas")
        .select("name, profiles!inner(full_name, email)")
        .eq("id", memberAreaId)
        .single();

      if (memberArea) {
        sellerInfo = {
          memberAreaName: memberArea.name,
          sellerName: memberArea.profiles.full_name,
          sellerEmail: memberArea.profiles.email,
        };
      }
    }

    const loginUrl = "https://app.kambafy.com/auth";

    console.log("📧 Sending new-password email (no recovery link)...");
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Kambafy <noreply@kambafy.com>",
      to: [normalizedEmail],
      subject: sellerInfo
        ? `🔐 Nova Senha - ${sellerInfo.memberAreaName}`
        : "🔐 Nova Senha - Kambafy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="background-color: #16a34a; color: white; width: 56px; height: 56px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <span style="font-size: 22px; font-weight: bold;">K</span>
            </div>
            <h1 style="color: #16a34a; margin: 0 0 6px;">Nova Senha Gerada</h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Sua senha foi redefinida com sucesso</p>
            ${sellerInfo ? `<p style="color:#475569;font-size:13px;margin:10px 0 0;">Para: <strong>${sellerInfo.memberAreaName}</strong></p>` : ""}
          </div>

          <p style="font-size: 15px; color: #1e293b; margin: 0 0 10px;">Olá <strong>${userName}</strong>,</p>
          <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 18px;">
            Por segurança, enviamos uma senha temporária (sem links) para evitar que seu email marque o link como usado/expirado automaticamente.
          </p>

          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; border-radius: 10px; padding: 18px; margin: 0 0 18px;">
            <div style="font-size: 13px; color: #475569; margin-bottom: 8px;"><strong>📧 Email</strong></div>
            <div style="font-family: 'Courier New', monospace; color: #0f172a; margin-bottom: 14px;">${normalizedEmail}</div>

            <div style="font-size: 13px; color: #475569; margin-bottom: 8px;"><strong>🔑 Nova senha temporária</strong></div>
            <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; background: #fff; border-radius: 8px; padding: 12px; color: #0f172a;">${temporaryPassword}</div>

            <div style="background-color: #dc2626; color: white; border-radius: 8px; padding: 12px; margin-top: 14px; font-size: 12px; line-height: 1.6;">
              <strong>⚠️ Importante:</strong> após entrar, altere esta senha.
            </div>
          </div>

          <div style="text-align: center; margin: 18px 0 10px;">
            <a href="${loginUrl}"
              style="background-color: #16a34a; color: white; padding: 12px 26px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; font-size: 14px;">
              Fazer login agora
            </a>
          </div>
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:10px 0 0;">
            Link de login: <span style="word-break:break-all;color:#16a34a;">${loginUrl}</span>
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
              Se você não solicitou a redefinição, entre em contato com o suporte imediatamente.
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

    console.log("✅ Email sent:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Nova senha enviada com sucesso",
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
