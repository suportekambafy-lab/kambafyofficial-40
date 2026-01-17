import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewLessonNotificationRequest {
  lessonId: string;
  memberAreaId: string;
  lessonTitle: string;
  lessonDescription?: string;
  moduleName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY não configurada');
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      lessonId, 
      memberAreaId, 
      lessonTitle, 
      lessonDescription,
      moduleName 
    } = await req.json() as NewLessonNotificationRequest;

    console.log('📧 Enviando notificação de nova aula:', { lessonId, memberAreaId, lessonTitle });

    // Buscar informações da área de membros
    const { data: memberArea, error: memberAreaError } = await supabase
      .from('member_areas')
      .select('name, url')
      .eq('id', memberAreaId)
      .single();

    if (memberAreaError) {
      console.error('❌ Erro ao buscar área de membros:', memberAreaError);
      throw memberAreaError;
    }

    // Buscar todos os alunos da área de membros
    const { data: students, error: studentsError } = await supabase
      .from('member_area_students')
      .select('student_email, student_name')
      .eq('member_area_id', memberAreaId);

    if (studentsError) {
      console.error('❌ Erro ao buscar alunos:', studentsError);
      throw studentsError;
    }

    if (!students || students.length === 0) {
      console.log('ℹ️ Nenhum aluno encontrado na área de membros');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum aluno encontrado', sent: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Preparando envio para ${students.length} alunos`);

    const loginUrl = `https://kambafyofficial-40.lovable.app/member-login/${memberArea.url}`;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Processar em lotes de 10 para evitar rate limiting
    const batchSize = 10;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (student) => {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 Nova Aula Disponível!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                        Olá <strong>${student.student_name || 'Aluno'}</strong>,
                      </p>
                      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                        Uma nova aula foi adicionada ao curso <strong>${memberArea.name}</strong>!
                      </p>
                      
                      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                        <h2 style="margin: 0 0 8px 0; color: #1e40af; font-size: 20px;">${lessonTitle}</h2>
                        ${moduleName ? `<p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">📚 Módulo: ${moduleName}</p>` : ''}
                        ${lessonDescription ? `<p style="margin: 0; color: #4b5563; font-size: 14px;">${lessonDescription}</p>` : ''}
                      </div>
                      
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Ver Aula Agora
                        </a>
                      </div>
                      
                      <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                        Não perca esta nova aula! Aproveite para continuar seu aprendizado.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                        Este email foi enviado automaticamente pelo Kambafy.
                      </p>
                      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                        Você está recebendo este email porque está matriculado em ${memberArea.name}.
                      </p>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `;

          const emailResponse = await resend.emails.send({
            from: 'Kambafy <noreply@kambafy.com>',
            to: [student.student_email],
            subject: `🎓 Nova aula: ${lessonTitle} - ${memberArea.name}`,
            html: emailHtml,
          });

          if (emailResponse.error) {
            console.error(`❌ Erro ao enviar para ${student.student_email}:`, emailResponse.error);
            failed++;
            errors.push(`${student.student_email}: ${emailResponse.error.message}`);
          } else {
            console.log(`✅ Email enviado para ${student.student_email}`);
            sent++;
          }
        } catch (error: any) {
          console.error(`❌ Erro ao enviar para ${student.student_email}:`, error);
          failed++;
          errors.push(`${student.student_email}: ${error.message}`);
        }
      });

      await Promise.all(emailPromises);
      
      // Pequena pausa entre lotes para evitar rate limiting
      if (i + batchSize < students.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Criar notificações in-app para os alunos também
    const notifications = students.map(student => ({
      member_area_id: memberAreaId,
      student_email: student.student_email,
      type: 'new_lesson',
      title: '🎓 Nova Aula Disponível',
      message: `A aula "${lessonTitle}" foi adicionada${moduleName ? ` ao módulo "${moduleName}"` : ''}. Acesse agora!`,
      data: { 
        lesson_id: lessonId, 
        lesson_title: lessonTitle,
        module_name: moduleName,
        sent_at: new Date().toISOString() 
      },
      read: false
    }));

    const { error: insertError } = await supabase
      .from('member_area_notifications')
      .insert(notifications);

    if (insertError) {
      console.error('⚠️ Erro ao inserir notificações in-app:', insertError);
      // Não falhar por causa disso, emails já foram enviados
    } else {
      console.log(`✅ ${students.length} notificações in-app criadas`);
    }

    console.log(`📧 Resumo: ${sent} enviados, ${failed} falhas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificações enviadas para ${sent} aluno(s)`,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
