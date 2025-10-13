import { corsHeaders } from "../_shared/cors.ts";

console.log("🎬 Migrate Videos to Cloudflare Stream Function initialized");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Starting video migration from Bunny to Cloudflare Stream");

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_STREAM_ACCOUNT_ID");
    const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    const BUNNY_API_KEY = Deno.env.get("BUNNY_API_KEY");
    const BUNNY_LIBRARY_ID = Deno.env.get("BUNNY_LIBRARY_ID");

    console.log("🔑 Checking credentials:", {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasCloudflareAccountId: !!CLOUDFLARE_ACCOUNT_ID,
      hasCloudflareToken: !!CLOUDFLARE_API_TOKEN,
      hasBunnyApiKey: !!BUNNY_API_KEY,
      hasBunnyLibraryId: !!BUNNY_LIBRARY_ID,
    });

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error("Missing Cloudflare Stream credentials");
    }

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error("Missing Bunny credentials");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    // Fetch all lessons with Bunny URLs
    console.log("📊 Fetching lessons with Bunny videos...");
    const fetchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/lessons?select=id,title,video_url,user_id&video_url=like.*b-cdn.net*`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch lessons: ${fetchResponse.statusText}`);
    }

    const lessons = await fetchResponse.json();
    const total = lessons.length;

    console.log(`📹 Found ${total} videos to migrate`);

    const results = {
      total,
      success: 0,
      failed: 0,
      errors: [] as Array<{ lesson_id: string; title: string; error: string }>,
    };

    // Migrate each video
    for (const lesson of lessons) {
      console.log(`\n🎥 Migrating: "${lesson.title}"`);

      try {
        // Extract Bunny video ID from URL
        // URL format: https://vz-5c879716-268.b-cdn.net/{video-id}/playlist.m3u8
        const videoIdMatch = lesson.video_url.match(/\/([a-f0-9-]{36})\//);
        if (!videoIdMatch) {
          throw new Error("Could not extract Bunny video ID from URL");
        }
        const bunnyVideoId = videoIdMatch[1];

        console.log(`  ↳ Bunny Video ID: ${bunnyVideoId}`);

        // Fetch video metadata from Bunny API
        console.log(`  ↳ Fetching metadata from Bunny API...`);
        const bunnyResponse = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
          {
            headers: {
              "AccessKey": BUNNY_API_KEY,
            },
          }
        );

        if (!bunnyResponse.ok) {
          throw new Error(`Bunny API error: ${bunnyResponse.status} ${bunnyResponse.statusText}`);
        }

        const videoInfo = await bunnyResponse.json();
        const availableResolutions = videoInfo.availableResolutions?.split(",") || [];

        console.log(`  ↳ Available resolutions: ${availableResolutions.join(", ")}`);

        // Select best available resolution
        const preferredOrder = ["1080p", "720p", "480p", "360p", "240p"];
        let bestResolution = availableResolutions.find((res: string) =>
          preferredOrder.includes(res)
        );

        if (!bestResolution && availableResolutions.length > 0) {
          bestResolution = availableResolutions[availableResolutions.length - 1];
        }

        if (!bestResolution) {
          throw new Error("No resolutions available for this video");
        }

        console.log(`  ↳ Selected resolution: ${bestResolution}`);

        // Construct MP4 URL
        const mp4Url = `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/play_${bestResolution}.mp4`;
        console.log(`  ↳ MP4 URL: ${mp4Url}`);

        // Copy video to Cloudflare Stream
        console.log(`  ↳ Copying to Cloudflare Stream...`);
        const streamResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: mp4Url,
              meta: {
                name: lesson.title,
              },
              requireSignedURLs: false,
            }),
          }
        );

        if (!streamResponse.ok) {
          const errorText = await streamResponse.text();
          throw new Error(`Cloudflare API error: ${streamResponse.status} - ${errorText}`);
        }

        const streamData = await streamResponse.json();

        if (!streamData.success || !streamData.result) {
          throw new Error(`Cloudflare returned unsuccessful response: ${JSON.stringify(streamData)}`);
        }

        const streamId = streamData.result.uid;
        const playbackUrl = streamData.result.playback?.hls;

        if (!streamId || !playbackUrl) {
          throw new Error("Stream ID or playback URL missing from Cloudflare response");
        }

        // Construct Cloudflare URLs
        const hlsUrl = playbackUrl;
        const embedUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${streamId}/iframe`;

        console.log(`  ✅ Stream ID: ${streamId}`);
        console.log(`  ✅ HLS URL: ${hlsUrl}`);

        // Update database
        console.log(`  ↳ Updating database...`);
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/lessons?id=eq.${lesson.id}`,
          {
            method: "PATCH",
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              video_url: hlsUrl,
              hls_url: hlsUrl,
              bunny_video_id: streamId,
              bunny_embed_url: embedUrl,
              video_data: {
                migrated_from_bunny: true,
                original_bunny_id: bunnyVideoId,
                original_bunny_url: lesson.video_url,
                original_resolution: bestResolution,
                migrated_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Database update failed: ${updateResponse.status} - ${errorText}`);
        }

        results.success++;
        console.log(`  ✅ Migration successful! (${results.success}/${total})`);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          lesson_id: lesson.id,
          title: lesson.title,
          error: error.message,
        });
        console.error(`  ❌ Migration failed for "${lesson.title}":`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`  ✅ Success: ${results.success}/${total}`);
    console.log(`  ❌ Failed: ${results.failed}/${total}`);

    if (results.errors.length > 0) {
      console.log("\n❌ Detailed errors:");
      results.errors.forEach((err) => {
        console.log(`  - ${err.title}: ${err.error}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: results.failed === 0,
        results,
        message: `Migration completed: ${results.success} videos migrated${
          results.failed > 0 ? `, ${results.failed} failed` : ""
        }`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Critical error in migration:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
