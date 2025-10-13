import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🧹 Cleanup Inaccessible Files Function initialized');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Starting cleanup of inaccessible Bunny CDN files');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let filesRemoved = 0;

    // Buscar lessons com URLs do Bunny CDN
    console.log('📚 Fetching lessons with Bunny CDN materials...');
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, lesson_materials');

    if (lessonsError) {
      throw new Error(`Error fetching lessons: ${lessonsError.message}`);
    }

    console.log(`  ↳ Total lessons fetched: ${(lessons || []).length}`);

    for (const lesson of lessons || []) {
      let materials = lesson.lesson_materials;
      
      // Parse se for string
      if (typeof materials === 'string') {
        try {
          materials = JSON.parse(materials);
        } catch (e) {
          console.error(`  ❌ Failed to parse lesson_materials for lesson ${lesson.id}`);
          continue;
        }
      }
      
      if (!materials || !Array.isArray(materials)) continue;

      // Verificar cada material
      const validMaterials = [];
      let hasChanges = false;

      for (const material of materials) {
        const isBunnyUrl = material.url && (material.url.includes('b-cdn.net') || material.url.includes('bunnycdn.net'));
        
        if (isBunnyUrl) {
          // Tentar acessar o arquivo
          console.log(`\n🔍 Checking accessibility: ${material.name || 'Unknown'}`);
          console.log(`  ↳ URL: ${material.url}`);
          
          try {
            const response = await fetch(material.url, { method: 'HEAD' });
            
            if (response.ok) {
              console.log(`  ✅ Accessible - keeping`);
              validMaterials.push(material);
            } else {
              console.log(`  ❌ Inaccessible (${response.status}) - removing`);
              hasChanges = true;
              filesRemoved++;
            }
          } catch (error) {
            console.log(`  ❌ Error checking (${error.message}) - removing`);
            hasChanges = true;
            filesRemoved++;
          }
        } else {
          // Não é Bunny URL, manter
          validMaterials.push(material);
        }
      }

      // Atualizar se houve mudanças
      if (hasChanges) {
        console.log(`\n📝 Updating lesson "${lesson.title}"...`);
        console.log(`  ↳ Before: ${materials.length} materials`);
        console.log(`  ↳ After: ${validMaterials.length} materials`);

        const materialsToSave = typeof lesson.lesson_materials === 'string'
          ? JSON.stringify(validMaterials)
          : validMaterials;

        const { error: updateError } = await supabase
          .from('lessons')
          .update({ lesson_materials: materialsToSave })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`  ❌ Failed to update lesson:`, updateError);
        } else {
          console.log(`  ✅ Lesson updated successfully`);
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(`  ↳ Files removed: ${filesRemoved}`);

    return new Response(
      JSON.stringify({
        success: true,
        filesRemoved,
        message: filesRemoved > 0 
          ? `Removed ${filesRemoved} inaccessible file(s)`
          : 'No inaccessible files found',
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Cleanup error:', error);
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
