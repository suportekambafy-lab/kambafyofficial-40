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

    // Gerar UUID determinístico baseado no email
    const encoder = new TextEncoder();
    const data = encoder.encode(studentEmail);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Formatação UUID válida
    const hex = hashHex.substring(0, 32);
    const userId = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;

    // Inserir comentário
    const { data: commentData, error: commentError } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        comment: comment.trim(),
        user_id: userId,
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