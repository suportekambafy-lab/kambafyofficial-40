import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  customerName: string;
  customerEmail: string;
  orderValue?: number;
  orderId?: string;
  paymentStatus: 'completed' | 'paid' | 'success';
  temporaryPassword?: string;
}

const MEMBER_AREA_ID = "290b0398-c5f4-4681-944b-edc40f6fe0a2"; // Marca Milionária

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MARCA MILIONÁRIA WEBHOOK START ===');
    
    const payload: WebhookPayload = await req.json();
    console.log('Webhook payload:', payload);

    // Validar campos obrigatórios
    if (!payload.customerName || !payload.customerEmail) {
      throw new Error('customerName e customerEmail são obrigatórios');
    }

    // Verificar se o pagamento foi concluído
    if (!['completed', 'paid', 'success'].includes(payload.paymentStatus)) {
      console.log('Pagamento não concluído, ignorando webhook');
      return new Response(JSON.stringify({
        success: false,
        message: 'Pagamento não concluído'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Criar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🎯 Adicionando aluno à área de membros Marca Milionária...');

    // Verificar se o aluno já existe na área de membros
    const { data: existingStudent, error: checkError } = await supabase
      .from('member_area_students')
      .select('id')
      .eq('member_area_id', MEMBER_AREA_ID)
      .eq('student_email', payload.customerEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar aluno existente:', checkError);
      throw checkError;
    }

    if (existingStudent) {
      console.log('✅ Aluno já existe na área de membros');
      return new Response(JSON.stringify({
        success: true,
        message: 'Aluno já cadastrado na área de membros',
        studentExists: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Chamar a função add-member-area-student para criar/atualizar o usuário
    console.log('🔧 Chamando função add-member-area-student...');
    
    const { data: studentResult, error: studentError } = await supabase.functions.invoke(
      'add-member-area-student',
      {
        body: {
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          temporaryPassword: payload.temporaryPassword
        }
      }
    );

    if (studentError) {
      console.error('Erro ao criar/atualizar usuário:', studentError);
      throw studentError;
    }

    console.log('✅ Usuário processado:', studentResult);

    // Adicionar o aluno à área de membros específica
    console.log('👥 Adicionando aluno à área de membros...');
    
    const { error: insertError } = await supabase
      .from('member_area_students')
      .insert({
        member_area_id: MEMBER_AREA_ID,
        student_email: payload.customerEmail,
        student_name: payload.customerName,
        access_granted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Erro ao adicionar aluno à área de membros:', insertError);
      throw insertError;
    }

    console.log('✅ Aluno adicionado com sucesso à área de membros Marca Milionária');

    // Log da transação para auditoria
    const logData = {
      member_area_id: MEMBER_AREA_ID,
      student_email: payload.customerEmail,
      student_name: payload.customerName,
      order_id: payload.orderId,
      order_value: payload.orderValue,
      processed_at: new Date().toISOString(),
      webhook_source: 'external_checkout'
    };

    console.log('📊 Log da transação:', logData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Aluno cadastrado com sucesso na área de membros Marca Milionária',
      data: {
        member_area_id: MEMBER_AREA_ID,
        student_email: payload.customerEmail,
        student_name: payload.customerName,
        user_created: studentResult?.userCreated || false,
        password_provided: !!payload.temporaryPassword
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERRO NO WEBHOOK MARCA MILIONÁRIA ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro ao processar webhook da Marca Milionária'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);