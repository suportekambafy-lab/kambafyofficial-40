import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !userData?.user?.email) {
      console.log("[partner-update-webhook] getUser error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = userData.user.email;

    // Buscar parceiro pelo email
    const { data: partner, error: partnerError } = await supabaseAdmin
      .from("partners")
      .select("id, status")
      .ilike("contact_email", email)
      .maybeSingle();

    if (partnerError || !partner) {
      console.log("[partner-update-webhook] partner lookup error:", partnerError?.message);
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (partner.status !== 'approved') {
      return new Response(JSON.stringify({ error: "Partner not approved" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Obter dados do body
    const body = await req.json();
    const { webhook_url, webhook_secret } = body;

    // Atualizar webhook
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (webhook_url !== undefined) {
      updateData.webhook_url = webhook_url || null;
    }

    if (webhook_secret !== undefined) {
      updateData.webhook_secret = webhook_secret;
    }

    const { error: updateError } = await supabaseAdmin
      .from("partners")
      .update(updateData)
      .eq("id", partner.id);

    if (updateError) {
      console.log("[partner-update-webhook] update error:", updateError.message);
      return new Response(JSON.stringify({ error: "Failed to update webhook" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[partner-update-webhook] Successfully updated webhook for partner ${partner.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.log("[partner-update-webhook] unexpected error:", error?.message);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
