import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔓 [GRANT-MODULE-ACCESS] Manual access grant request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId, studentEmail, moduleId } = await req.json();
    console.log('📦 [GRANT-MODULE-ACCESS] Request:', { paymentId, studentEmail, moduleId });

    let payment;
    
    // Buscar pagamento por ID ou email+módulo
    if (paymentId) {
      const { data, error } = await supabase
        .from('module_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (error || !data) {
        throw new Error('Pagamento não encontrado');
      }
      payment = data;
    } else if (studentEmail && moduleId) {
      const { data, error } = await supabase
        .from('module_payments')
        .select('*')
        .eq('student_email', studentEmail.toLowerCase().trim())
        .eq('module_id', moduleId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        throw new Error('Pagamento não encontrado');
      }
      payment = data;
    } else {
      throw new Error('paymentId ou (studentEmail + moduleId) são obrigatórios');
    }

    console.log('✅ [GRANT-MODULE-ACCESS] Pagamento encontrado:', payment.id);

    // Verificar se já existe acesso
    const { data: existingAccess } = await supabase
      .from('module_student_access')
      .select('id')
      .eq('module_id', payment.module_id)
      .eq('member_area_id', payment.member_area_id)
      .eq('student_email', payment.student_email.toLowerCase().trim())
      .single();

    if (existingAccess) {
      console.log('⚠️ [GRANT-MODULE-ACCESS] Acesso já existe:', existingAccess.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Acesso já existia',
          accessId: existingAccess.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Buscar dados do aluno para pegar cohort_id
    const { data: studentData } = await supabase
      .from('member_area_students')
      .select('cohort_id')
      .eq('member_area_id', payment.member_area_id)
      .ilike('student_email', payment.student_email)
      .single();

    // Conceder acesso individual ao módulo
    const { data: accessData, error: accessError } = await supabase
      .from('module_student_access')
      .insert({
        module_id: payment.module_id,
        member_area_id: payment.member_area_id,
        student_email: payment.student_email.toLowerCase().trim(),
        cohort_id: studentData?.cohort_id || null,
        payment_id: payment.id,
        granted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (accessError) {
      console.error('❌ [GRANT-MODULE-ACCESS] Erro ao conceder acesso:', accessError);
      throw new Error('Erro ao conceder acesso: ' + accessError.message);
    }

    console.log('✅ [GRANT-MODULE-ACCESS] Acesso concedido com sucesso:', accessData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Acesso concedido com sucesso',
        accessId: accessData.id,
        studentEmail: payment.student_email,
        moduleId: payment.module_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 [GRANT-MODULE-ACCESS] Error:', error);
    
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
