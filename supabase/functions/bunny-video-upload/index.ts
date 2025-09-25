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

interface UploadVideoFileRequest {
  videoId: string;
  fileData: string; // base64 encoded file
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY');
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID');

    console.log('Environment check:', {
      hasApiKey: !!bunnyApiKey,
      hasLibraryId: !!bunnyLibraryId,
      apiKeyLength: bunnyApiKey?.length,
      libraryId: bunnyLibraryId
    });

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
      const contentType = req.headers.get('content-type') || '';
      
      // Handle multipart form data (file upload)
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const videoId = formData.get('videoId') as string;
        const file = formData.get('file') as File;
        
        if (!videoId || !file) {
          return new Response(
            JSON.stringify({ error: 'Missing videoId or file' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Uploading file to Bunny.net:', { videoId, fileName: file.name, fileSize: file.size });

        // Upload file to Bunny.net
        const uploadUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${videoId}`;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'AccessKey': bunnyApiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            errorText: errorText
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Failed to upload file to Bunny.net',
              details: errorText,
              status: uploadResponse.status
            }),
            { 
              status: uploadResponse.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('File uploaded successfully to Bunny.net');
        
        return new Response(
          JSON.stringify({
            success: true,
            videoId: videoId,
            embedUrl: `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${videoId}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle JSON request (create video)
      const { fileName, title }: UploadVideoRequest = await req.json();

      console.log('Creating video in Bunny.net:', { fileName, title });

      const requestPayload = {
        title: title || fileName,
      };

      const requestUrl = `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`;
      
      console.log('Request details:', {
        url: requestUrl,
        payload: requestPayload,
        headers: {
          'AccessKey': `***${bunnyApiKey?.slice(-4)}`,
          'Content-Type': 'application/json'
        }
      });

      // Create video in Bunny Stream
      const createVideoResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'AccessKey': bunnyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('Response status:', createVideoResponse.status);
      console.log('Response headers:', Object.fromEntries(createVideoResponse.headers.entries()));

      if (!createVideoResponse.ok) {
        const errorText = await createVideoResponse.text();
        console.error('Bunny API Error Response:', {
          status: createVideoResponse.status,
          statusText: createVideoResponse.statusText,
          errorText: errorText,
          url: requestUrl
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create video in Bunny.net',
            details: errorText,
            status: createVideoResponse.status
          }),
          { 
            status: createVideoResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const videoData = await createVideoResponse.json();
      console.log('Video created successfully:', videoData);

      return new Response(
        JSON.stringify({
          videoId: videoData.guid,
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