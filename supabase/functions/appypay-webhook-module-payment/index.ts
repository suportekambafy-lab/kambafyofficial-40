import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

      // ✅ Verificar se acesso já existe
      const { data: existingAccess, error: checkError } = await supabase
        .from('module_student_access')
        .select('id')
        .eq('module_id', modulePayment.module_id)
        .eq('member_area_id', modulePayment.member_area_id)
        .eq('student_email', modulePayment.student_email.toLowerCase().trim())
        .maybeSingle();

      if (checkError) {
        console.error('❌ [APPYPAY-WEBHOOK-MODULE] Error checking existing access:', checkError);
      }

      if (existingAccess) {
        console.log('⚠️ [APPYPAY-WEBHOOK-MODULE] Access already exists, skipping:', existingAccess.id);
      } else {
        // ✅ Conceder acesso individual ao módulo na nova tabela
        const { data: newAccess, error: accessError } = await supabase
          .from('module_student_access')
          .insert({
            module_id: modulePayment.module_id,
            member_area_id: modulePayment.member_area_id,
            student_email: modulePayment.student_email.toLowerCase().trim(),
            cohort_id: studentData?.cohort_id || null,
            payment_id: modulePayment.id,
            granted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (accessError) {
          console.error('❌ [APPYPAY-WEBHOOK-MODULE] Error granting module access:', accessError);
          // NÃO lançar erro - webhook deve retornar 200 mesmo se falhar aqui
          // O acesso pode ser liberado manualmente depois
        } else {
          console.log('✅ [APPYPAY-WEBHOOK-MODULE] Individual module access granted:', {
            accessId: newAccess.id,
            studentEmail: modulePayment.student_email,
            moduleId: modulePayment.module_id
          });
        }
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
