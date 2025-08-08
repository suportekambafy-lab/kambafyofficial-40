import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error('Supabase config missing');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: userRes } = await supabaseAuth.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const userId = userRes.user.id;
    console.log('🧹 Limpando subscriptions duplicadas para user:', userId);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Get all active subscriptions for user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    console.log(`📊 Encontradas ${subscriptions?.length || 0} subscriptions ativas`);

    if (!subscriptions || subscriptions.length <= 1) {
      return new Response(JSON.stringify({ 
        message: 'Nenhuma limpeza necessária',
        activeSubscriptions: subscriptions?.length || 0
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Keep only the most recent subscription, deactivate the rest
    const subscriptionsToDeactivate = subscriptions.slice(1);
    const idsToDeactivate = subscriptionsToDeactivate.map(s => s.id);

    console.log(`🗑️ Desativando ${idsToDeactivate.length} subscriptions antigas`);

    const { error: updateError } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', idsToDeactivate);

    if (updateError) throw updateError;

    console.log('✅ Limpeza concluída com sucesso');

    return new Response(JSON.stringify({ 
      message: 'Subscriptions duplicadas removidas',
      removedCount: idsToDeactivate.length,
      activeSubscriptions: 1
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erro na limpeza:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
