// ✅ Edge Function: Create Cloudflare Stream upload URL
// Cria uma URL de upload TUS para enviar vídeos diretamente ao Stream

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUploadRequest {
  fileName: string;
  fileSize: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📹 Create Stream Upload - Request received');

    // Get Cloudflare Stream credentials
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!accountId || !apiToken) {
      throw new Error('Missing Cloudflare Stream credentials');
    }

    // Parse request body
    const { fileName, fileSize }: CreateUploadRequest = await req.json();

    if (!fileName) {
      throw new Error('File name is required');
    }

    console.log('📦 Creating upload URL for:', { fileName, fileSize });

    // Create upload URL via Cloudflare Stream API
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 21600, // 6 hours max
          meta: {
            name: fileName,
          },
          requireSignedURLs: false,
        }),
      }
    );

    const streamData = await streamResponse.json();

    if (!streamResponse.ok || !streamData.success) {
      console.error('❌ Cloudflare Stream upload creation failed:', streamData);
      throw new Error(streamData.errors?.[0]?.message || 'Failed to create upload URL');
    }

    const { uid: videoId, uploadURL } = streamData.result;

    console.log('✅ Upload URL created successfully:', {
      videoId,
      uploadURL
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        uploadUrl: uploadURL,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error creating upload URL:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create upload URL',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
