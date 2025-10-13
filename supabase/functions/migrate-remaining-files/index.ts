import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🔄 Migrate Remaining Files Function initialized');

interface MigrationResult {
  id: string;
  type: 'lesson_material' | 'identity_doc';
  field: string;
  status: 'success' | 'failed';
  originalUrl?: string;
  newUrl?: string;
  error?: string;
}

// Função segura para converter Uint8Array para base64 (byte-por-byte, sem stack overflow)
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Starting migration of remaining files from Bunny CDN');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: MigrationResult[] = [];
    const MAX_FILES_PER_RUN = 5;
    let filesProcessed = 0;

    // 1. Buscar materiais de aula com URLs do Bunny CDN
    console.log('📚 Fetching lessons with Bunny CDN materials...');
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, lesson_materials');

    if (lessonsError) {
      throw new Error(`Error fetching lessons: ${lessonsError.message}`);
    }

    // Filtrar apenas lessons com URLs do Bunny no lesson_materials
    const lessonsWithBunny = (lessons || []).filter(lesson => {
      if (!lesson.lesson_materials) return false;
      const materials = JSON.stringify(lesson.lesson_materials);
      return materials.includes('b-cdn.net') || materials.includes('bunnycdn.net');
    });

    // Processar materiais de aula
    console.log(`  ↳ Found ${lessonsWithBunny.length} lessons with Bunny CDN materials`);
    for (const lesson of lessonsWithBunny) {
      if (filesProcessed >= MAX_FILES_PER_RUN) break;

      const materials = lesson.lesson_materials as any[];
      if (!materials || !Array.isArray(materials)) continue;

      let materialsUpdated = false;

      for (let i = 0; i < materials.length; i++) {
        if (filesProcessed >= MAX_FILES_PER_RUN) break;

        const material = materials[i];
        if (material.url && (material.url.includes('b-cdn.net') || material.url.includes('bunnycdn.net'))) {
          console.log(`\n📄 Migrating lesson material: "${material.name || 'Unknown'}" from lesson "${lesson.title}"`);
          console.log(`  ↳ Original URL: ${material.url}`);

          try {
            // Download do Bunny CDN
            console.log('  ↳ Downloading from Bunny CDN...');
            const fileResponse = await fetch(material.url);
            if (!fileResponse.ok) {
              throw new Error(`Failed to download file: ${fileResponse.status}`);
            }

            const fileBlob = await fileResponse.blob();
            const arrayBuffer = await fileBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Converter para base64 (método eficiente para arquivos grandes)
            const base64Data = uint8ArrayToBase64(uint8Array);

            // Extrair nome do arquivo
            const urlParts = material.url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `material_${Date.now()}.pdf`;

            // Upload para Cloudflare R2
            console.log('  ↳ Uploading to Cloudflare R2...');
            const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
              'cloudflare-r2-upload',
              {
                body: {
                  fileName: fileName,
                  fileType: fileBlob.type || 'application/pdf',
                  fileData: base64Data,
                },
              }
            );

            if (uploadError || !uploadData?.success) {
              throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');
            }

            const newUrl = uploadData.url;
            console.log(`  ✅ Upload successful!`);
            console.log(`  ↳ New URL: ${newUrl}`);

            // Atualizar URL no array
            materials[i].url = newUrl;
            materialsUpdated = true;
            filesProcessed++;

            results.push({
              id: lesson.id,
              type: 'lesson_material',
              field: `lesson_materials[${i}]`,
              status: 'success',
              originalUrl: material.url,
              newUrl: newUrl,
            });
          } catch (error) {
            console.error(`  ❌ Failed to migrate lesson material:`, error);
            results.push({
              id: lesson.id,
              type: 'lesson_material',
              field: `lesson_materials[${i}]`,
              status: 'failed',
              originalUrl: material.url,
              error: error.message,
            });
            filesProcessed++;
          }
        }
      }

      // Atualizar lesson_materials se houve mudanças
      if (materialsUpdated) {
        console.log(`  ↳ Updating lesson materials in database...`);
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ lesson_materials: materials })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`  ❌ Failed to update lesson:`, updateError);
        } else {
          console.log(`  ✅ Lesson materials updated successfully`);
        }
      }
    }

    // 2. Buscar documentos de verificação de identidade com URLs do Bunny CDN
    if (filesProcessed < MAX_FILES_PER_RUN) {
      console.log('\n🆔 Fetching identity verification documents...');
      const { data: allDocs, error: docsError } = await supabase
        .from('identity_verification')
        .select('id, full_name, document_front_url, document_back_url');

      if (docsError) {
        throw new Error(`Error fetching identity docs: ${docsError.message}`);
      }

      // Filtrar documentos com URLs do Bunny
      const identityDocs = (allDocs || [])
        .filter(doc => 
          (doc.document_front_url && (doc.document_front_url.includes('b-cdn.net') || doc.document_front_url.includes('bunnycdn.net'))) ||
          (doc.document_back_url && (doc.document_back_url.includes('b-cdn.net') || doc.document_back_url.includes('bunnycdn.net')))
        )
        .slice(0, MAX_FILES_PER_RUN - filesProcessed);

      console.log(`  ↳ Found ${identityDocs.length} identity documents with Bunny CDN URLs`);

      // Processar documentos de identidade
      for (const doc of identityDocs || []) {
        if (filesProcessed >= MAX_FILES_PER_RUN) break;

        // Processar document_front_url
        if (doc.document_front_url && (doc.document_front_url.includes('b-cdn.net') || doc.document_front_url.includes('bunnycdn.net'))) {
          console.log(`\n📄 Migrating front document for: "${doc.full_name}"`);
          console.log(`  ↳ Original URL: ${doc.document_front_url}`);

          try {
            const fileResponse = await fetch(doc.document_front_url);
            if (!fileResponse.ok) {
              throw new Error(`Failed to download file: ${fileResponse.status}`);
            }

            const fileBlob = await fileResponse.blob();
            const arrayBuffer = await fileBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const base64Data = uint8ArrayToBase64(uint8Array);

            const urlParts = doc.document_front_url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `doc_front_${Date.now()}.jpg`;

            const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
              'cloudflare-r2-upload',
              {
                body: {
                  fileName: fileName,
                  fileType: fileBlob.type || 'image/jpeg',
                  fileData: base64Data,
                },
              }
            );

            if (uploadError || !uploadData?.success) {
              throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');
            }

            const newUrl = uploadData.url;
            console.log(`  ✅ Upload successful!`);
            console.log(`  ↳ New URL: ${newUrl}`);

            // Atualizar no banco
            const { error: updateError } = await supabase
              .from('identity_verification')
              .update({ document_front_url: newUrl })
              .eq('id', doc.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            filesProcessed++;
            results.push({
              id: doc.id,
              type: 'identity_doc',
              field: 'document_front_url',
              status: 'success',
              originalUrl: doc.document_front_url,
              newUrl: newUrl,
            });
          } catch (error) {
            console.error(`  ❌ Failed to migrate front document:`, error);
            results.push({
              id: doc.id,
              type: 'identity_doc',
              field: 'document_front_url',
              status: 'failed',
              originalUrl: doc.document_front_url,
              error: error.message,
            });
            filesProcessed++;
          }
        }

        if (filesProcessed >= MAX_FILES_PER_RUN) break;

        // Processar document_back_url
        if (doc.document_back_url && (doc.document_back_url.includes('b-cdn.net') || doc.document_back_url.includes('bunnycdn.net'))) {
          console.log(`\n📄 Migrating back document for: "${doc.full_name}"`);
          console.log(`  ↳ Original URL: ${doc.document_back_url}`);

          try {
            const fileResponse = await fetch(doc.document_back_url);
            if (!fileResponse.ok) {
              throw new Error(`Failed to download file: ${fileResponse.status}`);
            }

            const fileBlob = await fileResponse.blob();
            const arrayBuffer = await fileBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const base64Data = uint8ArrayToBase64(uint8Array);

            const urlParts = doc.document_back_url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `doc_back_${Date.now()}.jpg`;

            const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
              'cloudflare-r2-upload',
              {
                body: {
                  fileName: fileName,
                  fileType: fileBlob.type || 'image/jpeg',
                  fileData: base64Data,
                },
              }
            );

            if (uploadError || !uploadData?.success) {
              throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');
            }

            const newUrl = uploadData.url;
            console.log(`  ✅ Upload successful!`);
            console.log(`  ↳ New URL: ${newUrl}`);

            const { error: updateError } = await supabase
              .from('identity_verification')
              .update({ document_back_url: newUrl })
              .eq('id', doc.id);

            if (updateError) {
              throw new Error(`Database update failed: ${updateError.message}`);
            }

            filesProcessed++;
            results.push({
              id: doc.id,
              type: 'identity_doc',
              field: 'document_back_url',
              status: 'success',
              originalUrl: doc.document_back_url,
              newUrl: newUrl,
            });
          } catch (error) {
            console.error(`  ❌ Failed to migrate back document:`, error);
            results.push({
              id: doc.id,
              type: 'identity_doc',
              field: 'document_back_url',
              status: 'failed',
              originalUrl: doc.document_back_url,
              error: error.message,
            });
            filesProcessed++;
          }
        }
      }
    }

    // Contar arquivos restantes
    console.log('\n📊 Counting remaining Bunny CDN files...');
    
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('lesson_materials');
    
    const remainingMaterialsCount = (allLessons || []).filter(lesson => {
      if (!lesson.lesson_materials) return false;
      const materials = JSON.stringify(lesson.lesson_materials);
      return materials.includes('b-cdn.net') || materials.includes('bunnycdn.net');
    }).length;

    const { data: allIdentityDocs } = await supabase
      .from('identity_verification')
      .select('document_front_url, document_back_url');
    
    let remainingDocsCount = 0;
    (allIdentityDocs || []).forEach(doc => {
      if (doc.document_front_url && (doc.document_front_url.includes('b-cdn.net') || doc.document_front_url.includes('bunnycdn.net'))) {
        remainingDocsCount++;
      }
      if (doc.document_back_url && (doc.document_back_url.includes('b-cdn.net') || doc.document_back_url.includes('bunnycdn.net'))) {
        remainingDocsCount++;
      }
    });

    const totalRemaining = remainingMaterialsCount + remainingDocsCount;

    console.log('\n🎉 Migration batch completed!');
    console.log(`  ✅ Success: ${results.filter(r => r.status === 'success').length}/${filesProcessed}`);
    console.log(`  ❌ Failed: ${results.filter(r => r.status === 'failed').length}/${filesProcessed}`);
    console.log(`  📊 Remaining files: ${totalRemaining}`);

    const response = {
      success: true,
      results: {
        total: filesProcessed,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        remaining: totalRemaining,
        details: results,
      },
      message: totalRemaining > 0 
        ? `Batch processed! ${totalRemaining} files remaining. Run again to continue.`
        : 'All files migrated successfully!',
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
