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

    console.log('🚀 Versão 3.0 - Processamento limitado (máx 10 arquivos/execução)');

    const MAX_FILES_PER_RUN = 10;

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
        console.log(`  📥 [${type}] Baixando: ${url.substring(0, 80)}...`);
        const { data, type: fileType } = await downloadFile(url);
        
        const fileName = url.split('/').pop() || `file_${Date.now()}`;
        console.log(`  ☁️ [${type}] Enviando para Cloudflare R2...`);
        const newUrl = await uploadToCloudflare(data, fileName, fileType);
        
        console.log(`  ✅ [${type}] ${id} migrado com sucesso`);
        
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
    
    console.log(`📋 Total encontrados: ${totalFiles} arquivos`);
    console.log(`  - ${productsWithCovers.length} capas`);
    console.log(`  - ${ebooks.length} e-books`);
    console.log(`  - ${logosWithBunny.length} logos`);
    console.log(`  - ${heroWithBunny.length} hero images`);
    console.log(`⚠️ Processando máximo de ${MAX_FILES_PER_RUN} arquivos por execução`);

    if (totalFiles === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum arquivo do Bunny CDN encontrado para migrar',
          stats: { total: 0, success: 0, failed: 0, remaining: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Coletar todos os arquivos em uma única lista
    const allFilesToMigrate = [
      ...productsWithCovers.map(p => ({ type: 'product_cover', id: p.id, url: p.cover, table: 'products', column: 'cover' })),
      ...ebooks.map(e => ({ type: 'ebook', id: e.id, url: e.share_link, table: 'products', column: 'share_link' })),
      ...logosWithBunny.map(ma => ({ type: 'logo', id: ma.id, url: ma.logo_url, table: 'member_areas', column: 'logo_url' })),
      ...heroWithBunny.map(ma => ({ type: 'hero', id: ma.id, url: ma.hero_image_url, table: 'member_areas', column: 'hero_image_url' }))
    ];

    // Processar apenas os primeiros MAX_FILES_PER_RUN arquivos
    const filesToProcess = allFilesToMigrate.slice(0, MAX_FILES_PER_RUN);
    const remaining = allFilesToMigrate.length - filesToProcess.length;

    let success = 0;
    let failed = 0;

    console.log(`\n🔄 Processando ${filesToProcess.length} de ${allFilesToMigrate.length} arquivos...`);

    for (const file of filesToProcess) {
      const result = await migrateFile(file.url, file.id, file.type);
      
      if (result.status === 'success' && result.newUrl) {
        await supabase.from(file.table).update({ [file.column]: result.newUrl }).eq('id', file.id);
        success++;
      } else {
        failed++;
      }
    }

    console.log('\n✅ Lote concluído!');
    console.log(`✅ Sucesso: ${success}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`📋 Restam: ${remaining} arquivos`);

    return new Response(
      JSON.stringify({
        success: true,
        message: remaining > 0 
          ? `Lote processado! Restam ${remaining} arquivos. Execute novamente para continuar.`
          : 'Migração concluída!',
        stats: {
          total: totalFiles,
          processed: filesToProcess.length,
          success,
          failed,
          remaining,
          percentComplete: Math.round((allFilesToMigrate.length - remaining) / allFilesToMigrate.length * 100)
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
