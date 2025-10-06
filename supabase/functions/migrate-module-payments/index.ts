import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔄 [MIGRATE-MODULE-PAYMENTS] Migration started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todos os pagamentos completados
    const { data: completedPayments, error: fetchError } = await supabase
      .from('module_payments')
      .select('*')
      .eq('status', 'completed');

    if (fetchError) {
      console.error('❌ [MIGRATE] Error fetching payments:', fetchError);
      throw fetchError;
    }

    console.log(`📦 [MIGRATE] Found ${completedPayments?.length || 0} completed payments`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const payment of completedPayments || []) {
      // Verificar se já existe acesso para este pagamento específico
      const { data: existingAccess } = await supabase
        .from('module_student_access')
        .select('id')
        .eq('payment_id', payment.id)
        .maybeSingle();

      if (existingAccess) {
        console.log(`⏭️ [MIGRATE] Skipping - access already exists for ${payment.student_email} on module ${payment.module_id}`);
        skipped++;
        continue;
      }

      // Buscar dados do aluno para pegar cohort_id
      const { data: studentData } = await supabase
        .from('member_area_students')
        .select('cohort_id')
        .eq('member_area_id', payment.member_area_id)
        .ilike('student_email', payment.student_email)
        .maybeSingle();

      // Inserir acesso individual
      const { error: insertError } = await supabase
        .from('module_student_access')
        .insert({
          module_id: payment.module_id,
          member_area_id: payment.member_area_id,
          student_email: payment.student_email.toLowerCase().trim(),
          cohort_id: studentData?.cohort_id || null,
          payment_id: payment.id,
          granted_at: payment.completed_at || payment.created_at
        });

      if (insertError) {
        console.error(`❌ [MIGRATE] Error granting access for ${payment.student_email}:`, insertError);
        errors++;
      } else {
        console.log(`✅ [MIGRATE] Access granted to ${payment.student_email} for module ${payment.module_id}`);
        migrated++;
      }
    }

    const summary = {
      success: true,
      total_payments: completedPayments?.length || 0,
      migrated,
      skipped,
      errors,
      message: `Migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`
    };

    console.log('📊 [MIGRATE] Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 [MIGRATE] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
