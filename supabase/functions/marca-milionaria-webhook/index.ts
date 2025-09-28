import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  order_id: string;
  order_status: 'COMPLETED' | 'PAYMENT_RECEIVED' | 'DECLINED' | 'CANCELLED' | 'REFUNDED';
  product_id: string;
  product_name: string;
  buyer: {
    id: string;
    email: string;
    name: string;
  };
  seller: {
    id: string;
    email: string;
    name: string;
  };
  total: number;
  quantity: number;
  integration_name: string;
  timestamp: string;
  temporaryPassword?: string; // Campo opcional para senha temporária
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
    if (!payload.buyer?.name || !payload.buyer?.email || !payload.order_id) {
      throw new Error('buyer.name, buyer.email e order_id são obrigatórios');
    }

    // Verificar se o pagamento foi concluído
    if (!['COMPLETED', 'PAYMENT_RECEIVED'].includes(payload.order_status)) {
      console.log('Pagamento não concluído, status:', payload.order_status);
      return new Response(JSON.stringify({
        success: false,
        message: `Pagamento não concluído. Status: ${payload.order_status}`
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
      .eq('student_email', payload.buyer.email)
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
          customerName: payload.buyer.name,
          customerEmail: payload.buyer.email,
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
        student_email: payload.buyer.email,
        student_name: payload.buyer.name,
        access_granted_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Erro ao adicionar aluno à área de membros:', insertError);
      throw insertError;
    }

    console.log('✅ Aluno adicionado com sucesso à área de membros Marca Milionária');

    // Enviar email de acesso se for nova conta ou se há senha temporária
    if (studentResult?.isNewAccount || payload.temporaryPassword) {
      console.log('📧 Enviando email de acesso...');
      
      try {
        const { error: emailError } = await supabase.functions.invoke(
          'send-member-access-email',
          {
            body: {
              studentEmail: payload.buyer.email,
              studentName: payload.buyer.name,
              memberAreaName: 'Marca Milionária',
              memberAreaUrl: `https://membros.kambafy.com/login/${MEMBER_AREA_ID}`,
              isNewAccount: studentResult?.isNewAccount || false,
              temporaryPassword: payload.temporaryPassword
            }
          }
        );

        if (emailError) {
          console.error('❌ Erro ao enviar email de acesso:', emailError);
        } else {
          console.log('✅ Email de acesso enviado com sucesso');
        }
      } catch (emailSendError) {
        console.error('❌ Erro no envio do email:', emailSendError);
      }
    }

    // Log da transação para auditoria
    const logData = {
      member_area_id: MEMBER_AREA_ID,
      student_email: payload.buyer.email,
      student_name: payload.buyer.name,
      order_id: payload.order_id,
      order_value: payload.total,
      order_status: payload.order_status,
      product_name: payload.product_name,
      seller_email: payload.seller.email,
      processed_at: new Date().toISOString(),
      webhook_source: 'external_checkout'
    };

    console.log('📊 Log da transação:', logData);

    return new Response(JSON.stringify({
      success: true,
      message: 'Aluno cadastrado com sucesso na área de membros Marca Milionária',
      data: {
        member_area_id: MEMBER_AREA_ID,
        student_email: payload.buyer.email,
        student_name: payload.buyer.name,
        order_id: payload.order_id,
        order_status: payload.order_status,
        total_value: payload.total,
        product_name: payload.product_name,
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