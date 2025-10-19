import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY');
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID');

    if (!bunnyApiKey || !bunnyLibraryId) {
      return new Response(
        JSON.stringify({ error: 'Missing Bunny.net configuration' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obter informações do vídeo
    const response = await fetch(
      `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': bunnyApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny API Error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get video info',
          details: errorText 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const videoInfo = await response.json();
    
    return new Response(
      JSON.stringify({
        status: videoInfo.status, // 0=queued, 1=processing, 2=encoding, 3=finished, 4=ready, 5=failed
        duration: videoInfo.length || 0,
        width: videoInfo.width,
        height: videoInfo.height,
        availableResolutions: videoInfo.availableResolutions,
        thumbnailUrl: videoInfo.thumbnailFileName 
          ? `https://vz-5c879716-268.b-cdn.net/${videoId}/${videoInfo.thumbnailFileName}`
          : null,
        videoInfo
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
