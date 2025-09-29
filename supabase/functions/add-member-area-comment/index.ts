import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== ADD MEMBER AREA COMMENT START ===');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lessonId, comment, studentEmail, studentName } = await req.json();

    console.log('Request data:', { lessonId, comment: comment?.substring(0, 50), studentEmail, studentName });

    if (!lessonId || !comment?.trim() || !studentEmail || !studentName) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    // Verificar se a lição existe e obter a área de membros
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, member_area_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lessonData) {
      throw new Error('Lição não encontrada');
    }

    console.log('Lesson data:', lessonData);

    // Verificar se o estudante tem acesso à área de membros
    const { data: studentAccess } = await supabase
      .from('member_area_students')
      .select('*')
      .eq('member_area_id', lessonData.member_area_id)
      .eq('student_email', studentEmail)
      .single();

    // Verificar se existe uma sessão ativa para este estudante na área de membros
    const { data: sessionData } = await supabase
      .from('member_area_sessions')
      .select('*')
      .eq('student_email', studentEmail)
      .gt('expires_at', new Date().toISOString())
      .single();

    console.log('Student access found:', !!studentAccess);
    console.log('Session data found:', !!sessionData);

    if (!studentAccess && !sessionData) {
      throw new Error('Acesso negado à área de membros');
    }

    console.log('Student access verified');

    // Criar um "usuário" temporário para o comentário (usando o email como ID único)
    const encoder = new TextEncoder();
    const data = encoder.encode(studentEmail);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const tempUserId = `member_${hashHex.substring(0, 20)}`;

    // Inserir o comentário
    const { data: commentData, error: commentError } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        comment: comment.trim(),
        user_id: tempUserId
      })
      .select()
      .single();

    if (commentError) {
      console.error('Error inserting comment:', commentError);
      throw commentError;
    }

    console.log('Comment inserted successfully:', commentData);

    return new Response(
      JSON.stringify({
        ...commentData,
        user_id: tempUserId,
        student_name: studentName,
        student_email: studentEmail
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('=== ERROR IN ADD MEMBER AREA COMMENT ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erro interno do servidor',
        details: error
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