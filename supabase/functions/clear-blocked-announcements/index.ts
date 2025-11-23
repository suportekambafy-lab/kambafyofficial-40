import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CLEAR_BLOCKED] Starting cleanup of blocked announcement processes");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all processing records OR completed with suspiciously low counts
    const { data: processingRecords, error: fetchError } = await supabase
      .from("app_announcement_progress")
      .select("*")
      .or('status.eq.processing,and(status.eq.completed,total_users.lt.100)')
      .order("started_at", { ascending: false });

    if (fetchError) {
      console.error("[CLEAR_BLOCKED] Error fetching processing records:", fetchError);
      throw new Error(`Failed to fetch processing records: ${fetchError.message}`);
    }

    if (!processingRecords || processingRecords.length === 0) {
      console.log("[CLEAR_BLOCKED] No blocked processes found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum processo bloqueado encontrado",
          cleared: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[CLEAR_BLOCKED] Found ${processingRecords.length} blocked processes`);

    // Update all to failed (not completed, to trigger new send)
    const { error: updateError } = await supabase
      .from("app_announcement_progress")
      .update({
        status: "failed",
        completed_at: new Date().toISOString()
      })
      .or('status.eq.processing,and(status.eq.completed,total_users.lt.100)');

    if (updateError) {
      console.error("[CLEAR_BLOCKED] Error updating records:", updateError);
      throw new Error(`Failed to update records: ${updateError.message}`);
    }

    console.log(`[CLEAR_BLOCKED] ✅ Successfully cleared ${processingRecords.length} blocked processes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${processingRecords.length} processo(s) bloqueado(s) limpo(s) com sucesso`,
        cleared: processingRecords.length,
        records: processingRecords
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("[CLEAR_BLOCKED] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
