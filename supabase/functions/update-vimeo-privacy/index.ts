import { corsHeaders } from '../_shared/cors.ts';

interface UpdateVimeoPrivacyRequest {
  videoIds: string[]; // Array de IDs de vídeos do Vimeo
  privacy?: {
    view: 'anybody' | 'nobody' | 'contacts' | 'password' | 'users' | 'disable';
    embed: 'public' | 'private' | 'whitelist';
    download?: boolean;
  };
  embedDomains?: string[]; // Domínios permitidos para embedding
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎬 Update Vimeo Privacy - Request received');

    const vimeoToken = Deno.env.get('VIMEO_ACCESS_TOKEN');
    if (!vimeoToken) {
      throw new Error('Missing Vimeo access token');
    }

    const { videoIds, privacy, embedDomains }: UpdateVimeoPrivacyRequest = await req.json();
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      throw new Error('videoIds array is required and must not be empty');
    }

    console.log(`📦 Updating ${videoIds.length} videos`);

    // Configurações padrão se não especificadas
    const defaultPrivacy = {
      view: 'anybody',
      embed: 'public',
      download: false,
      ...privacy
    };

    const results = [];

    // Atualizar cada vídeo
    for (const videoId of videoIds) {
      try {
        console.log(`🎥 Updating video ${videoId}...`);

        const updateData: any = {
          privacy: defaultPrivacy,
          // Remover branding "Protegido por Vimeo"
          embed: {
            title: {
              name: 'hide',
              owner: 'hide',
              portrait: 'hide'
            },
            buttons: {
              like: false,
              watchlater: false,
              share: false,
              embed: false
            },
            logos: {
              vimeo: false, // Remove logo do Vimeo
              custom: {
                active: false
              }
            },
            playbar: true,
            volume: true,
            color: 'ffffff'
          }
        };

        // Se especificou domínios para whitelist
        if (embedDomains && embedDomains.length > 0 && defaultPrivacy.embed === 'whitelist') {
          updateData.embed.domains = embedDomains;
        }

        const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${vimeoToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          const videoData = await response.json();
          console.log(`✅ Video ${videoId} updated successfully`);
          results.push({
            videoId,
            success: true,
            privacy: videoData.privacy,
            embed_domains: videoData.embed?.domains || []
          });
        } else {
          const error = await response.text();
          console.error(`❌ Failed to update video ${videoId}:`, error);
          results.push({
            videoId,
            success: false,
            error: error
          });
        }
      } catch (error) {
        console.error(`❌ Error updating video ${videoId}:`, error);
        results.push({
          videoId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Update completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        totalVideos: videoIds.length,
        successCount,
        failureCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error updating Vimeo privacy:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to update Vimeo privacy settings',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
