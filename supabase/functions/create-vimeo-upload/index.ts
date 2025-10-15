import { corsHeaders } from '../_shared/cors.ts';

interface CreateVimeoUploadRequest {
  fileName: string;
  fileSize: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📹 Create Vimeo Upload - Request received');

    const vimeoToken = Deno.env.get('VIMEO_ACCESS_TOKEN');
    if (!vimeoToken) {
      throw new Error('Missing Vimeo access token');
    }

    const { fileName, fileSize }: CreateVimeoUploadRequest = await req.json();

    console.log('📦 Creating Vimeo upload for:', { fileName, fileSize });

    // Create upload on Vimeo with privacy settings
    const vimeoResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vimeoToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify({
        upload: {
          approach: 'tus',
          size: fileSize,
        },
        name: fileName,
        privacy: {
          view: 'disable',           // Private - not visible on Vimeo.com
          embed: 'whitelist',         // Only works on whitelisted domains
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
            vimeo: false,             // Remove Vimeo branding (Pro feature)
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
      console.error('❌ Vimeo upload creation failed:', vimeoData);
      throw new Error(vimeoData.error || 'Failed to create Vimeo upload');
    }

    const videoUri = vimeoData.uri;
    const videoId = videoUri.split('/').pop();
    const uploadUrl = vimeoData.upload.upload_link;

    console.log('✅ Vimeo upload created:', { videoId, uploadUrl });

    // Configure domain whitelist
    console.log('🔐 Configuring domain whitelist...');
    
    const whitelistResponse = await fetch(`https://api.vimeo.com${videoUri}`, {
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

    if (!whitelistResponse.ok) {
      console.warn('⚠️ Failed to set whitelist, but continuing...');
    } else {
      console.log('✅ Domain whitelist configured successfully');
    }

    // Aguardar processamento e obter duração
    console.log('⏳ Aguardando processamento do Vimeo para obter duração...');
    
    let duration = 0;
    let attempts = 0;
    const maxAttempts = 12; // 12 tentativas × 5s = 60s máximo
    
    while (attempts < maxAttempts && duration === 0) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s
      
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
            console.log(`✅ Duração obtida: ${duration}s (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`);
            break;
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao obter duração, tentando novamente...', error);
      }
      
      attempts++;
      console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - aguardando processamento...`);
    }
    
    if (duration === 0) {
      console.warn('⚠️ Não foi possível obter duração após 60s. Salvando com duration: 0');
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        uploadUrl,
        videoUri,
        duration,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error creating Vimeo upload:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create Vimeo upload',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
