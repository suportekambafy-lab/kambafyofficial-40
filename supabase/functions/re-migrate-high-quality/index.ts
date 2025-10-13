import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_STREAM_ACCOUNT_ID');
    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY');
    const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID');

    console.log('🔍 Verificando credenciais...');
    console.log('Cloudflare Account ID:', !!CLOUDFLARE_ACCOUNT_ID);
    console.log('Cloudflare API Token:', !!CLOUDFLARE_API_TOKEN);
    console.log('Bunny API Key:', !!BUNNY_API_KEY);
    console.log('Bunny Library ID:', !!BUNNY_LIBRARY_ID);

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error('Cloudflare Stream credentials not configured');
    }

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error('Bunny credentials not configured');
    }

    const { lesson_ids } = await req.json();
    console.log('🔄 Starting high-quality re-migration for lessons:', lesson_ids);

    let query = supabase
      .from('lessons')
      .select('id, title, bunny_video_id, video_data, hls_url')
      .not('bunny_video_id', 'is', null);

    if (lesson_ids && lesson_ids.length > 0) {
      query = query.in('id', lesson_ids);
    }

    const { data: lessons, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Found ${lessons.length} lessons to re-migrate`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const lesson of lessons) {
      try {
        console.log(`\n🎬 Processing: ${lesson.title}`);
        
        // Step 1: Delete old Cloudflare video if exists
        const oldStreamId = lesson.video_data?.stream_id;
        if (oldStreamId) {
          console.log(`🗑️ Deleting old Cloudflare video: ${oldStreamId}`);
          const deleteResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${oldStreamId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
              }
            }
          );

          if (!deleteResponse.ok) {
            console.warn(`⚠️ Failed to delete old video: ${deleteResponse.statusText}`);
          } else {
            console.log('✅ Old video deleted successfully');
          }
        }

        // Step 2: Query Bunny API to get available resolutions
        const bunnyVideoId = lesson.bunny_video_id;
        
        console.log(`📡 Querying Bunny API for video: ${bunnyVideoId}`);
        const bunnyResponse = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
          {
            headers: {
              'AccessKey': BUNNY_API_KEY,
            }
          }
        );

        if (!bunnyResponse.ok) {
          throw new Error(`Bunny API error: ${bunnyResponse.status} ${bunnyResponse.statusText}`);
        }

        const videoInfo = await bunnyResponse.json();
        const availableResolutions = videoInfo.availableResolutions?.split(',') || [];
        
        console.log(`📊 Available resolutions: ${availableResolutions.join(', ')}`);
        
        // Select highest quality available (prefer 4K/2K/1080p)
        const preferredOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'];
        let bestResolution = availableResolutions.find((res: string) =>
          preferredOrder.includes(res)
        );
        
        if (!bestResolution && availableResolutions.length > 0) {
          bestResolution = availableResolutions[availableResolutions.length - 1];
        }
        
        if (!bestResolution) {
          throw new Error(`No resolutions available for video: ${bunnyVideoId}`);
        }
        
        const videoUrl = `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/play_${bestResolution}.mp4`;
        console.log(`✅ Selected ${bestResolution}: ${videoUrl}`);

        const uploadResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: videoUrl,
              meta: {
                name: lesson.title,
                migrated_from: 'bunny_mp4',
                migration_date: new Date().toISOString(),
                original_bunny_id: bunnyVideoId,
                source_quality: videoUrl.match(/play_(\w+)\.mp4/)?.[1] || 'unknown',
              },
              requireSignedURLs: false,
            }),
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Cloudflare upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult.success || !uploadResult.result?.uid) {
          throw new Error('Invalid Cloudflare response');
        }

        const streamId = uploadResult.result.uid;
        console.log(`✅ Uploaded to Cloudflare Stream: ${streamId}`);

        // Step 3: Generate URLs
        const playbackUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID.replace(/-/g, '')}.cloudflarestream.com/${streamId}/manifest/video.m3u8`;
        const embedUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID.replace(/-/g, '')}.cloudflarestream.com/${streamId}/iframe`;
        const thumbnailUrl = `https://customer-${CLOUDFLARE_ACCOUNT_ID.replace(/-/g, '')}.cloudflarestream.com/${streamId}/thumbnails/thumbnail.jpg`;

        // Step 4: Update database with new video data
        const videoData = {
          stream_id: streamId,
          migrated_from_bunny: true,
          migration_date: new Date().toISOString(),
          migration_type: 'high_quality_mp4',
          source_quality: videoUrl.match(/play_(\w+)\.mp4/)?.[1] || 'unknown',
          original_bunny_url: videoUrl,
          original_bunny_id: bunnyVideoId,
          cloudflare_status: 'processing',
        };

        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            hls_url: playbackUrl,
            video_data: videoData,
          })
          .eq('id', lesson.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Database updated for lesson: ${lesson.title}`);
        results.success++;

      } catch (error: any) {
        console.error(`❌ Error migrating lesson ${lesson.id}:`, error);
        results.failed++;
        results.errors.push({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          error: error.message
        });
      }
    }

    console.log('\n📊 Re-migration Summary:');
    console.log(`✅ Success: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Re-migrated ${results.success} videos with maximum quality`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Re-migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
