import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Buscando todos os usuários cadastrados...');

    // Buscar todos os usuários da tabela profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name, user_id')
      .not('email', 'is', null);

    if (profilesError) {
      console.error('❌ Erro ao buscar usuários:', profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`📧 Encontrados ${profiles?.length || 0} usuários para enviar emails`);

    const results = {
      total: profiles?.length || 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhum usuário encontrado para enviar emails",
          results
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Enviar emails para cada usuário
    for (const profile of profiles) {
      try {
        if (!profile.email) {
          console.log('⚠️ Usuário sem email, pulando...');
          continue;
        }

        // Gerar link de recuperação
        const { data, error } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: profile.email,
          options: {
            redirectTo: 'https://app.kambafy.com/reset-password'
          }
        });

        if (error) {
          console.error(`❌ Erro ao gerar link para ${profile.email}:`, error);
          results.failed++;
          results.errors.push(`${profile.email}: ${error.message}`);
          continue;
        }

        const resetLink = data.properties.action_link;
        
        const userName = profile.full_name || 'Usuário';
        
        // Enviar email
        const { error: emailError } = await resend.emails.send({
          from: "Kambafy <noreply@kambafy.com>",
          to: [profile.email],
          subject: "Defina sua Senha - Kambafy",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #16a34a; color: white; width: 60px; height: 60px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                  <span style="font-size: 24px; font-weight: bold;">K</span>
                </div>
                <h1 style="color: #16a34a; margin-bottom: 10px;">Defina sua Senha</h1>
                <p style="color: #666; font-size: 16px;">Crie uma senha segura para sua conta Kambafy</p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                  Olá ${userName}! Para garantir a segurança da sua conta Kambafy, recomendamos que você defina uma senha permanente.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Definir Senha
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                  <span style="word-break: break-all; color: #16a34a;">${resetLink}</span>
                </p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                  Se você não solicitou esta conta, pode ignorar este email com segurança.
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
          console.error(`❌ Erro ao enviar email para ${profile.email}:`, emailError);
          results.failed++;
          results.errors.push(`${profile.email}: Erro ao enviar email`);
        } else {
          console.log(`✅ Email enviado para ${profile.email}`);
          results.sent++;
        }

        // Pequeno delay para não sobrecarregar o servidor de email
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${profile.email}:`, error);
        results.failed++;
        results.errors.push(`${profile.email}: ${error.message}`);
      }
    }

    console.log('✅ Processo concluído:', results);

    return new Response(
      JSON.stringify({ 
        message: "Processo de envio concluído",
        results
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
    console.error("Error in send-bulk-password-reset function:", error);
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
