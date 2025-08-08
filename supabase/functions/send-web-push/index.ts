import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import webpush from "npm:web-push@3.6.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-call',
};

type SendRequest = {
  user_id?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, title, body, url, tag, data }: SendRequest = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error('Supabase config missing');
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('VAPID keys not configured');

    // Determine caller: user (JWT) or internal service
    const authHeader = req.headers.get('Authorization');
    const isServiceCall = req.headers.get('x-service-call') === 'true';
    let targetUserId = user_id || '';

    console.log('🔍 Auth header exists:', !!authHeader);
    console.log('🔍 Is service call:', isServiceCall);
    console.log('🔍 Target user ID:', targetUserId);

    if (authHeader?.startsWith('Bearer ') && !isServiceCall) {
      // Only validate JWT for non-service calls with auth header
      const supabaseAuth = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await supabaseAuth.auth.getUser();
      if (!userRes?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      // Force to the auth user
      targetUserId = userRes.user.id;
    } else if (isServiceCall) {
      // Allow internal calls with x-service-call header
      console.log('✅ Service call authorized');
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'user_id required for service calls' }), { status: 400, headers: corsHeaders });
      }
    } else if (!authHeader && !targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing authentication or user_id' }), { status: 400, headers: corsHeaders });
    }

    if (!targetUserId) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Fetch active subscriptions
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (subsError) throw subsError;

    // Configure VAPID
    webpush.setVapidDetails('mailto:no-reply@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload = JSON.stringify({
      title: title || 'Notificação',
      body: body || 'Você tem uma nova notificação',
      url: url || '/',
      tag: tag || 'kambafy-push',
      data: data || {},
    });

    let sent = 0;
    let removed = 0;

    if (subs && subs.length) {
      const toDeactivate: string[] = [];

      for (const s of subs) {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        } as any;

        try {
          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch (err: any) {
          const status = err?.statusCode || err?.status || 0;
          // 404/410: subscription is gone
          if (status === 404 || status === 410) {
            toDeactivate.push(s.id);
          } else {
            console.error('Push send error:', status, err?.message);
          }
        }
      }

      if (toDeactivate.length) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', toDeactivate);
        removed = toDeactivate.length;
      }
    }

    return new Response(JSON.stringify({ sent, removed }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
