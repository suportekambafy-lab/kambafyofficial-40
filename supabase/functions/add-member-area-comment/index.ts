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

    // Verificar se a lição existe
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, member_area_id')
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