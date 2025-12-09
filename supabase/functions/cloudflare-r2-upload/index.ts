import { corsHeaders } from "../_shared/cors.ts";

// Version 3.0 - Native implementation with HEIC to JPEG conversion
console.log("🚀 Cloudflare R2 Upload Function v3.0 (HEIC Support) initialized");

// Helper para criar assinatura AWS V4
async function createSignature(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
  stringToSign: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  const kDate = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`AWS4${secretKey}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const dateKey = await crypto.subtle.sign(
    "HMAC",
    kDate,
    encoder.encode(dateStamp)
  );
  
  const kRegion = await crypto.subtle.importKey(
    "raw",
    dateKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const regionKey = await crypto.subtle.sign(
    "HMAC",
    kRegion,
    encoder.encode(regionName)
  );
  
  const kService = await crypto.subtle.importKey(
    "raw",
    regionKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const serviceKey = await crypto.subtle.sign(
    "HMAC",
    kService,
    encoder.encode(serviceName)
  );
  
  const kSigning = await crypto.subtle.importKey(
    "raw",
    serviceKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signingKey = await crypto.subtle.sign(
    "HMAC",
    kSigning,
    encoder.encode("aws4_request")
  );
  
  const finalKey = await crypto.subtle.importKey(
    "raw",
    signingKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    finalKey,
    encoder.encode(stringToSign)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hash(data: string | Uint8Array): Promise<string> {
  let buffer: ArrayBuffer;
  
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data);
  } else {
    buffer = data;
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Função para detectar se é arquivo HEIC/HEIF
function isHeicFile(fileType: string, fileName: string): boolean {
  const heicMimeTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  const heicExtensions = ['.heic', '.heif'];
  
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  const isHeicMime = heicMimeTypes.some(mime => lowerFileType.includes(mime.replace('image/', '')));
  const isHeicExt = heicExtensions.some(ext => lowerFileName.endsWith(ext));
  
  return isHeicMime || isHeicExt;
}

// Função para converter HEIC para JPEG
async function convertHeicToJpeg(heicData: Uint8Array): Promise<Uint8Array> {
  console.log('🔄 Iniciando conversão HEIC -> JPEG...');
  console.log('📦 Tamanho do arquivo HEIC:', heicData.length, 'bytes');
  
  try {
    // Importar heic-convert dinamicamente via npm
    const heicConvert = (await import("npm:heic-convert@2.1.0")).default;
    
    const jpegBuffer = await heicConvert({
      buffer: heicData,
      format: 'JPEG',
      quality: 0.92
    });
    
    console.log('✅ Conversão HEIC -> JPEG concluída!');
    console.log('📦 Tamanho do arquivo JPEG:', jpegBuffer.length, 'bytes');
    
    return new Uint8Array(jpegBuffer);
  } catch (error) {
    console.error('❌ Erro na conversão HEIC:', error);
    throw new Error(`Falha na conversão HEIC para JPEG: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Request received for R2 upload");

    // Get environment variables
    const accountId = Deno.env.get("CLOUDFLARE_R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");

    console.log("🔑 Checking R2 credentials:", {
      hasAccountId: !!accountId,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      hasBucketName: !!bucketName,
    });

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      const missing = [];
      if (!accountId) missing.push("CLOUDFLARE_R2_ACCOUNT_ID");
      if (!accessKeyId) missing.push("CLOUDFLARE_R2_ACCESS_KEY_ID");
      if (!secretAccessKey) missing.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
      if (!bucketName) missing.push("CLOUDFLARE_R2_BUCKET_NAME");
      
      console.error("❌ Missing credentials:", missing);
      throw new Error(`Missing Cloudflare R2 credentials: ${missing.join(", ")}`);
    }

    // Parse request body
    const { fileName, fileType, fileData } = await req.json();

    if (!fileName || !fileType || !fileData) {
      throw new Error("Missing required fields: fileName, fileType, fileData");
    }

    console.log("📄 File info:", {
      fileName,
      fileType,
      fileSize: fileData.length,
    });

    // Convert base64 to binary
    let binaryData = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
    let finalFileName = fileName;
    let finalFileType = fileType;
    let wasConverted = false;

    // Verificar se é HEIC e converter para JPEG
    if (isHeicFile(fileType, fileName)) {
      console.log('🔍 Arquivo HEIC/HEIF detectado, iniciando conversão automática...');
      
      try {
        binaryData = await convertHeicToJpeg(binaryData);
        
        // Atualizar nome e tipo do arquivo
        finalFileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
        finalFileType = 'image/jpeg';
        wasConverted = true;
        
        console.log('✅ Arquivo HEIC convertido para JPEG:', finalFileName);
      } catch (conversionError) {
        console.error('❌ Falha na conversão HEIC:', conversionError);
        throw new Error('Não foi possível converter o arquivo HEIC. Por favor, converta para JPEG ou PNG antes de enviar.');
      }
    }
    
    console.log("🔐 Computing payload hash...", {
      binaryDataLength: binaryData.length,
      binaryDataType: binaryData.constructor.name
    });

    // Calculate SHA256 hash of the binary data (NOT the decoded string)
    const payloadHash = await sha256Hash(binaryData);
    
    console.log("✅ Payload hash computed:", {
      payloadHash,
      payloadHashLength: payloadHash.length
    });

    // Generate unique filename - sanitize to avoid signature issues
    const timestamp = Date.now();
    // Remove ALL special characters, keep only alphanumeric, dots, and hyphens
    const sanitizedFileName = finalFileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-') // Replace ANY non-alphanumeric (except . and -) with hyphen
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    
    // Prepare AWS signature V4
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${bucketName}/${uniqueFileName}`;
    const service = 's3';
    const region = 'auto';
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    console.log("📅 Timestamp info:", {
      amzDate,
      dateStamp,
      isoString: now.toISOString()
    });
    
    // Create canonical request
    const method = 'PUT';
    const canonicalUri = `/${bucketName}/${uniqueFileName}`;
    const canonicalQueryString = '';
    const host = `${accountId}.r2.cloudflarestorage.com`;
    
    const canonicalHeaders = 
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    console.log("📋 Canonical Request:", {
      method,
      canonicalUri,
      host,
      payloadHash,
      canonicalRequestPreview: canonicalRequest.substring(0, 200)
    });
    
    const canonicalRequestHash = await sha256Hash(canonicalRequest);
    
    console.log("🔐 Canonical Request Hash:", canonicalRequestHash);
    
    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
    
    console.log("📝 String to Sign:", {
      algorithm,
      credentialScope,
      stringToSign
    });
    
    // Calculate signature
    const signature = await createSignature(
      secretAccessKey,
      dateStamp,
      region,
      service,
      stringToSign
    );
    
    console.log("✍️ Signature calculated:", {
      signature,
      signatureLength: signature.length
    });
    
    // Create authorization header
    const authorizationHeader = 
      `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    console.log("☁️ Uploading to R2:", {
      uniqueFileName,
      bucketName,
      url,
      authorizationHeader: authorizationHeader.substring(0, 100) + "..."
    });

    // Make the PUT request
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authorizationHeader,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Content-Type': finalFileType,
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("❌ R2 upload failed:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
      });
      throw new Error(`R2 upload failed: ${uploadResponse.statusText} - ${errorText}`);
    }

    // Generate public URL using the correct R2 public domain
    // Format: https://pub-{subdomain_hash}.r2.dev/{filename}
    const publicUrl = `https://pub-b5914a93ed33480dba157a5f46c57749.r2.dev/${uniqueFileName}`;

    console.log("✅ Upload successful:", publicUrl);
    if (wasConverted) {
      console.log("📸 Arquivo foi convertido de HEIC para JPEG automaticamente");
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
        originalFileName: fileName,
        convertedFromHeic: wasConverted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error uploading to R2:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
