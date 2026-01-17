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

// Função para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        JSON.stringify({ success: true, message: 'Nenhum aluno encontrado', sent: 0, failed: 0, skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar alunos que JÁ receberam email desta aula
    const { data: alreadySent, error: alreadySentError } = await supabase
      .from('lesson_notification_sent')
      .select('student_email')
      .eq('lesson_id', lessonId);

    if (alreadySentError) {
      console.error('⚠️ Erro ao buscar notificações já enviadas:', alreadySentError);
      // Continua mesmo com erro, para não bloquear envio
    }

    // Criar set de emails já notificados
    const alreadySentEmails = new Set(alreadySent?.map(s => s.student_email.toLowerCase()) || []);
    
    // Filtrar apenas alunos que ainda não receberam
    const studentsToNotify = students.filter(
      s => !alreadySentEmails.has(s.student_email.toLowerCase())
    );

    const skipped = students.length - studentsToNotify.length;
    
    console.log(`📝 Total alunos: ${students.length}, Já notificados: ${skipped}, A notificar: ${studentsToNotify.length}`);

    if (studentsToNotify.length === 0) {
      console.log('ℹ️ Todos os alunos já foram notificados desta aula');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todos os alunos já foram notificados desta aula',
          sent: 0, 
          failed: 0, 
          skipped,
          total: students.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loginUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
    let sent = 0;
    let failed = 0;
    const successfulEmails: string[] = [];

    // Gerar HTML do email
    const generateEmailHtml = (studentName: string) => `
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
                  Olá <strong>${studentName || 'Aluno'}</strong>,
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

    // Enviar emails sequencialmente com delay para respeitar rate limit (2/segundo)
    const emailsPerSecond = 2;
    
    for (let i = 0; i < studentsToNotify.length; i += emailsPerSecond) {
      const batch = studentsToNotify.slice(i, i + emailsPerSecond);
      
      // Enviar lote em paralelo (máximo 2)
      const results = await Promise.allSettled(
        batch.map(async (student) => {
          const emailResponse = await resend.emails.send({
            from: 'Kambafy <noreply@kambafy.com>',
            to: [student.student_email],
            subject: `🎓 Nova aula: ${lessonTitle} - ${memberArea.name}`,
            html: generateEmailHtml(student.student_name),
          });

          if (emailResponse.error) {
            throw new Error(emailResponse.error.message);
          }
          
          return student.student_email;
        })
      );

      // Contar resultados
      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent++;
          successfulEmails.push(result.value);
        } else {
          failed++;
          console.error(`❌ Falha:`, result.reason);
        }
      }

      // Log de progresso a cada 50 emails
      if ((i + emailsPerSecond) % 50 === 0 || i + emailsPerSecond >= studentsToNotify.length) {
        console.log(`📊 Progresso: ${Math.min(i + emailsPerSecond, studentsToNotify.length)}/${studentsToNotify.length} processados (${sent} enviados, ${failed} falhas)`);
      }

      // Aguardar 1.1 segundo antes do próximo lote para respeitar rate limit
      if (i + emailsPerSecond < studentsToNotify.length) {
        await delay(1100);
      }
    }

    // Registrar emails enviados com sucesso na tabela de rastreamento
    if (successfulEmails.length > 0) {
      const sentRecords = successfulEmails.map(email => ({
        lesson_id: lessonId,
        student_email: email,
        member_area_id: memberAreaId
      }));

      // Inserir em lotes de 100
      const recordBatchSize = 100;
      for (let i = 0; i < sentRecords.length; i += recordBatchSize) {
        const batch = sentRecords.slice(i, i + recordBatchSize);
        const { error: insertError } = await supabase
          .from('lesson_notification_sent')
          .insert(batch);

        if (insertError) {
          console.error('⚠️ Erro ao registrar emails enviados:', insertError);
        }
      }
      console.log(`✅ ${successfulEmails.length} registros de envio salvos`);
    }

    // Criar notificações in-app apenas para quem foi notificado
    const notifications = studentsToNotify.map(student => ({
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

    // Inserir notificações em lotes de 100
    const notifBatchSize = 100;
    for (let i = 0; i < notifications.length; i += notifBatchSize) {
      const batch = notifications.slice(i, i + notifBatchSize);
      const { error: insertError } = await supabase
        .from('member_area_notifications')
        .insert(batch);

      if (insertError) {
        console.error('⚠️ Erro ao inserir notificações in-app:', insertError);
      }
    }
    
    console.log(`✅ ${studentsToNotify.length} notificações in-app criadas`);
    console.log(`📧 Resumo final: ${sent} enviados, ${failed} falhas, ${skipped} ignorados (já notificados)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificações enviadas para ${sent} aluno(s)`,
        sent,
        failed,
        skipped,
        total: students.length
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
