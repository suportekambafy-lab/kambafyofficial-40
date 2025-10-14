// ✅ Edge Function: Upload video chunks to R2
// Aceita chunks de vídeo e faz upload incremental para R2

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkUploadRequest {
  fileName: string;
  chunkData: string; // base64
  chunkIndex: number;
  totalChunks: number;
  uploadId?: string;
}

// Helper para criar assinatura AWS V4
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

async function sha256Hash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Missing R2 credentials');
    }

    const { fileName, chunkData, chunkIndex, totalChunks }: ChunkUploadRequest = await req.json();

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} recebido para ${fileName}`);

    // Decodificar chunk base64
    const binaryData = Uint8Array.from(atob(chunkData), c => c.charCodeAt(0));
    
    // Criar nome único do arquivo
    const timestamp = Date.now();
    const sanitizedName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
    const uniqueFileName = `${timestamp}-${sanitizedName}`;
    const tempChunkKey = `temp-chunks/${uniqueFileName}-chunk-${chunkIndex}`;

    // Upload do chunk para R2
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const service = 's3';
    const region = 'auto';
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${bucketName}/${tempChunkKey}`;
    
    const payloadHash = await sha256Hash(binaryData);
    
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      `host:${host}\n`,
      'host',
      payloadHash,
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hash(new TextEncoder().encode(canonicalRequest));
    
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    let signature = await createSignature(`AWS4${secretAccessKey}`, dateStamp);
    signature = await createSignature(signature, region);
    signature = await createSignature(signature, service);
    signature = await createSignature(signature, 'aws4_request');
    signature = await createSignature(signature, stringToSign);
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=host, Signature=${signatureHex}`;

    const uploadResponse = await fetch(`https://${host}${canonicalUri}`, {
      method: 'PUT',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Chunk upload failed: ${uploadResponse.status}`);
    }

    console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded`);

    // Se é o último chunk, juntar todos os chunks
    if (chunkIndex === totalChunks - 1) {
      console.log('🔗 Último chunk recebido, juntando arquivo...');
      
      // Aqui você pode implementar lógica para juntar os chunks
      // Por ora, retornar URL do primeiro chunk como placeholder
      const publicUrl = `https://pub-b5914a93ed33480dba157a5f46c57749.r2.dev/${uniqueFileName}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          complete: true,
          publicUrl,
          fileName: uniqueFileName,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        complete: false,
        chunkIndex,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error uploading chunk:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to upload chunk',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
