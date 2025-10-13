import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  type: string;
  id: string;
  oldUrl: string;
  newUrl?: string;
  status: 'success' | 'failed';
  error?: string;
}

interface CloudflareUploadResponse {
  success: boolean;
  url: string;
  fileName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID');
    const cloudflareAccessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const cloudflareSecretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const cloudflareBucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');

    if (!cloudflareAccountId || !cloudflareAccessKeyId || !cloudflareSecretAccessKey || !cloudflareBucketName) {
      console.error('❌ Missing Cloudflare R2 credentials');
      return new Response(
        JSON.stringify({ error: 'Cloudflare R2 não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 Iniciando migração - versão 3.0 (processamento em lotes)');

    // Helper: Upload para Cloudflare R2
    async function uploadToCloudflare(fileData: Uint8Array, fileName: string, fileType: string): Promise<string> {
      const uploadResponse = await fetch(`${supabaseUrl}/functions/v1/cloudflare-r2-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          fileType,
          fileData: btoa(String.fromCharCode(...fileData))
        })
      });

      if (!uploadResponse.ok) {
        throw new Error(`Cloudflare upload failed: ${uploadResponse.statusText}`);
      }

      const result: CloudflareUploadResponse = await uploadResponse.json();
      if (!result.success || !result.url) {
        throw new Error('Cloudflare upload failed: No URL returned');
      }

      return result.url;
    }

    // Helper: Download do Bunny CDN
    async function downloadFile(url: string): Promise<{ data: Uint8Array, type: string }> {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      return { 
        data: new Uint8Array(arrayBuffer),
        type: contentType
      };
    }

    // Helper: Migrar arquivo
    async function migrateFile(url: string, id: string, type: string): Promise<MigrationResult> {
      try {
        const { data, type: fileType } = await downloadFile(url);
        const fileName = url.split('/').pop() || `file_${Date.now()}`;
        const newUrl = await uploadToCloudflare(data, fileName, fileType);
        
        console.log(`  ✅ [${type}] ${id} migrado`);
        
        return {
          type,
          id,
          oldUrl: url,
          newUrl,
          status: 'success'
        };
      } catch (error) {
        console.error(`  ❌ [${type}] ${id}: ${error.message}`);
        return {
          type,
          id,
          oldUrl: url,
          status: 'failed',
          error: error.message
        };
      }
    }

    // Buscar arquivos
    console.log('📊 Buscando arquivos...');
    
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, cover, share_link, type')
      .not('cover', 'is', null);
    
    const { data: allMemberAreas } = await supabase
      .from('member_areas')
      .select('id, logo_url, hero_image_url');
    
    const productsWithCovers = allProducts?.filter(p => 
      p.cover?.includes('bunny') || p.cover?.includes('b-cdn')
    ) || [];
    
    const ebooks = allProducts?.filter(e => 
      e.type === 'E-book' && (e.share_link?.includes('bunny') || e.share_link?.includes('b-cdn'))
    ) || [];
    
    const logosWithBunny = allMemberAreas?.filter(ma => 
      ma.logo_url && (ma.logo_url.includes('bunny') || ma.logo_url.includes('b-cdn'))
    ) || [];
    
    const heroWithBunny = allMemberAreas?.filter(ma => 
      ma.hero_image_url && (ma.hero_image_url.includes('bunny') || ma.hero_image_url.includes('b-cdn'))
    ) || [];

    const totalFiles = productsWithCovers.length + ebooks.length + logosWithBunny.length + heroWithBunny.length;
    
    console.log(`📋 Encontrados ${totalFiles} arquivos:`);
    console.log(`  - ${productsWithCovers.length} capas de produtos`);
    console.log(`  - ${ebooks.length} e-books`);
    console.log(`  - ${logosWithBunny.length} logos`);
    console.log(`  - ${heroWithBunny.length} hero images`);

    if (totalFiles === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum arquivo do Bunny CDN encontrado para migrar',
          stats: { total: 0, success: 0, failed: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processar em lotes de 5 arquivos
    const BATCH_SIZE = 5;
    let processed = 0;
    let success = 0;
    let failed = 0;

    // Processar capas
    console.log('\n📸 Migrando capas de produtos...');
    for (let i = 0; i < productsWithCovers.length; i += BATCH_SIZE) {
      const batch = productsWithCovers.slice(i, i + BATCH_SIZE);
      
      for (const product of batch) {
        const result = await migrateFile(product.cover, product.id, 'product_cover');
        processed++;
        
        if (result.status === 'success' && result.newUrl) {
          await supabase.from('products').update({ cover: result.newUrl }).eq('id', product.id);
          success++;
        } else {
          failed++;
        }
        
        console.log(`  Progresso: ${processed}/${totalFiles}`);
      }
    }

    // Processar e-books
    console.log('\n📚 Migrando e-books...');
    for (let i = 0; i < ebooks.length; i += BATCH_SIZE) {
      const batch = ebooks.slice(i, i + BATCH_SIZE);
      
      for (const ebook of batch) {
        const result = await migrateFile(ebook.share_link, ebook.id, 'ebook');
        processed++;
        
        if (result.status === 'success' && result.newUrl) {
          await supabase.from('products').update({ share_link: result.newUrl }).eq('id', ebook.id);
          success++;
        } else {
          failed++;
        }
        
        console.log(`  Progresso: ${processed}/${totalFiles}`);
      }
    }

    // Processar logos
    console.log('\n🎨 Migrando logos...');
    for (const area of logosWithBunny) {
      const result = await migrateFile(area.logo_url, area.id, 'logo');
      processed++;
      
      if (result.status === 'success' && result.newUrl) {
        await supabase.from('member_areas').update({ logo_url: result.newUrl }).eq('id', area.id);
        success++;
      } else {
        failed++;
      }
      
      console.log(`  Progresso: ${processed}/${totalFiles}`);
    }

    // Processar hero images
    console.log('\n🖼️ Migrando hero images...');
    for (const area of heroWithBunny) {
      const result = await migrateFile(area.hero_image_url, area.id, 'hero');
      processed++;
      
      if (result.status === 'success' && result.newUrl) {
        await supabase.from('member_areas').update({ hero_image_url: result.newUrl }).eq('id', area.id);
        success++;
      } else {
        failed++;
      }
      
      console.log(`  Progresso: ${processed}/${totalFiles}`);
    }

    console.log('\n🎉 Migração concluída!');
    console.log(`✅ Sucesso: ${success}/${totalFiles}`);
    console.log(`❌ Falhas: ${failed}/${totalFiles}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migração concluída!',
        stats: {
          total: totalFiles,
          success,
          failed,
          byCategory: {
            product_covers: productsWithCovers.length,
            ebooks: ebooks.length,
            logos: logosWithBunny.length,
            hero_images: heroWithBunny.length
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
