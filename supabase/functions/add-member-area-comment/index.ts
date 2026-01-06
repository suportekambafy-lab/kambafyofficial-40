import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lessonId, comment, studentEmail, studentName, parentCommentId } = await req.json();

    if (!lessonId || !comment?.trim() || !studentEmail || !studentName) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    // Verificar se a lição existe e buscar dados da área de membros
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, member_area_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lessonData) {
      throw new Error('Lição não encontrada');
    }

    // Inserir comentário sem user_id (usaremos apenas email/nome)
    const { data: commentData, error: commentError } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        comment: comment.trim(),
        user_id: null, // Não usar user_id para estudantes da área de membros
        parent_comment_id: parentCommentId || null,
        user_email: studentEmail,
        user_name: studentName
      })
      .select()
      .single();

    if (commentError) {
      console.error('Erro ao inserir comentário:', commentError);
      throw new Error('Erro ao salvar comentário');
    }

    // Criar notificação para o dono da área de membros
    if (lessonData.member_area_id) {
      try {
        // Buscar o email do dono da área
        const { data: memberArea } = await supabase
          .from('member_areas')
          .select('user_id, name')
          .eq('id', lessonData.member_area_id)
          .single();

        if (memberArea?.user_id) {
          // Buscar email do dono
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', memberArea.user_id)
            .single();

          // Verificar se o comentário é do próprio dono (não notificar nesse caso)
          const isOwnerComment = ownerProfile?.email?.toLowerCase().trim() === studentEmail.toLowerCase().trim();

          if (!isOwnerComment) {
            // Criar notificação
            const notificationTitle = parentCommentId 
              ? `${studentName} respondeu a um comentário`
              : `${studentName} comentou na aula`;

            const notificationMessage = parentCommentId
              ? `Nova resposta na aula "${lessonData.title}": "${comment.trim().substring(0, 100)}${comment.trim().length > 100 ? '...' : ''}"`
              : `Novo comentário na aula "${lessonData.title}": "${comment.trim().substring(0, 100)}${comment.trim().length > 100 ? '...' : ''}"`;

            await supabase
              .from('member_area_notifications')
              .insert({
                member_area_id: lessonData.member_area_id,
                student_email: ownerProfile?.email || '', // Email do dono que receberá a notificação
                title: notificationTitle,
                message: notificationMessage,
                type: 'new_comment',
                read: false,
                data: {
                  lesson_id: lessonId,
                  lesson_title: lessonData.title,
                  comment_id: commentData.id,
                  commenter_name: studentName,
                  commenter_email: studentEmail,
                  is_reply: !!parentCommentId
                }
              });

            console.log('✅ Notificação de comentário criada para o dono:', ownerProfile?.email);
          }
        }
      } catch (notifError) {
        // Não falhar se a notificação falhar, apenas logar
        console.error('Erro ao criar notificação (não crítico):', notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: commentData }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Erro na função:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno do servidor'
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});