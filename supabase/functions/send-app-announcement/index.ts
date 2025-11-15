import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendResult {
  success: boolean;
  totalUsers: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string; details?: any }>;
  duration: number;
  timestamp: string;
}

// Email template
const createEmailHtml = (name: string | null) => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kambafy - App Disponível</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1.2;">
                📱 Kambafy agora no seu telemóvel!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${name ? `<p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">Olá, ${name}!</p>` : ''}
              
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.6;">
                Temos uma ótima notícia: a aplicação móvel Kambafy já está disponível para descarregar!
              </p>
              
              <p style="margin: 0 0 25px; font-size: 16px; color: #333; line-height: 1.6;">
                Agora pode gerir o seu negócio digital de forma ainda mais prática, com todas as funcionalidades da plataforma ao seu alcance:
              </p>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; font-size: 15px; color: #555; line-height: 1.8;">
                <li style="margin-bottom: 8px;">Gerir os seus produtos e vendas</li>
                <li style="margin-bottom: 8px;">Acompanhar os seus alunos e cursos</li>
                <li style="margin-bottom: 8px;">Receber notificações em tempo real</li>
                <li style="margin-bottom: 8px;">Aceder às suas métricas e relatórios</li>
              </ul>
              
              <!-- Download Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <!-- Google Play -->
                    <a href="https://play.google.com/store/apps/details?id=dev.kambafy.twa" style="display: inline-block; margin: 0 10px 15px; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      📱 Descarregar no Google Play
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <!-- App Store -->
                    <a href="https://apps.apple.com/us/app/kambafy/id6739149041" style="display: inline-block; margin: 0 10px; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      🍎 Descarregar na App Store
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; font-size: 14px; color: #666; line-height: 1.6;">
                Descarregue agora e tenha a Kambafy sempre consigo!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #fafafa;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                Atenciosamente,<br>
                <strong style="color: #1a1a1a;">Equipa Kambafy</strong>
              </p>
              <p style="margin: 15px 0 0; font-size: 12px; color: #999;">
                © 2025 Kambafy. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Background task to send emails
async function sendEmailsInBackground(
  usersToSend: Array<{ email: string; full_name: string | null }>,
  resendApiKey: string,
  supabaseUrl: string,
  supabaseKey: string,
  progressId: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  let sent = 0;
  let failed = 0;

  console.log(`[APP_ANNOUNCEMENT_BG] Starting background email send for ${usersToSend.length} users`);

  // Process 2 emails at a time (respecting 2 req/s rate limit)
  for (let i = 0; i < usersToSend.length; i += 2) {
    const batch = usersToSend.slice(i, Math.min(i + 2, usersToSend.length));
    
    console.log(`[APP_ANNOUNCEMENT_BG] Processing emails ${i + 1}-${Math.min(i + 2, usersToSend.length)}/${usersToSend.length}`);

    const batchPromises = batch.map(async (user) => {
      try {
        const emailData = {
          from: "Kambafy <noreply@kambafy.com>",
          to: [user.email],
          subject: "🎉 Novidades na Kambafy - Confira agora!",
          html: createEmailHtml(user.full_name),
        };

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(emailData),
        });

        const responseData = await response.json();

        if (!response.ok) {
          console.error(`[APP_ANNOUNCEMENT_BG] Resend API Error for ${user.email}:`, {
            status: response.status,
            data: responseData
          });
          throw new Error(responseData.message || `Resend API error: ${response.status}`);
        }

        console.log(`[APP_ANNOUNCEMENT_BG] ✓ Email sent to ${user.email}`);
        sent++;
        
        // Record this email as sent
        await supabase
          .from("app_announcement_sent")
          .insert({
            email: user.email,
            announcement_type: "app_launch"
          });
      } catch (error) {
        failed++;
        console.error(`[APP_ANNOUNCEMENT_BG] ✗ Failed to send to ${user.email}:`, error);
      }
    });

    await Promise.all(batchPromises);

    // Update progress after each batch
    await supabase
      .from("app_announcement_progress")
      .update({
        sent,
        failed,
        updated_at: new Date().toISOString()
      })
      .eq("id", progressId);

    // Wait 1 second before processing next pair
    if (i + 2 < usersToSend.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Mark as completed
  await supabase
    .from("app_announcement_progress")
    .update({
      sent,
      failed,
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", progressId);

  console.log(`[APP_ANNOUNCEMENT_BG] Completed: ${sent} sent, ${failed} failed`);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();
  
  try {
    // Validate RESEND_API_KEY exists
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[APP_ANNOUNCEMENT] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "RESEND_API_KEY não configurada. Configure em Supabase Dashboard > Edge Functions > Secrets",
          resendDashboard: "https://resend.com/api-keys"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { test_mode } = await req.json();
    
    console.log("[APP_ANNOUNCEMENT] Starting email send process", { test_mode, resendKeyExists: !!resendApiKey });
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch users with emails from profiles
    let query = supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .not("email", "is", null);
    
    if (test_mode) {
      query = query.limit(5);
    }
    
    const { data: users, error: fetchError } = await query;

    if (fetchError) {
      console.error("[APP_ANNOUNCEMENT] Error fetching users:", fetchError);
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }
    
    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          errors: [],
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`[APP_ANNOUNCEMENT] Found ${users.length} users to notify`);

    // Check which emails have already received this announcement
    const { data: alreadySent, error: sentError } = await supabase
      .from("app_announcement_sent")
      .select("email")
      .eq("announcement_type", "app_launch");

    if (sentError) {
      console.error("[APP_ANNOUNCEMENT] Error checking sent emails:", sentError);
    }

    const sentEmails = new Set(alreadySent?.map(r => r.email) || []);
    const usersToSend = users.filter(user => !sentEmails.has(user.email));
    
    console.log(`[APP_ANNOUNCEMENT] Already sent to ${sentEmails.size} users, will send to ${usersToSend.length} remaining users`);

    if (usersToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          totalUsers: 0,
          sent: 0,
          failed: 0,
          errors: [],
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          message: "Todos os usuários já receberam este anúncio"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create progress record
    const { data: progressRecord, error: progressError } = await supabase
      .from("app_announcement_progress")
      .insert({
        total_users: usersToSend.length,
        sent: 0,
        failed: 0,
        status: 'processing',
        announcement_type: 'app_launch'
      })
      .select()
      .single();

    if (progressError || !progressRecord) {
      console.error("[APP_ANNOUNCEMENT] Error creating progress record:", progressError);
      throw new Error("Failed to create progress record");
    }

    // Start background task to send emails
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      sendEmailsInBackground(usersToSend, resendApiKey, supabaseUrl, supabaseKey, progressRecord.id)
    );

    // Return immediate response with progress ID
    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: usersToSend.length,
        sent: 0,
        failed: 0,
        errors: [],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        message: `Envio iniciado para ${usersToSend.length} usuários. O processo continuará em segundo plano.`,
        processing: true,
        progressId: progressRecord.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Erro geral no envio de emails:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
