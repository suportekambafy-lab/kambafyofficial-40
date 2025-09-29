import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StudentData {
  name: string;
  email: string;
  order_id?: string;
  amount?: number;
}

interface BulkRegisterPayload {
  students: StudentData[];
}

const MEMBER_AREA_ID = "c13f3dc7-66e7-4b90-8821-9e23767e7561"; // AI Lucrativo

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== BULK REGISTER IA LUCRATIVO START ===');
    
    const payload: BulkRegisterPayload = await req.json();
    console.log('Bulk register payload:', payload);

    if (!payload.students || !Array.isArray(payload.students) || payload.students.length === 0) {
      throw new Error('Lista de estudantes é obrigatória');
    }

    // Criar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = [];
    const errors = [];

    for (const student of payload.students) {
      try {
        console.log(`\n🎯 Processando aluno: ${student.name} (${student.email})`);

        // Validar dados obrigatórios
        if (!student.name || !student.email) {
          throw new Error(`Nome e email são obrigatórios para o aluno: ${student.name || student.email}`);
        }

        // Verificar se o aluno já existe na área de membros
        const { data: existingStudent, error: checkError } = await supabase
          .from('member_area_students')
          .select('id')
          .eq('member_area_id', MEMBER_AREA_ID)
          .eq('student_email', student.email)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Erro ao verificar aluno existente:', checkError);
          throw checkError;
        }

        if (existingStudent) {
          console.log('✅ Aluno já existe na área de membros');
          results.push({
            email: student.email,
            name: student.name,
            status: 'already_exists',
            message: 'Aluno já cadastrado'
          });
          continue;
        }

        // Gerar senha temporária
        const temporaryPassword = Math.random().toString(36).slice(-8) + 
                                 Math.random().toString(36).slice(-4).toUpperCase() +
                                 Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        console.log('🔐 Senha temporária gerada para:', student.email);
        
        // Chamar a função add-member-area-student para criar/atualizar o usuário
        console.log('🔧 Chamando função add-member-area-student...');
        
        const { data: studentResult, error: studentError } = await supabase.functions.invoke(
          'add-member-area-student',
          {
            body: {
              customerName: student.name,
              customerEmail: student.email,
              temporaryPassword: temporaryPassword
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
            student_email: student.email,
            student_name: student.name,
            access_granted_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Erro ao adicionar aluno à área de membros:', insertError);
          throw insertError;
        }

        console.log('✅ Aluno adicionado com sucesso à área de membros IA Lucrativo');

        // Enviar email de acesso
        console.log('📧 Enviando email de acesso...');
        
        try {
          const emailPayload = {
            studentEmail: student.email,
            studentName: student.name,
            memberAreaName: 'IA Lucrativo',
            memberAreaUrl: `https://kambafy.com/members/login/${MEMBER_AREA_ID}`,
            isNewAccount: studentResult?.isNewAccount || true,
            temporaryPassword: temporaryPassword
          };
          
          console.log('📧 Dados para envio de email:', emailPayload);
          
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            'send-member-access-email',
            {
              body: emailPayload
            }
          );

          if (emailError) {
            console.error('❌ Erro ao invocar função de email:', emailError);
          } else {
            console.log('✅ Função de email invocada com sucesso:', emailResult);
          }
        } catch (emailSendError) {
          console.error('❌ Erro no envio do email:', emailSendError);
        }

        results.push({
          email: student.email,
          name: student.name,
          status: 'success',
          message: 'Aluno cadastrado com sucesso',
          order_id: student.order_id,
          amount: student.amount,
          user_created: studentResult?.userCreated || false,
          password_provided: !!temporaryPassword
        });

        console.log(`✅ Aluno ${student.name} processado com sucesso`);

      } catch (error: any) {
        console.error(`❌ Erro ao processar aluno ${student.name}:`, error);
        errors.push({
          email: student.email,
          name: student.name,
          error: error.message
        });
      }
    }

    console.log('\n📊 Resumo do processamento:');
    console.log(`✅ Sucessos: ${results.length}`);
    console.log(`❌ Erros: ${errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processamento concluído. ${results.length} sucessos, ${errors.length} erros`,
      results: results,
      errors: errors,
      summary: {
        total_processed: payload.students.length,
        successful: results.length,
        failed: errors.length
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("=== ERRO NO BULK REGISTER ===");
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Erro ao processar registro em lote'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);