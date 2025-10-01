import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { memberAreaId } = await req.json();

    if (!memberAreaId) {
      throw new Error('member_area_id é obrigatório');
    }

    console.log(`Eliminando comentários da área: ${memberAreaId}`);

    // Buscar todos os IDs das aulas dessa área
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('member_area_id', memberAreaId);

    if (lessonsError) {
      throw lessonsError;
    }

    if (!lessons || lessons.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma aula encontrada', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lessonIds = lessons.map(l => l.id);

    // Eliminar todos os comentários dessas aulas
    const { error: deleteError, count } = await supabase
      .from('lesson_comments')
      .delete({ count: 'exact' })
      .in('lesson_id', lessonIds);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`${count || 0} comentários eliminados com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${count || 0} comentários eliminados com sucesso`,
        deleted: count || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao eliminar comentários:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});