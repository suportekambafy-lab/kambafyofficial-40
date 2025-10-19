import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🐰 Migrate Back to Bunny Function initialized');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Starting migration back to Bunny.net');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY');
    const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID');

    console.log('🔑 Checking credentials:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasBunnyApiKey: !!BUNNY_API_KEY,
      hasBunnyLibraryId: !!BUNNY_LIBRARY_ID,
    });

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      throw new Error('Missing Bunny.net credentials');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all lessons with videos
    console.log('📊 Fetching lessons with videos...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('id, title, video_url, hls_url, bunny_video_id, bunny_embed_url, video_data')
      .or('video_url.not.is.null,hls_url.not.is.null,bunny_video_id.not.is.null');

    if (fetchError) {
      throw new Error(`Failed to fetch lessons: ${fetchError.message}`);
    }

    const total = lessons?.length || 0;
    console.log(`📹 Found ${total} lessons with videos`);

    const results = {
      total,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ lesson_id: string; title: string; error: string }>,
    };

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          results,
          message: 'No lessons found to migrate',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each lesson
    for (const lesson of lessons) {
      console.log(`\n🎥 Processing: "${lesson.title}"`);

      try {
        // PRIORITY 1: Check video_data.original_bunny_id (most reliable)
        let bunnyVideoId = lesson.video_data?.original_bunny_id;
        
        if (bunnyVideoId) {
          console.log(`  ↳ Using original Bunny ID from video_data: ${bunnyVideoId}`);
        }
        
        // PRIORITY 2: Try bunny_video_id (may be outdated)
        if (!bunnyVideoId && lesson.bunny_video_id) {
          // Only use if it looks like a Bunny UUID (not Cloudflare ID)
          if (lesson.bunny_video_id.includes('-') && lesson.bunny_video_id.length === 36) {
            bunnyVideoId = lesson.bunny_video_id;
            console.log(`  ↳ Using bunny_video_id: ${bunnyVideoId}`);
          }
        }

        // PRIORITY 3: Try to extract from existing Bunny URLs
        if (!bunnyVideoId) {
          const hlsUrl = lesson.hls_url || lesson.video_url;
          if (hlsUrl?.includes('b-cdn.net')) {
            const match = hlsUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
            if (match) {
              bunnyVideoId = match[1];
              console.log(`  ↳ Extracted Bunny ID from HLS URL: ${bunnyVideoId}`);
            }
          }
        }

        if (!bunnyVideoId) {
          console.log(`  ⚠️ Skipped: No Bunny video ID found (needs re-upload)`);
          results.skipped++;
          continue;
        }

        // Verify video exists in Bunny
        console.log(`  ↳ Verifying video in Bunny API...`);
        const bunnyResponse = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
          {
            headers: {
              'AccessKey': BUNNY_API_KEY,
            },
          }
        );

        if (!bunnyResponse.ok) {
          if (bunnyResponse.status === 404) {
            console.log(`  ⚠️ Skipped: Video not found in Bunny (needs re-upload)`);
            results.skipped++;
            continue;
          }
          throw new Error(`Bunny API error: ${bunnyResponse.status} ${bunnyResponse.statusText}`);
        }

        const videoInfo = await bunnyResponse.json();
        const availableResolutions = videoInfo.availableResolutions?.split(',') || [];
        
        console.log(`  ↳ Video found! Resolutions: ${availableResolutions.join(', ')}`);

        // Construct Bunny URLs
        const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${bunnyVideoId}`;
        const hlsUrl = `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/playlist.m3u8`;

        console.log(`  ✅ Embed URL: ${embedUrl}`);
        console.log(`  ✅ HLS URL: ${hlsUrl}`);

        // Update database
        console.log(`  ↳ Updating database...`);
        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            bunny_video_id: bunnyVideoId,
            bunny_embed_url: embedUrl,
            video_url: embedUrl,
            hls_url: hlsUrl,
            video_data: {
              ...(lesson.video_data || {}),
              migrated_back_to_bunny: true,
              bunny_library_id: BUNNY_LIBRARY_ID,
              available_resolutions: availableResolutions,
              migrated_back_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', lesson.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
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
    console.log(`  ⚠️ Skipped: ${results.skipped}/${total}`);
    console.log(`  ❌ Failed: ${results.failed}/${total}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Detailed errors:');
      results.errors.forEach((err) => {
        console.log(`  - ${err.title}: ${err.error}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: results.failed === 0,
        results,
        message: `Migration completed: ${results.success} videos migrated, ${results.skipped} skipped (need re-upload)${
          results.failed > 0 ? `, ${results.failed} failed` : ''
        }`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Critical error in migration:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
