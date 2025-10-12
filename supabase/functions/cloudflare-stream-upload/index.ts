import { corsHeaders } from "../_shared/cors.ts";

console.log("🎬 Cloudflare Stream Upload Function initialized");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Request received for Stream upload");

    // Get environment variables
    const accountId = Deno.env.get("CLOUDFLARE_STREAM_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    console.log("🔑 Checking Stream credentials:", {
      hasAccountId: !!accountId,
      hasApiToken: !!apiToken,
    });

    if (!accountId || !apiToken) {
      throw new Error("Missing Cloudflare Stream credentials");
    }

    // Parse request body
    const { fileName, fileType, fileData } = await req.json();

    if (!fileName || !fileType || !fileData) {
      throw new Error("Missing required fields: fileName, fileType, fileData");
    }

    console.log("🎥 Video info:", {
      fileName,
      fileType,
      fileSize: fileData.length,
    });

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));

    // Create form data
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: fileType });
    formData.append("file", blob, fileName);

    console.log("☁️ Uploading to Cloudflare Stream...");

    // Upload to Cloudflare Stream
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      }
    );

    const uploadResult = await uploadResponse.json();

    console.log("📊 Stream API response:", {
      success: uploadResult.success,
      hasResult: !!uploadResult.result,
    });

    if (!uploadResult.success) {
      throw new Error(
        uploadResult.errors?.[0]?.message || "Failed to upload to Stream"
      );
    }

    const video = uploadResult.result;

    // Generate URLs
    const videoId = video.uid;
    const embedUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/iframe`;
    const hlsUrl = `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const thumbnail = video.thumbnail || `https://customer-${accountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

    console.log("✅ Upload successful:", {
      videoId,
      embedUrl,
      hlsUrl,
      thumbnail,
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        embedUrl,
        hlsUrl,
        thumbnail,
        duration: video.duration || 0,
        status: video.status?.state || "pending",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error uploading to Stream:", error);
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
