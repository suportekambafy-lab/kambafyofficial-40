import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UploadVideoRequest {
  fileName: string;
  title: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY');
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID');

    if (!bunnyApiKey || !bunnyLibraryId) {
      console.error('Missing Bunny.net credentials');
      return new Response(
        JSON.stringify({ error: 'Missing Bunny.net configuration' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      const { fileName, title }: UploadVideoRequest = await req.json();

      console.log('Creating video in Bunny.net:', { fileName, title });

      // Create video in Bunny Stream
      const createVideoResponse = await fetch(
        `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title || fileName,
          }),
        }
      );

      if (!createVideoResponse.ok) {
        const errorText = await createVideoResponse.text();
        console.error('Failed to create video in Bunny:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create video in Bunny.net' }),
          { 
            status: createVideoResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const videoData = await createVideoResponse.json();
      console.log('Video created successfully:', videoData);

      // Return the video data including upload URL
      const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoData.guid}`;
      
      return new Response(
        JSON.stringify({
          videoId: videoData.guid,
          uploadUrl: uploadUrl,
          embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoData.guid}`,
          videoData: videoData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in bunny-video-upload:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});