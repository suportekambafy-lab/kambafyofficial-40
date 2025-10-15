import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🐰➡️📹 Migração Bunny → Vimeo Pro iniciada...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vimeoToken = Deno.env.get('VIMEO_ACCESS_TOKEN')!;
    const bunnyApiKey = Deno.env.get('BUNNY_API_KEY')!;
    const bunnyLibraryId = Deno.env.get('BUNNY_LIBRARY_ID')!;

    if (!vimeoToken || !bunnyApiKey || !bunnyLibraryId) {
      throw new Error('Missing credentials (Vimeo or Bunny)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar aulas com vídeos do Bunny
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .not('bunny_video_id', 'is', null);

    if (error) throw error;

    console.log(`📋 Encontradas ${lessons.length} aulas para migrar`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const lesson of lessons) {
      try {
        console.log(`\n🎬 Migrando: ${lesson.title}`);

        const bunnyVideoId = lesson.bunny_video_id;

        // 1. Consultar Bunny API para resoluções disponíveis
        console.log(`  ↳ Consultando Bunny API...`);
        const bunnyResponse = await fetch(
          `https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${bunnyVideoId}`,
          {
            headers: { 'AccessKey': bunnyApiKey }
          }
        );

        if (!bunnyResponse.ok) {
          throw new Error(`Bunny API error: ${bunnyResponse.status}`);
        }

        const videoInfo = await bunnyResponse.json();
        const availableResolutions = videoInfo.availableResolutions?.split(',') || [];

        console.log(`  ↳ Resoluções disponíveis: ${availableResolutions.join(', ')}`);

        // 2. Selecionar MELHOR resolução
        const preferredOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p'];
        let bestResolution = availableResolutions.find((res: string) =>
          preferredOrder.includes(res)
        );

        if (!bestResolution && availableResolutions.length > 0) {
          bestResolution = availableResolutions[availableResolutions.length - 1];
        }

        if (!bestResolution) {
          throw new Error('Nenhuma resolução disponível');
        }

        console.log(`  ✅ Selecionada: ${bestResolution}`);

        // 3. Construir URL do MP4 de alta qualidade
        const videoUrl = `https://vz-5c879716-268.b-cdn.net/${bunnyVideoId}/play_${bestResolution}.mp4`;

        console.log(`  ↳ URL do vídeo: ${videoUrl}`);

        // 4. Upload para Vimeo (pull approach - Vimeo baixa do Bunny)
        console.log(`  ↳ Enviando para Vimeo...`);
        const vimeoResponse = await fetch('https://api.vimeo.com/me/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vimeoToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          },
          body: JSON.stringify({
            upload: {
              approach: 'pull',
              link: videoUrl,
            },
            name: lesson.title,
            description: lesson.description || '',
            privacy: {
              view: 'disable',
              embed: 'whitelist',
              download: false,
              add: false,
              comments: 'nobody',
            },
            embed: {
              buttons: {
                like: false,
                watchlater: false,
                share: false,
                embed: false,
              },
              logos: {
                vimeo: false,
              },
              title: {
                name: 'hide',
                owner: 'hide',
                portrait: 'hide',
              },
            },
          }),
        });

        const vimeoData = await vimeoResponse.json();

        if (!vimeoResponse.ok) {
          throw new Error(vimeoData.error || vimeoData.error_code || 'Falha no Vimeo');
        }

        const videoUri = vimeoData.uri;
        const videoId = videoUri.split('/').pop();

        console.log(`  ✅ Vídeo criado no Vimeo: ${videoId}`);

        // 5. Configurar domain whitelist
        console.log(`  ↳ Configurando domain whitelist...`);
        await fetch(`https://api.vimeo.com${videoUri}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vimeoToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          },
          body: JSON.stringify({
            privacy: {
              embed: 'whitelist',
            },
            embed: {
              whitelist: [
                'app.kambafy.com',
                'membros.kambafy.com',
                '*.kambafy.com',
                'localhost',
                '*.lovable.app',
                '*.lovableproject.com',
              ],
            },
          }),
        });

        // 6. Atualizar banco de dados
        console.log(`  ↳ Atualizando banco de dados...`);
        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            hls_url: `https://player.vimeo.com/video/${videoId}`,
            video_url: `https://player.vimeo.com/video/${videoId}`,
            video_data: {
              platform: 'vimeo',
              videoId,
              videoUri,
              embedUrl: `https://player.vimeo.com/video/${videoId}`,
              thumbnailUrl: `https://i.vimeocdn.com/video/${videoId}_640.jpg`,
              migratedFrom: 'bunny',
              migratedAt: new Date().toISOString(),
              originalBunnyId: bunnyVideoId,
              originalBunnyQuality: bestResolution,
              privacy: {
                view: 'disable',
                embed: 'whitelist',
                domains: ['app.kambafy.com', 'membros.kambafy.com', '*.kambafy.com'],
              },
            },
          })
          .eq('id', lesson.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar banco: ${updateError.message}`);
        }

        results.success++;
        console.log(`  ✅ Migração completa (${results.success}/${lessons.length})`);

      } catch (err: any) {
        results.failed++;
        results.errors.push({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          error: err.message,
        });
        console.error(`  ❌ Erro ao migrar ${lesson.title}:`, err.message);
      }
    }

    console.log('\n🎉 Migração concluída:', results);

    return new Response(
      JSON.stringify({
        ...results,
        message: `Migração concluída: ${results.success} sucesso, ${results.failed} falhas`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
