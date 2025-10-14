// ✅ Edge Function: Generate R2 presigned upload URL
// Permite upload direto do browser para R2 sem passar pela edge function

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadUrlRequest {
  fileName: string;
  fileType?: string;
}

// Helper para criar assinatura AWS V4
async function createSignature(key: string, message: string): Promise<ArrayBuffer> {
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

async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Generating R2 presigned upload URL');

    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Missing R2 credentials');
    }

    const { fileName, fileType }: UploadUrlRequest = await req.json();

    if (!fileName) {
      throw new Error('fileName is required');
    }

    // Sanitizar nome do arquivo
    const timestamp = Date.now();
    const sanitizedName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
    const uniqueFileName = `${timestamp}-${sanitizedName}`;

    // Criar timestamp para assinatura
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    // Configurações AWS S3
    const service = 's3';
    const region = 'auto';
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${bucketName}/${uniqueFileName}`;
    
    // Política de upload (válida por 1 hora)
    const expirationTime = new Date(now.getTime() + 3600000).toISOString();
    
    // Criar canonical request para presigned URL
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${accessKeyId}/${credentialScope}`;
    
    // Query parameters para presigned URL
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': algorithm,
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '3600', // 1 hora
      'X-Amz-SignedHeaders': 'host',
    });

    // Canonical request
    const canonicalQueryString = queryParams.toString();
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';
    
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const canonicalRequestHash = await sha256Hash(canonicalRequest);
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Calcular assinatura
    let signature = await createSignature(`AWS4${secretAccessKey}`, dateStamp);
    signature = await createSignature(signature, region);
    signature = await createSignature(signature, service);
    signature = await createSignature(signature, 'aws4_request');
    signature = await createSignature(signature, stringToSign);
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // URL final com assinatura
    const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signatureHex}`;
    const publicUrl = `https://pub-b5914a93ed33480dba157a5f46c57749.r2.dev/${uniqueFileName}`;

    console.log('✅ Presigned URL gerada:', {
      uniqueFileName,
      expiresIn: '1 hour',
    });

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        publicUrl,
        fileName: uniqueFileName,
        expiresIn: 3600,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error generating presigned URL:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate upload URL',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
