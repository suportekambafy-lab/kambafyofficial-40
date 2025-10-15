import { corsHeaders } from '../_shared/cors.ts';

interface GetVimeoInfoRequest {
  videoId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📹 Get Vimeo Info - Request received');

    const vimeoToken = Deno.env.get('VIMEO_ACCESS_TOKEN');
    if (!vimeoToken) {
      throw new Error('Missing Vimeo access token');
    }

    const { videoId }: GetVimeoInfoRequest = await req.json();
    console.log('📦 Getting info for video:', videoId);

    const videoUri = `/videos/${videoId}`;
    
    // Poll for video info with retry
    let duration = 0;
    let attempts = 0;
    const maxAttempts = 12; // 12 attempts × 5s = 60s max
    
    while (attempts < maxAttempts) {
      try {
        const videoInfoResponse = await fetch(`https://api.vimeo.com${videoUri}`, {
          headers: {
            'Authorization': `Bearer ${vimeoToken}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          },
        });
        
        if (videoInfoResponse.ok) {
          const videoInfo = await videoInfoResponse.json();
          duration = videoInfo.duration || 0;
          
          if (duration > 0) {
            console.log(`✅ Duration obtained: ${duration}s (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`);
            
            return new Response(
              JSON.stringify({
                success: true,
                duration,
                status: videoInfo.status,
                width: videoInfo.width,
                height: videoInfo.height,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } catch (error) {
        console.warn('⚠️ Error getting duration, retrying...', error);
      }
      
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for processing...`);
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      }
    }
    
    console.warn('⚠️ Could not get duration after 60s');
    
    return new Response(
      JSON.stringify({
        success: true,
        duration: 0,
        status: 'processing',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error getting Vimeo info:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to get Vimeo info',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
