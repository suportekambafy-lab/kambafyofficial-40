import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function createSignature(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : key;
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, messageData);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_ACCESS_KEY_ID');
    const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_SECRET_ACCESS_KEY');
    const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_BUCKET_NAME');

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      throw new Error('Cloudflare R2 credentials not configured');
    }

    const { fileName, fileType } = await req.json();

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    const folder = fileType.startsWith('image/') ? 'product-covers' : 'ebooks';
    const key = `${folder}/${uniqueFileName}`;

    // Configurar parâmetros para presigned URL
    const region = 'auto';
    const service = 's3';
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    
    // Data e hora
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    // Configurar query parameters para presigned URL
    const expiresIn = 3600; // 1 hora
    const algorithm = 'AWS4-HMAC-SHA256';
    const credential = `${R2_ACCESS_KEY_ID}/${dateStamp}/${region}/${service}/aws4_request`;
    
    const canonicalQuerystring = [
      `X-Amz-Algorithm=${algorithm}`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresIn}`,
      `X-Amz-SignedHeaders=host`
    ].join('&');

    // Criar canonical request
    const canonicalUri = `/${R2_BUCKET_NAME}/${key}`;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Criar string to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const encoder = new TextEncoder();
    const canonicalRequestHash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Calcular assinatura
    const kDate = await createSignature(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
    const kRegion = await createSignature(kDate, region);
    const kService = await createSignature(kRegion, service);
    const kSigning = await createSignature(kService, 'aws4_request');
    const signature = Array.from(
      new Uint8Array(await createSignature(kSigning, stringToSign))
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    // Montar presigned URL
    const presignedUrl = `https://${host}/${R2_BUCKET_NAME}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

    console.log('✅ Presigned URL gerada para:', uniqueFileName);

    return new Response(
      JSON.stringify({
        uploadUrl: presignedUrl,
        publicUrl: `https://pub-b5914a93ed33480dba157a5f46c57749.r2.dev/${key}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
