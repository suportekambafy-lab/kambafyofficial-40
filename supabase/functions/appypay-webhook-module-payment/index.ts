import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔔 [APPYPAY-WEBHOOK-MODULE] Webhook received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('📦 [APPYPAY-WEBHOOK-MODULE] Payload:', payload);

    const { order_id, status, reference_number } = payload;

    if (!order_id) {
      throw new Error('order_id não fornecido');
    }

    // Buscar pagamento do módulo pelo order_id
    const { data: modulePayment, error: fetchError } = await supabase
      .from('module_payments')
      .select('*, modules!inner(*)')
      .eq('order_id', order_id)
      .single();

    if (fetchError || !modulePayment) {
      console.error('❌ [APPYPAY-WEBHOOK-MODULE] Payment not found:', fetchError);
      throw new Error('Pagamento não encontrado');
    }

    console.log('✅ [APPYPAY-WEBHOOK-MODULE] Payment found:', modulePayment.id);

    // Atualizar status do pagamento se foi confirmado
    if (status === 'completed' || status === 'paid') {
      const { error: updateError } = await supabase
        .from('module_payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_data: {
            ...modulePayment.payment_data,
            webhook_status: status,
            webhook_received_at: new Date().toISOString()
          }
        })
        .eq('id', modulePayment.id);

      if (updateError) {
        console.error('❌ [APPYPAY-WEBHOOK-MODULE] Error updating payment:', updateError);
        throw new Error('Erro ao atualizar pagamento');
      }

      console.log('✅ [APPYPAY-WEBHOOK-MODULE] Payment updated to completed');

      // Buscar dados do aluno
      const { data: studentData } = await supabase
        .from('member_area_students')
        .select('cohort_id')
        .eq('member_area_id', modulePayment.member_area_id)
        .ilike('student_email', modulePayment.student_email)
        .single();

      // Se aluno tem turma e módulo tem coming_soon para essa turma, remover
      if (studentData?.cohort_id) {
        const currentComingSoonCohorts = modulePayment.modules.coming_soon_cohort_ids || [];
        const updatedComingSoonCohorts = currentComingSoonCohorts.filter(
          (id: string) => id !== studentData.cohort_id
        );

        await supabase
          .from('modules')
          .update({
            coming_soon_cohort_ids: updatedComingSoonCohorts.length > 0 ? updatedComingSoonCohorts : null
          })
          .eq('id', modulePayment.module_id);

        console.log('✅ [APPYPAY-WEBHOOK-MODULE] Module access granted to student');
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 [APPYPAY-WEBHOOK-MODULE] Error:', error);
    
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
