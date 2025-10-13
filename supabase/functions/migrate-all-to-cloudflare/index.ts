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

    console.log('🚀 Iniciando migração completa do Bunny CDN para Cloudflare R2');
    console.log('📊 Buscando arquivos para migrar...');

    const results: MigrationResult[] = [];
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      byCategory: {
        product_covers: { success: 0, failed: 0 },
        ebooks: { success: 0, failed: 0 },
        member_area_logos: { success: 0, failed: 0 },
        hero_images: { success: 0, failed: 0 },
      }
    };

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

    // Helper: Migrar arquivo com retry
    async function migrateFile(
      url: string,
      id: string,
      type: string,
      maxRetries = 3
    ): Promise<MigrationResult> {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`  📥 [${type}] Baixando: ${url.substring(0, 80)}...`);
          
          const { data, type: fileType } = await downloadFile(url);
          const fileName = url.split('/').pop() || `file_${Date.now()}`;
          
          console.log(`  ☁️ [${type}] Enviando para Cloudflare R2...`);
          const newUrl = await uploadToCloudflare(data, fileName, fileType);
          
          console.log(`  ✅ [${type}] Migrado com sucesso! Nova URL: ${newUrl.substring(0, 60)}...`);
          
          return {
            type,
            id,
            oldUrl: url,
            newUrl,
            status: 'success'
          };
        } catch (error) {
          if (attempt === maxRetries) {
            console.error(`  ❌ [${type}] Falha após ${maxRetries} tentativas: ${error.message}`);
            return {
              type,
              id,
              oldUrl: url,
              status: 'failed',
              error: error.message
            };
          }
          console.warn(`  ⚠️ [${type}] Tentativa ${attempt} falhou, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      return {
        type,
        id,
        oldUrl: url,
        status: 'failed',
        error: 'Max retries exceeded'
      };
    }

    // CATEGORIA 1: Capas de Produtos
    console.log('\n📸 CATEGORIA 1: Capas de Produtos');
    
    // Primeiro verificar quantos produtos existem no total
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total de produtos no banco: ${totalProducts}`);
    
    // Agora buscar produtos com Bunny CDN
    const { data: productsWithCovers, error: coversError } = await supabase
      .from('products')
      .select('id, cover')
      .not('cover', 'is', null)
      .or('cover.ilike.%bunny%,cover.ilike.%b-cdn%');
    
    if (coversError) {
      console.error('❌ Erro ao buscar capas:', coversError);
    }
    console.log(`📋 Query retornou: ${productsWithCovers?.length || 0} capas com Bunny CDN`);

    if (productsWithCovers && productsWithCovers.length > 0) {
      console.log(`  📋 Encontrados ${productsWithCovers.length} produtos com capas no Bunny`);
      
      for (const product of productsWithCovers) {
        stats.total++;
        const result = await migrateFile(product.cover, product.id, 'product_cover');
        results.push(result);
        
        if (result.status === 'success' && result.newUrl) {
          // Atualizar banco com nova URL (sem salvar antiga em metadata)
          await supabase
            .from('products')
            .update({ cover: result.newUrl })
            .eq('id', product.id);
          
          stats.success++;
          stats.byCategory.product_covers.success++;
        } else {
          stats.failed++;
          stats.byCategory.product_covers.failed++;
        }
      }
    }

    // CATEGORIA 2: E-books
    console.log('\n📚 CATEGORIA 2: E-books');
    
    const { count: totalEbooks } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'E-book');
    console.log(`📊 Total de e-books no banco: ${totalEbooks}`);
    
    const { data: ebooks, error: ebooksError } = await supabase
      .from('products')
      .select('id, share_link, type')
      .eq('type', 'E-book')
      .not('share_link', 'is', null)
      .or('share_link.ilike.%bunny%,share_link.ilike.%b-cdn%');
    
    if (ebooksError) {
      console.error('❌ Erro ao buscar e-books:', ebooksError);
    }
    console.log(`📋 Query retornou: ${ebooks?.length || 0} e-books com Bunny CDN`);

    if (ebooks && ebooks.length > 0) {
      console.log(`  📋 Encontrados ${ebooks.length} e-books no Bunny`);
      
      for (const ebook of ebooks) {
        stats.total++;
        const result = await migrateFile(ebook.share_link, ebook.id, 'ebook');
        results.push(result);
        
        if (result.status === 'success' && result.newUrl) {
          // Atualizar banco com nova URL
          await supabase
            .from('products')
            .update({ share_link: result.newUrl })
            .eq('id', ebook.id);
          
          stats.success++;
          stats.byCategory.ebooks.success++;
        } else {
          stats.failed++;
          stats.byCategory.ebooks.failed++;
        }
      }
    }

    // CATEGORIA 3: Logos de Áreas de Membros
    console.log('\n🎨 CATEGORIA 3: Logos de Áreas de Membros');
    
    const { count: totalAreas } = await supabase
      .from('member_areas')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Total de áreas de membros no banco: ${totalAreas}`);
    
    const { data: memberAreasWithLogos, error: logosError } = await supabase
      .from('member_areas')
      .select('id, logo_url')
      .not('logo_url', 'is', null)
      .or('logo_url.ilike.%bunny%,logo_url.ilike.%b-cdn%');
    
    if (logosError) {
      console.error('❌ Erro ao buscar logos:', logosError);
    }
    console.log(`📋 Query retornou: ${memberAreasWithLogos?.length || 0} logos com Bunny CDN`);

    if (memberAreasWithLogos && memberAreasWithLogos.length > 0) {
      console.log(`  📋 Encontrados ${memberAreasWithLogos.length} logos no Bunny`);
      
      for (const area of memberAreasWithLogos) {
        stats.total++;
        const result = await migrateFile(area.logo_url, area.id, 'member_area_logo');
        results.push(result);
        
        if (result.status === 'success' && result.newUrl) {
          // Atualizar banco com nova URL
          await supabase
            .from('member_areas')
            .update({ logo_url: result.newUrl })
            .eq('id', area.id);
          
          stats.success++;
          stats.byCategory.member_area_logos.success++;
        } else {
          stats.failed++;
          stats.byCategory.member_area_logos.failed++;
        }
      }
    }

    // CATEGORIA 4: Hero Images
    console.log('\n🖼️ CATEGORIA 4: Hero Images de Áreas de Membros');
    
    const { data: memberAreasWithHero, error: heroError } = await supabase
      .from('member_areas')
      .select('id, hero_image_url')
      .not('hero_image_url', 'is', null)
      .or('hero_image_url.ilike.%bunny%,hero_image_url.ilike.%b-cdn%');
    
    if (heroError) {
      console.error('❌ Erro ao buscar hero images:', heroError);
    }
    console.log(`📋 Query retornou: ${memberAreasWithHero?.length || 0} hero images com Bunny CDN`);

    if (memberAreasWithHero && memberAreasWithHero.length > 0) {
      console.log(`  📋 Encontrados ${memberAreasWithHero.length} hero images no Bunny`);
      
      for (const area of memberAreasWithHero) {
        stats.total++;
        const result = await migrateFile(area.hero_image_url, area.id, 'hero_image');
        results.push(result);
        
        if (result.status === 'success' && result.newUrl) {
          // Atualizar banco com nova URL
          await supabase
            .from('member_areas')
            .update({ hero_image_url: result.newUrl })
            .eq('id', area.id);
          
          stats.success++;
          stats.byCategory.hero_images.success++;
        } else {
          stats.failed++;
          stats.byCategory.hero_images.failed++;
        }
      }
    }

    // RESULTADO FINAL
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA!');
    console.log(`📊 Estatísticas Finais:`);
    console.log(`  ✅ Total de arquivos: ${stats.total}`);
    console.log(`  ✅ Sucessos: ${stats.success}`);
    console.log(`  ❌ Falhas: ${stats.failed}`);
    console.log('\n📂 Por Categoria:');
    console.log(`  📸 Capas de Produtos: ${stats.byCategory.product_covers.success}✅ / ${stats.byCategory.product_covers.failed}❌`);
    console.log(`  📚 E-books: ${stats.byCategory.ebooks.success}✅ / ${stats.byCategory.ebooks.failed}❌`);
    console.log(`  🎨 Logos: ${stats.byCategory.member_area_logos.success}✅ / ${stats.byCategory.member_area_logos.failed}❌`);
    console.log(`  🖼️ Hero Images: ${stats.byCategory.hero_images.success}✅ / ${stats.byCategory.hero_images.failed}❌`);

    const failedResults = results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
      console.log('\n❌ Arquivos com falha:');
      failedResults.forEach(r => {
        console.log(`  - [${r.type}] ${r.id}: ${r.error}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migração concluída!',
        stats,
        results,
        failedResults
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
