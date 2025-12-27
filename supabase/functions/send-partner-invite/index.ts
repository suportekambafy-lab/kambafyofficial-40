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

    // Verificar se já existe um usuário com este email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("[send-partner-invite] Error listing users:", listError);
      throw listError;
    }
    
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    const userExists = !!existingUser;

    let userId: string;

    if (userExists) {
      // Usuário já existe - apenas vincular ao parceiro
      userId = existingUser.id;
      console.log(`[send-partner-invite] User already exists: ${userId}`);
      
      // Atualizar o partner com o user_id
      const { error: updateError } = await supabaseAdmin
        .from('partners')
        .update({ user_id: userId })
        .eq('id', partner_id);

      if (updateError) {
        console.error("[send-partner-invite] Error updating partner:", updateError);
        throw updateError;
      }

      // Enviar email informando que já tem acesso
      const { error: emailError } = await resend.emails.send({
        from: "Kambafy Payments <noreply@kambafy.com>",
        to: [email],
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
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">🎉 Parabéns, ${contact_name}!</h1>
              </div>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Sua candidatura como parceiro <strong>${company_name}</strong> foi <span style="color: #16a34a; font-weight: bold;">aprovada</span>!
              </p>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Você já possui uma conta na plataforma Kambafy. Use suas credenciais existentes para acessar o Portal de Parceiros:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://app.kambafy.com/partners/login" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
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
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 32px;">
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
      
      console.log(`[send-partner-invite] Existing user email sent to ${email}`);

    } else {
      // Criar novo usuário com senha temporária
      console.log(`[send-partner-invite] Creating new user for ${email}`);
      const tempPassword = `KP_${crypto.randomUUID().slice(0, 12)}`;
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: contact_name,
          is_partner: true,
        },
      });

      if (createError) {
        console.error("[send-partner-invite] Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`[send-partner-invite] Created new user: ${userId}`);

      // Atualizar o partner com o user_id
      const { error: updateError } = await supabaseAdmin
        .from('partners')
        .update({ user_id: userId })
        .eq('id', partner_id);

      if (updateError) {
        console.error("[send-partner-invite] Error updating partner:", updateError);
        throw updateError;
      }

      // Gerar link de reset de senha
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: 'https://app.kambafy.com/partners/login',
        },
      });

      if (resetError) {
        console.error("[send-partner-invite] Error generating reset link:", resetError);
        throw resetError;
      }

      const resetLink = resetData.properties.action_link;
      console.log(`[send-partner-invite] Generated reset link for ${email}`);

      // Enviar email com link para criar senha
      await resend.emails.send({
        from: "Kambafy Payments <noreply@kambafy.com>",
        to: [email],
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
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">🎉 Parabéns, ${contact_name}!</h1>
              </div>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Sua candidatura como parceiro <strong>${company_name}</strong> foi <span style="color: #16a34a; font-weight: bold;">aprovada</span>!
              </p>
              
              <p style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Para acessar o Portal de Parceiros, você precisa criar sua senha de acesso:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Criar Minha Senha
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; text-align: center;">
                Este link expira em 24 horas.
              </p>
              
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #166534; margin: 0; font-size: 14px;">
                  <strong>Após criar sua senha, você poderá:</strong><br>
                  ✅ Ver sua API Key para integração<br>
                  ✅ Configurar webhooks<br>
                  ✅ Acessar a documentação técnica<br>
                  ✅ Fazer pagamentos de teste
                </p>
              </div>
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin-top: 32px;">
                Kambafy Payments - Plataforma de Pagamentos para Angola
              </p>
            </div>
          </body>
          </html>
        `,
      });
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
