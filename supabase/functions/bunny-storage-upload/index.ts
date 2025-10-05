import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileData: string; // base64 encoded
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BUNNY_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_HOSTNAME = Deno.env.get('BUNNY_STORAGE_HOSTNAME');
    const BUNNY_CDN_URL = Deno.env.get('BUNNY_CDN_URL');

    console.log('Config check:', {
      hasPassword: !!BUNNY_PASSWORD,
      hasZone: !!BUNNY_STORAGE_ZONE,
      hasHostname: !!BUNNY_HOSTNAME,
      hasCDN: !!BUNNY_CDN_URL,
      zone: BUNNY_STORAGE_ZONE,
      hostname: BUNNY_HOSTNAME
    });

    if (!BUNNY_PASSWORD || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME || !BUNNY_CDN_URL) {
      console.error('Missing Bunny Storage credentials');
      return new Response(
        JSON.stringify({ error: 'Bunny Storage não configurado. Verifique as credenciais.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileName, fileType, fileData }: UploadRequest = await req.json();

    if (!fileName || !fileData) {
      return new Response(
        JSON.stringify({ error: 'fileName e fileData são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading file to Bunny Storage:', fileName);

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Determine folder based on file type
    const folder = fileType.startsWith('image/') ? 'product-covers' : 'ebooks';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const storagePath = `${folder}/${uniqueFileName}`;

    // Upload to Bunny Storage
    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${storagePath}`;
    
    console.log('Upload URL:', uploadUrl);
    console.log('Password length:', BUNNY_PASSWORD?.length);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_PASSWORD,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Bunny Storage upload failed:', errorText);
      throw new Error('Falha no upload para Bunny Storage');
    }

    // Generate CDN URL with proper protocol
    let cdnUrl = `${BUNNY_CDN_URL}/${storagePath}`;
    
    // Ensure the URL has a protocol
    if (!cdnUrl.startsWith('http://') && !cdnUrl.startsWith('https://')) {
      cdnUrl = `https://${cdnUrl}`;
    }

    console.log('File uploaded successfully to Bunny Storage:', cdnUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: cdnUrl,
        fileName: uniqueFileName,
        storagePath,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in bunny-storage-upload:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
