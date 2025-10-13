import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.515.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("🚀 Cloudflare R2 Upload Function initialized");

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
      throw new Error("Missing Cloudflare R2 credentials");
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

    // Configure S3 client for R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
      // Prevent SDK from trying to load credentials from files
      credentialDefaultProvider: () => async () => ({
        accessKeyId,
        secretAccessKey,
      }),
    });

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

    console.log("☁️ Uploading to R2:", uniqueFileName);

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: binaryData,
      ContentType: fileType,
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
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
