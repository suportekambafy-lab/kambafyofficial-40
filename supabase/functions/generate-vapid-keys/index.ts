import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64UrlEncode(buf: Uint8Array): string {
  let str = btoa(String.fromCharCode(...buf));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBytes(b64url: string): Uint8Array {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Gera um par de chaves P-256 apropriado para VAPID
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey) as JsonWebKey & { x: string; y: string };
  const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey) as JsonWebKey & { d: string };

  // Chave pública VAPID = 0x04 || X || Y
  const x = base64UrlDecodeToBytes(pubJwk.x);
  const y = base64UrlDecodeToBytes(pubJwk.y);
  const pub = new Uint8Array(65);
  pub[0] = 0x04;
  pub.set(x, 1);
  pub.set(y, 33);

  const publicKey = base64UrlEncode(pub);
  const privateKey = privJwk.d; // já em base64url

  const subject = 'mailto:suporte@kambafy.com';

  return new Response(JSON.stringify({ publicKey, privateKey, subject }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
