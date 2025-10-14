// ✅ Edge Function: Import video from R2 to Cloudflare Stream
// Importa vídeos já enviados para o R2 diretamente para o Stream

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  videoUrl: string;
  fileName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Import R2 to Stream - Request received');

    // Get Cloudflare Stream credentials
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!accountId || !apiToken) {
      throw new Error('Missing Cloudflare Stream credentials');
    }

    // Parse request body
    const { videoUrl, fileName }: ImportRequest = await req.json();

    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    console.log('📹 Importing video from R2:', { videoUrl, fileName });

    // Call Cloudflare Stream API to import from URL
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          meta: {
            name: fileName || 'Video Upload',
          },
          requireSignedURLs: false,
        }),
      }
    );

    const streamData = await streamResponse.json();

    if (!streamResponse.ok || !streamData.success) {
      console.error('❌ Cloudflare Stream import failed:', streamData);
      throw new Error(streamData.errors?.[0]?.message || 'Failed to import video to Stream');
    }

    const videoId = streamData.result.uid;
    const hlsUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
    const embedUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/iframe`;
    const thumbnailUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

    console.log('✅ Video imported successfully to Stream:', {
      videoId,
      hlsUrl,
      status: streamData.result.status
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        hlsUrl,
        embedUrl,
        thumbnailUrl,
        stream_id: videoId,
        status: streamData.result.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error importing video:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to import video to Stream',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
