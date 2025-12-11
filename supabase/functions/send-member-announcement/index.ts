import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementRequest {
  member_area_id: string;
  title: string;
  message: string;
  type?: 'announcement' | 'tip' | 'motivation';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { member_area_id, title, message, type = 'announcement' } = await req.json() as AnnouncementRequest;

    console.log('📢 Enviando anúncio:', { member_area_id, title, type });

    // Buscar todos os alunos da área de membros
    const { data: students, error: studentsError } = await supabase
      .from('member_area_students')
      .select('student_email, student_name')
      .eq('member_area_id', member_area_id);

    if (studentsError) {
      console.error('❌ Erro ao buscar alunos:', studentsError);
      throw studentsError;
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum aluno encontrado', sent_to: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Enviando para ${students.length} alunos`);

    // Criar notificações para todos os alunos
    const notifications = students.map(student => ({
      member_area_id,
      student_email: student.student_email,
      type,
      title,
      message,
      data: { type, sent_at: new Date().toISOString() },
      read: false
    }));

    const { error: insertError } = await supabase
      .from('member_area_notifications')
      .insert(notifications);

    if (insertError) {
      console.error('❌ Erro ao inserir notificações:', insertError);
      throw insertError;
    }

    console.log(`✅ Anúncio enviado para ${students.length} alunos`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Anúncio enviado para ${students.length} aluno(s)`,
        sent_to: students.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
