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

    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');

    console.log('🔍 Verificando credenciais Cloudflare...');
    console.log('Account ID presente:', !!CLOUDFLARE_ACCOUNT_ID);
    console.log('API Token presente:', !!CLOUDFLARE_API_TOKEN);

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.error('❌ Credenciais ausentes:', {
        has_account_id: !!CLOUDFLARE_ACCOUNT_ID,
        has_api_token: !!CLOUDFLARE_API_TOKEN
      });
      throw new Error('Cloudflare credentials not configured. Verifique as secrets CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN no Supabase.');
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

        // Step 2: Upload using HLS playlist (maximum quality)
        const bunnyVideoId = lesson.bunny_video_id;
        
        // ✅ Use complete HLS playlist URL (contains all qualities)
        const hlsUrl = `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/playlist.m3u8`;
        
        console.log(`📤 Uploading from HLS: ${hlsUrl}`);

        const uploadResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/copy`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: hlsUrl,
              meta: {
                name: lesson.title,
                migrated_from: 'bunny_hls',
                migration_date: new Date().toISOString(),
                original_bunny_id: bunnyVideoId,
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
          migration_type: 'hls_full_quality',
          original_bunny_url: lesson.video_data?.original_bunny_url || `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/playlist.m3u8`,
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
