import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';

  if (!publicKey) {
    return new Response(JSON.stringify({ error: 'VAPID public key not set' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
