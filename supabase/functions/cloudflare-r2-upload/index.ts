import { corsHeaders } from "../_shared/cors.ts";

// Version 2.0 - Native implementation without AWS SDK
console.log("🚀 Cloudflare R2 Upload Function v2.0 (Native Implementation) initialized");

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
    const binaryData = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
    
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

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    
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
        'Content-Type': fileType,
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

    // Generate public URL (use your custom domain if configured)
    const publicUrl = `https://pub-${accountId}.r2.dev/${uniqueFileName}`;

    console.log("✅ Upload successful:", publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
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
