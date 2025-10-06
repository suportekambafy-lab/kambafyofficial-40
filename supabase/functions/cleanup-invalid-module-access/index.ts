import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 [CLEANUP] Starting invalid module access cleanup...');

    // 1. Buscar todos os acessos atuais
    const { data: allAccess, error: fetchError } = await supabase
      .from('module_student_access')
      .select('id, module_id, student_email, payment_id');

    if (fetchError) {
      console.error('❌ [CLEANUP] Error fetching access records:', fetchError);
      throw fetchError;
    }

    console.log(`📊 [CLEANUP] Found ${allAccess?.length || 0} total access records`);

    let removedNoPayment = 0;
    let removedInvalidPayment = 0;
    let removedWrongModule = 0;
    let removedNotCompleted = 0;

    for (const access of allAccess || []) {
      let shouldRemove = false;
      let reason = '';

      // Verificação 1: Sem payment_id
      if (!access.payment_id) {
        shouldRemove = true;
        reason = 'no payment_id';
        removedNoPayment++;
      } else {
        // Verificação 2: payment_id não existe ou não está completed
        const { data: payment } = await supabase
          .from('module_payments')
          .select('id, module_id, status')
          .eq('id', access.payment_id)
          .single();

        if (!payment) {
          shouldRemove = true;
          reason = 'payment not found';
          removedInvalidPayment++;
        } else if (payment.status !== 'completed') {
          shouldRemove = true;
          reason = `payment status: ${payment.status}`;
          removedNotCompleted++;
        } else if (payment.module_id !== access.module_id) {
          shouldRemove = true;
          reason = `wrong module (access: ${access.module_id}, payment: ${payment.module_id})`;
          removedWrongModule++;
        }
      }

      // Remover se inválido
      if (shouldRemove) {
        console.log(`🗑️ [CLEANUP] Removing access ${access.id} - Reason: ${reason}`);
        const { error: deleteError } = await supabase
          .from('module_student_access')
          .delete()
          .eq('id', access.id);

        if (deleteError) {
          console.error(`❌ [CLEANUP] Error deleting access ${access.id}:`, deleteError);
        }
      }
    }

    const totalRemoved = removedNoPayment + removedInvalidPayment + removedWrongModule + removedNotCompleted;
    const totalValid = (allAccess?.length || 0) - totalRemoved;

    const result = {
      success: true,
      total_checked: allAccess?.length || 0,
      total_removed: totalRemoved,
      total_valid: totalValid,
      breakdown: {
        removed_no_payment: removedNoPayment,
        removed_invalid_payment: removedInvalidPayment,
        removed_wrong_module: removedWrongModule,
        removed_not_completed: removedNotCompleted,
      },
      message: `Limpeza concluída: ${totalRemoved} acessos inválidos removidos, ${totalValid} acessos válidos mantidos`,
    };

    console.log('✅ [CLEANUP] Cleanup completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ [CLEANUP] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
