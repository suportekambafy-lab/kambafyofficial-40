import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductMapping {
  product_id: string;
  product_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_ids }: { product_ids: string[] } = await req.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'product_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Processing products:', product_ids);

    // Buscar produtos e suas áreas de membros
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, user_id')
      .in('id', product_ids);

    if (productsError || !products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Products not found', details: productsError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found ${products.length} products`);

    const allResults: any[] = [];

    for (const product of products) {
      console.log(`\n📦 Processing product: "${product.name}" (${product.id})`);

      // Buscar área de membros do vendedor
      const { data: memberAreas } = await supabase
        .from('member_areas')
        .select('id, name, url')
        .eq('user_id', product.user_id);

      const memberArea = memberAreas && memberAreas.length > 0 ? memberAreas[0] : null;

      if (!memberArea) {
        console.log(`⚠️ No member area found for product "${product.name}"`);
        allResults.push({
          product_id: product.id,
          product_name: product.name,
          success: false,
          error: 'No member area found'
        });
        continue;
      }

      console.log(`📚 Member area: ${memberArea.name}`);

      // Buscar "Turma A" (turma padrão)
      const { data: cohorts } = await supabase
        .from('member_area_cohorts')
        .select('id, name')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'active')
        .eq('name', 'Turma A')
        .limit(1);

      const defaultCohort = cohorts && cohorts.length > 0 ? cohorts[0] : null;

      if (!defaultCohort) {
        console.log(`⚠️ No "Turma A" found for "${memberArea.name}"`);
        allResults.push({
          product_id: product.id,
          product_name: product.name,
          member_area_name: memberArea.name,
          success: false,
          error: 'No "Turma A" found'
        });
        continue;
      }

      console.log(`🎓 Default cohort: ${defaultCohort.name}`);

      // Buscar alunos SEM turma nesta área de membros
      const { data: studentsWithoutCohort, error: studentsError } = await supabase
        .from('member_area_students')
        .select('student_email, student_name')
        .eq('member_area_id', memberArea.id)
        .is('cohort_id', null);

      if (studentsError) {
        console.error(`❌ Error fetching students:`, studentsError);
        allResults.push({
          product_id: product.id,
          product_name: product.name,
          member_area_name: memberArea.name,
          success: false,
          error: studentsError.message
        });
        continue;
      }

      console.log(`👥 Found ${studentsWithoutCohort?.length || 0} students without cohort`);

      if (!studentsWithoutCohort || studentsWithoutCohort.length === 0) {
        allResults.push({
          product_id: product.id,
          product_name: product.name,
          member_area_name: memberArea.name,
          cohort_name: defaultCohort.name,
          students_added: 0,
          success: true,
          message: 'All students already have cohort'
        });
        continue;
      }

      // Adicionar alunos à Turma A
      let addedCount = 0;
      let failedCount = 0;

      for (const student of studentsWithoutCohort) {
        try {
          const { error: updateError } = await supabase
            .from('member_area_students')
            .update({ cohort_id: defaultCohort.id })
            .eq('member_area_id', memberArea.id)
            .eq('student_email', student.student_email);

          if (updateError) {
            console.error(`❌ Failed to add ${student.student_email}:`, updateError);
            failedCount++;
          } else {
            console.log(`✅ Added ${student.student_email} to "${defaultCohort.name}"`);
            addedCount++;
          }
        } catch (error) {
          console.error(`❌ Exception for ${student.student_email}:`, error);
          failedCount++;
        }
      }

      // Atualizar contador da turma
      const { count } = await supabase
        .from('member_area_students')
        .select('*', { count: 'exact', head: true })
        .eq('member_area_id', memberArea.id)
        .eq('cohort_id', defaultCohort.id);

      if (count !== null) {
        await supabase
          .from('member_area_cohorts')
          .update({ current_students: count })
          .eq('id', defaultCohort.id);
        
        console.log(`📊 Updated cohort "${defaultCohort.name}" count to ${count}`);
      }

      allResults.push({
        product_id: product.id,
        product_name: product.name,
        member_area_name: memberArea.name,
        cohort_name: defaultCohort.name,
        students_added: addedCount,
        students_failed: failedCount,
        total_processed: studentsWithoutCohort.length,
        success: true
      });

      console.log(`✨ Completed "${product.name}": ${addedCount} added, ${failedCount} failed`);
    }

    const totalAdded = allResults.reduce((sum, r) => sum + (r.students_added || 0), 0);
    const totalFailed = allResults.reduce((sum, r) => sum + (r.students_failed || 0), 0);

    console.log(`\n✨ Process completed:
      - Products processed: ${products.length}
      - Total students added to cohorts: ${totalAdded}
      - Total failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${products.length} products`,
        summary: {
          total_products: products.length,
          total_students_added: totalAdded,
          total_failed: totalFailed
        },
        results: allResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in add-students-to-cohorts:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
