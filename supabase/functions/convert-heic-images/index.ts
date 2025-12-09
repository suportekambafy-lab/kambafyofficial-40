import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🔄 HEIC Image Converter Function v2.0 initialized");

// Helper para criar assinatura AWS V4
async function createSignature(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
  stringToSign: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  const kDate = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", encoder.encode("AWS4" + secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(dateStamp)
  );
  
  const kRegion = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(regionName)
  );
  
  const kService = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(serviceName)
  );
  
  const kSigning = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode("aws4_request")
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(stringToSign)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function uploadToR2(binaryData: Uint8Array, fileName: string): Promise<string> {
  const R2_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || Deno.env.get("R2_ACCOUNT_ID");
  const R2_ACCESS_KEY_ID = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID") || Deno.env.get("R2_ACCESS_KEY_ID");
  const R2_SECRET_ACCESS_KEY = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY") || Deno.env.get("R2_SECRET_ACCESS_KEY");
  const R2_BUCKET_NAME = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME") || Deno.env.get("R2_BUCKET_NAME") || "kambafy-files";

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials not configured");
  }

  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${fileName}`;
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${R2_BUCKET_NAME}/${uniqueFileName}`;
  
  const payloadHash = await sha256(binaryData);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  
  const canonicalHeaders = `content-type:image/jpeg\nhost:${R2_ACCOUNT_ID}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `PUT\n/${R2_BUCKET_NAME}/${uniqueFileName}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
  
  const signature = await createSignature(R2_SECRET_ACCESS_KEY, dateStamp, region, service, stringToSign);
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authorizationHeader,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Content-Type': 'image/jpeg',
    },
    body: binaryData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed: ${response.status} - ${errorText}`);
  }

  return `https://pub-b5914a93ed33480dba157a5f46c57749.r2.dev/${uniqueFileName}`;
}

// Função para converter HEIC para JPEG com qualidade menor para ser mais rápido
async function convertHeicToJpeg(heicData: Uint8Array): Promise<Uint8Array> {
  console.log('🔄 Iniciando conversão HEIC -> JPEG...');
  console.log('📦 Tamanho do arquivo HEIC:', heicData.length, 'bytes');
  
  try {
    const heicConvert = (await import("npm:heic-convert@2.1.0")).default;
    
    // Usar qualidade menor (0.75) para ser mais rápido
    const jpegBuffer = await heicConvert({
      buffer: heicData,
      format: 'JPEG',
      quality: 0.75
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, documentType } = await req.json();

    if (!verificationId) {
      throw new Error("verificationId é obrigatório");
    }

    // documentType pode ser 'front', 'back' ou undefined (converter ambos - mas uma de cada vez)
    const targetDocument = documentType || 'front'; // Default: começar pela frente

    console.log("🔍 Buscando verificação:", verificationId, "documento:", targetDocument);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar verificação
    const { data: verification, error: fetchError } = await supabase
      .from("identity_verification")
      .select("*")
      .eq("id", verificationId)
      .single();

    if (fetchError || !verification) {
      throw new Error(`Verificação não encontrada: ${fetchError?.message}`);
    }

    console.log("📋 Verificação encontrada:", verification.full_name);

    let converted = false;
    let newUrl = '';
    let nextDocument: string | null = null;

    // Converter apenas um documento por vez para evitar timeout
    if (targetDocument === 'front' && verification.document_front_url) {
      const frontUrl = verification.document_front_url.toLowerCase();
      if (frontUrl.endsWith('.heic') || frontUrl.endsWith('.heif')) {
        console.log("🔄 Convertendo documento frontal HEIC...");
        
        const response = await fetch(verification.document_front_url);
        if (response.ok) {
          const heicData = new Uint8Array(await response.arrayBuffer());
          const jpegData = await convertHeicToJpeg(heicData);
          newUrl = await uploadToR2(jpegData, "doc-front-converted.jpg");
          
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from("identity_verification")
            .update({ document_front_url: newUrl })
            .eq("id", verificationId);

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }
          
          converted = true;
          console.log("✅ Documento frontal convertido:", newUrl);
          
          // Verificar se há documento traseiro para converter depois
          const backUrl = verification.document_back_url?.toLowerCase() || '';
          if (backUrl.endsWith('.heic') || backUrl.endsWith('.heif')) {
            nextDocument = 'back';
          }
        }
      }
    } else if (targetDocument === 'back' && verification.document_back_url) {
      const backUrl = verification.document_back_url.toLowerCase();
      if (backUrl.endsWith('.heic') || backUrl.endsWith('.heif')) {
        console.log("🔄 Convertendo documento traseiro HEIC...");
        
        const response = await fetch(verification.document_back_url);
        if (response.ok) {
          const heicData = new Uint8Array(await response.arrayBuffer());
          const jpegData = await convertHeicToJpeg(heicData);
          newUrl = await uploadToR2(jpegData, "doc-back-converted.jpg");
          
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from("identity_verification")
            .update({ document_back_url: newUrl })
            .eq("id", verificationId);

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }
          
          converted = true;
          console.log("✅ Documento traseiro convertido:", newUrl);
        }
      }
    }

    console.log(`✅ Conversão concluída: converted=${converted}, nextDocument=${nextDocument}`);

    return new Response(
      JSON.stringify({
        success: true,
        converted,
        newUrl,
        nextDocument,
        message: converted 
          ? `Documento ${targetDocument === 'front' ? 'frontal' : 'traseiro'} convertido para JPEG`
          : "Nenhuma imagem HEIC encontrada para converter"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
