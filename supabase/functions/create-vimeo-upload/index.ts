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

    // Create upload on Vimeo with ALL privacy and embed settings
    const createPayload = {
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
        color: '#000000',
        playbar: true,
        volume: true,
        speed: false,
      },
    };

    console.log('📤 Sending to Vimeo:', JSON.stringify(createPayload, null, 2));

    const vimeoResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vimeoToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify(createPayload),
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

    // Configure domain whitelist with detailed logging
    console.log('🔐 Configuring domain whitelist for:', videoUri);
    
    const whitelistPayload = {
      privacy: {
        embed: 'whitelist',
      },
      embed_domains: [  // ✅ FORMATO CORRETO: embed_domains no root
        'kambafy.com',
        'app.kambafy.com',
        'membros.kambafy.com',
        '*.kambafy.com',
        'localhost',
        '*.lovable.app',
        '*.lovableproject.com',
      ],
    };

    console.log('📤 Whitelist payload:', JSON.stringify(whitelistPayload, null, 2));

    const whitelistResponse = await fetch(`https://api.vimeo.com${videoUri}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vimeoToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
      body: JSON.stringify(whitelistPayload),
    });

    const whitelistData = await whitelistResponse.json();
    
    if (!whitelistResponse.ok) {
      console.error('❌ Failed to set whitelist:', {
        status: whitelistResponse.status,
        statusText: whitelistResponse.statusText,
        data: whitelistData
      });
    } else {
      console.log('✅ Domain whitelist configured successfully');
      console.log('📋 Whitelist response embed settings:', JSON.stringify(whitelistData.embed, null, 2));
      console.log('🔐 Privacy settings:', JSON.stringify(whitelistData.privacy, null, 2));
    }

    // Fazer uma segunda verificação para confirmar que o whitelist foi aplicado
    console.log('🔍 Verificando se whitelist foi realmente aplicado...');
    
    const verifyResponse = await fetch(`https://api.vimeo.com${videoUri}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vimeoToken}`,
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
      },
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Whitelist atual no vídeo:', verifyData.embed?.whitelist || 'Nenhum whitelist encontrado');
      console.log('🔐 Privacy atual:', verifyData.privacy);
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        uploadUrl,
        videoUri,
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
