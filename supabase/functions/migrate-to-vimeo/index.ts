import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Iniciando migração de vídeos para Vimeo...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vimeoToken = Deno.env.get('VIMEO_ACCESS_TOKEN')!;

    if (!vimeoToken) {
      throw new Error('VIMEO_ACCESS_TOKEN não configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar aulas com vídeos do Cloudflare
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .or('hls_url.ilike.%cloudflarestream.com%,video_url.ilike.%cloudflarestream.com%');

    if (error) throw error;

    console.log(`📋 Encontradas ${lessons?.length || 0} aulas para migrar`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    if (!lessons || lessons.length === 0) {
      console.log('✅ Nenhuma aula para migrar');
      return new Response(
        JSON.stringify({
          ...results,
          message: 'Nenhuma aula encontrada para migração'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    for (const lesson of lessons) {
      try {
        console.log(`🎬 Processando: ${lesson.title}`);

        // Extrair videoId do Cloudflare
        const cloudflareId = lesson.hls_url?.match(/\/([^/]+)\/manifest\/video\.m3u8/)?.[1];
        
        if (!cloudflareId) {
          console.warn(`⚠️ Não foi possível extrair ID do Cloudflare para: ${lesson.title}`);
          results.skipped++;
          continue;
        }

        // URL do vídeo no Cloudflare (direto, não HLS)
        const videoUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${cloudflareId}/downloads/default.mp4`;

        console.log(`📥 Baixando vídeo do Cloudflare: ${videoUrl}`);

        // Criar upload no Vimeo via pull (Vimeo baixa do Cloudflare)
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
          throw new Error(vimeoData.error || vimeoData.error_code || 'Falha ao criar vídeo no Vimeo');
        }

        const videoUri = vimeoData.uri;
        const videoId = videoUri.split('/').pop();

        console.log(`✅ Vídeo criado no Vimeo: ${videoId}`);

        // Configurar domain whitelist
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

        // Atualizar no banco
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
              migratedFrom: 'cloudflare',
              migratedAt: new Date().toISOString(),
              oldCloudflareId: cloudflareId,
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
        console.log(`✅ Migrado com sucesso: ${lesson.title}`);

      } catch (err: any) {
        results.failed++;
        results.errors.push({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          error: err.message,
        });
        console.error(`❌ Erro ao migrar ${lesson.title}:`, err.message);
      }
    }

    console.log('🎉 Migração concluída:', results);

    return new Response(
      JSON.stringify({
        ...results,
        message: `Migração concluída: ${results.success} sucesso, ${results.failed} falhas, ${results.skipped} ignoradas`
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
