import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartnerInviteRequest {
  partner_id: string;
  email: string;
  company_name: string;
  contact_name: string;
}

const DEFAULT_APP_ORIGIN = "https://app.kambafy.com";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getAppOriginFromReq = (req: Request) => {
  const origin = req.headers.get("origin");
  // Em dev/preview, respeitar o Origin para manter os links funcionando no ambiente atual
  if (origin && origin.startsWith("http") && origin.includes("localhost")) return origin;
  // Em produção, forçar domínio principal do app para evitar redirecionamentos para /auth
  return DEFAULT_APP_ORIGIN;
};

// Use RPC to find user by email (avoids listUsers pagination issues)
const findUserIdByEmail = async (supabaseAdmin: any, email: string): Promise<string | null> => {
  const { data, error } = await supabaseAdmin.rpc('get_auth_user_id_by_email', { _email: email });
  if (error) {
    console.error("[send-partner-invite] RPC get_auth_user_id_by_email error:", error);
    return null;
  }
  return data;
};

const generateTempPassword = (): string => {
  // Senha curta o suficiente para digitar, mas ainda com boa entropia
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `KP_${raw}`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-partner-invite] Request received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { partner_id, email, company_name, contact_name }: PartnerInviteRequest = await req.json();
    
    console.log(`[send-partner-invite] Processing invite for ${email} (${company_name})`);

    if (!partner_id || !email || !company_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appOrigin = getAppOriginFromReq(req);
    const partnersLoginUrl = `${appOrigin}/partners/login`;

    const normalizedEmail = normalizeEmail(email);

    // 1) Encontrar/criar usuário e (re)definir uma senha temporária
    let userId: string;
    const tempPassword = generateTempPassword();

    const existingUserId = await findUserIdByEmail(supabaseAdmin, normalizedEmail);

    if (existingUserId) {
      userId = existingUserId;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: contact_name,
          is_partner: true,
        },
      });

      if (updateError) {
        console.error("[send-partner-invite] Error updating user password:", updateError);
        throw updateError;
      }

      console.log(`[send-partner-invite] Updated password for existing user: ${userId}`);
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: contact_name,
          is_partner: true,
        },
      });

      if (createError) {
        // Se o usuário existir mas RPC não encontrou (improvável), tentar RPC novamente
        if ((createError as any)?.code === "email_exists") {
          const fallbackUserId = await findUserIdByEmail(supabaseAdmin, normalizedEmail);
          if (!fallbackUserId) throw createError;

          userId = fallbackUserId;

          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: contact_name,
              is_partner: true,
            },
          });

          if (updateError) {
            console.error("[send-partner-invite] Error updating user password (fallback):", updateError);
            throw updateError;
          }

          console.log(`[send-partner-invite] User exists (fallback found) and password updated: ${userId}`);
        } else {
          console.error("[send-partner-invite] Error creating user:", createError);
          throw createError;
        }
      } else {
        userId = newUser.user.id;
        console.log(`[send-partner-invite] Created new user: ${userId}`);
      }
    }

    // 2) (Opcional) Vincular partner -> user_id
    // Nem todas as bases têm a coluna `partners.user_id`. Para evitar falhas no envio,
    // seguimos sem atualizar o partner e usamos o email como identificador.

    // 3) Enviar email com a senha temporária

    const contactNameSafe = contact_name || company_name;

    const tempPasswordHtml = `
        <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="color: #18181b; margin: 0 0 8px 0; font-size: 14px;"><strong>Seu acesso:</strong></p>
          <p style="color: #3f3f46; margin: 0 0 8px 0; font-size: 14px;">Email: <strong>${normalizedEmail}</strong></p>
          <p style="color: #3f3f46; margin: 0 0 8px 0; font-size: 14px;">Senha temporária:</p>
          <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; color: #18181b;">${tempPassword}</p>
          <p style="color: #71717a; margin: 8px 0 0 0; font-size: 12px;">Após entrar, altere sua senha nas configurações.</p>
        </div>
      `;

    // 4) Enviar email (sempre)
    const { error: emailError } = await resend.emails.send({
      from: "Kambafy Payments <noreply@kambafy.com>",
      to: [normalizedEmail],
      subject: "🎉 Sua candidatura como parceiro foi aprovada!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #18181b; font-size: 24px; margin: 0;">🎉 Parabéns, ${contactNameSafe}!</h1>
            </div>

            <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
              Sua candidatura como parceiro <strong>${company_name}</strong> foi <span style="color: #16a34a; font-weight: bold;">aprovada</span>!
            </p>

             <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
               Use as credenciais abaixo para entrar no Portal de Parceiros.
             </p>

             ${tempPasswordHtml}

             <div style="text-align: center; margin: 18px 0 0;">
               <a href="${partnersLoginUrl}" style="display: inline-block; background-color: #18181b; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                 Acessar Portal de Parceiros
               </a>
             </div>

            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #166534; margin: 0; font-size: 14px;">
                <strong>O que você pode fazer agora:</strong><br>
                ✅ Ver sua API Key para integração<br>
                ✅ Configurar webhooks<br>
                ✅ Acessar a documentação técnica<br>
                ✅ Fazer pagamentos de teste
              </p>
            </div>

            <p style="color: #71717a; font-size: 12px; text-align: center; margin-top: 28px;">
              Se você não solicitou isso, ignore este email.
            </p>

            <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 12px;">
              Kambafy Payments - Plataforma de Pagamentos para Angola
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("[send-partner-invite] Error sending email:", emailError);
      throw emailError;
    }

    console.log(`[send-partner-invite] Email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-partner-invite] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
