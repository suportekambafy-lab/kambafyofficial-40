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
    const BUNNY_API_KEY = Deno.env.get('BUNNY_STORAGE_API_KEY');
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_HOSTNAME = Deno.env.get('BUNNY_STORAGE_HOSTNAME');
    const BUNNY_CDN_URL = Deno.env.get('BUNNY_CDN_URL');

    if (!BUNNY_API_KEY || !BUNNY_STORAGE_ZONE || !BUNNY_HOSTNAME) {
      console.error('Missing Bunny Storage credentials');
      return new Response(
        JSON.stringify({ error: 'Bunny Storage não configurado' }),
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
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Bunny Storage upload failed:', errorText);
      throw new Error('Falha no upload para Bunny Storage');
    }

    // Generate CDN URL
    const cdnUrl = `${BUNNY_CDN_URL}/${storagePath}`;

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
