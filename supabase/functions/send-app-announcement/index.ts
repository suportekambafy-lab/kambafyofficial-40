import { createClient } from "jsr:@supabase/supabase-js@2";

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
                    <a href="https://play.google.com/store/apps/details?id=com.converta.kambafy" style="display: inline-block; margin: 0 10px 15px; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      📱 Descarregar no Google Play
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <!-- App Store -->
                    <a href="https://apps.apple.com/pt/app/kambafy/id6752709065" style="display: inline-block; margin: 0 10px; padding: 12px 24px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
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
        
        // Record this email as sent (ignore if already exists due to unique constraint)
        const { error: recordError } = await supabase
          .from("app_announcement_sent")
          .insert({
            email: user.email,
            announcement_type: "app_launch"
          });
        
        // Only log if it's not a duplicate key error
        if (recordError && !recordError.message?.includes('duplicate')) {
          console.error(`[APP_ANNOUNCEMENT_BG] Error recording email for ${user.email}:`, recordError);
        }
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

    // Check if there's an active processing job from the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: activeProgress } = await supabase
      .from("app_announcement_progress")
      .select("*")
      .eq("announcement_type", "app_launch")
      .eq("status", "processing")
      .gte("started_at", tenMinutesAgo)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeProgress) {
      console.log("[APP_ANNOUNCEMENT] There is already an active sending process from the last 10 minutes");
      return new Response(
        JSON.stringify({ 
          error: "Already processing", 
          message: "Já existe um envio em andamento dos últimos 10 minutos. Aguarde a conclusão.",
          progressId: activeProgress.id,
          startedAt: activeProgress.started_at
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Auto-cleanup stuck processes older than 10 minutes
    const { data: stuckProcesses } = await supabase
      .from("app_announcement_progress")
      .select("id")
      .eq("status", "processing")
      .lt("started_at", tenMinutesAgo);

    if (stuckProcesses && stuckProcesses.length > 0) {
      console.log(`[APP_ANNOUNCEMENT] Cleaning up ${stuckProcesses.length} stuck processes`);
      await supabase
        .from("app_announcement_progress")
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("status", "processing")
        .lt("started_at", tenMinutesAgo);
    }

    // Fetch ALL users with emails from profiles (with pagination)
    console.log("[APP_ANNOUNCEMENT] Fetching all users with emails...");
    let allUsers: Array<{ user_id: string; email: string; full_name: string | null }> = [];
    let page = 0;
    const pageSize = 1000;
    
    if (test_mode) {
      // Test mode - apenas 5 usuários
      const { data: testUsers, error: fetchError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .not("email", "is", null)
        .limit(5);
      
      if (fetchError) {
        console.error("[APP_ANNOUNCEMENT] Error fetching users:", fetchError);
        throw new Error(`Failed to fetch users: ${fetchError.message}`);
      }
      
      allUsers = testUsers || [];
      console.log(`[APP_ANNOUNCEMENT] Test mode: fetched ${allUsers.length} users`);
    } else {
      // Production mode - buscar todos com paginação
      let fetchMore = true;
      while (fetchMore) {
        console.log(`[APP_ANNOUNCEMENT] Fetching page ${page + 1}...`);
        
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data: pageUsers, error: fetchError } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .not("email", "is", null)
          .range(from, to);
        
        if (fetchError) {
          console.error("[APP_ANNOUNCEMENT] Error fetching users:", fetchError);
          throw new Error(`Failed to fetch users: ${fetchError.message}`);
        }
        
        if (!pageUsers || pageUsers.length === 0) {
          console.log(`[APP_ANNOUNCEMENT] No more users found on page ${page + 1}`);
          fetchMore = false;
          break;
        }
        
        allUsers = allUsers.concat(pageUsers);
        console.log(`[APP_ANNOUNCEMENT] Fetched page ${page + 1}: ${pageUsers.length} users, total so far: ${allUsers.length}`);
        
        // Se recebemos menos que o tamanho da página, é a última página
        if (pageUsers.length < pageSize) {
          console.log(`[APP_ANNOUNCEMENT] Last page reached (got ${pageUsers.length} < ${pageSize})`);
          fetchMore = false;
        }
        
        page++;
        
        // Limite de segurança para evitar loops infinitos (máx 10 páginas = 10k usuários)
        if (page >= 10) {
          console.log("[APP_ANNOUNCEMENT] Safety limit reached (10 pages)");
          fetchMore = false;
        }
      }
    }
    
    const users = allUsers;
    console.log(`[APP_ANNOUNCEMENT] Total users fetched: ${users.length}`);
    
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

    // Check which emails have already received this announcement (with pagination)
    console.log("[APP_ANNOUNCEMENT] Fetching sent emails...");
    let allSentEmails: Array<{ email: string }> = [];
    page = 0;
    
    let fetchMoreSent = true;
    while (fetchMoreSent) {
      console.log(`[APP_ANNOUNCEMENT] Fetching sent emails page ${page + 1}...`);
      
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: pageSent, error: sentError } = await supabase
        .from("app_announcement_sent")
        .select("email")
        .eq("announcement_type", "app_launch")
        .range(from, to);
      
      if (sentError) {
        console.error("[APP_ANNOUNCEMENT] Error checking sent emails:", sentError);
        break;
      }
      
      if (!pageSent || pageSent.length === 0) {
        console.log(`[APP_ANNOUNCEMENT] No more sent emails on page ${page + 1}`);
        fetchMoreSent = false;
        break;
      }
      
      allSentEmails = allSentEmails.concat(pageSent);
      console.log(`[APP_ANNOUNCEMENT] Fetched sent emails page ${page + 1}: ${pageSent.length} emails, total so far: ${allSentEmails.length}`);
      
      if (pageSent.length < pageSize) {
        console.log(`[APP_ANNOUNCEMENT] Last page of sent emails (got ${pageSent.length} < ${pageSize})`);
        fetchMoreSent = false;
      }
      
      page++;
      
      // Limite de segurança
      if (page >= 10) {
        console.log("[APP_ANNOUNCEMENT] Safety limit reached for sent emails (10 pages)");
        fetchMoreSent = false;
      }
    }

    const sentEmails = new Set(allSentEmails.map(r => r.email));
    console.log(`[APP_ANNOUNCEMENT] Total sent emails: ${sentEmails.size}`);
    
    // Filtrar usuários válidos (com emails válidos)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usersToSend = users.filter(user => 
      !sentEmails.has(user.email) && emailRegex.test(user.email)
    );
    
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

Deno.serve(handler);
