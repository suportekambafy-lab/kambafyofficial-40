import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🧹 Cleanup Broken Bunny URLs Function initialized');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Checking for broken Bunny CDN URLs...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      checked: 0,
      cleaned: 0,
      errors: [] as string[],
    };

    // Buscar documentos com URLs do Bunny
    const { data: docs } = await supabase
      .from('identity_verification')
      .select('id, full_name, document_front_url, document_back_url');

    if (docs) {
      for (const doc of docs) {
        // Verificar document_front_url
        if (doc.document_front_url && (doc.document_front_url.includes('b-cdn.net') || doc.document_front_url.includes('bunnycdn.net'))) {
          results.checked++;
          console.log(`\n🔗 Checking front URL for ${doc.full_name}...`);
          
          try {
            const response = await fetch(doc.document_front_url, { method: 'HEAD' });
            if (!response.ok) {
              console.log(`  ❌ Broken (${response.status}), removing...`);
              await supabase
                .from('identity_verification')
                .update({ document_front_url: null })
                .eq('id', doc.id);
              results.cleaned++;
            } else {
              console.log(`  ✅ URL is valid`);
            }
          } catch (error) {
            console.log(`  ❌ Error checking URL:`, error.message);
            results.errors.push(`${doc.full_name} (front): ${error.message}`);
          }
        }

        // Verificar document_back_url
        if (doc.document_back_url && (doc.document_back_url.includes('b-cdn.net') || doc.document_back_url.includes('bunnycdn.net'))) {
          results.checked++;
          console.log(`\n🔗 Checking back URL for ${doc.full_name}...`);
          
          try {
            const response = await fetch(doc.document_back_url, { method: 'HEAD' });
            if (!response.ok) {
              console.log(`  ❌ Broken (${response.status}), removing...`);
              await supabase
                .from('identity_verification')
                .update({ document_back_url: null })
                .eq('id', doc.id);
              results.cleaned++;
            } else {
              console.log(`  ✅ URL is valid`);
            }
          } catch (error) {
            console.log(`  ❌ Error checking URL:`, error.message);
            results.errors.push(`${doc.full_name} (back): ${error.message}`);
          }
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log(`  🔍 Checked: ${results.checked}`);
    console.log(`  🧹 Cleaned: ${results.cleaned}`);
    console.log(`  ❌ Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Cleanup completed: ${results.cleaned} broken URLs removed`,
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
