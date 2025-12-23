import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ID do usuário com email errado .con
    const userId = '7e62f3ab-10cf-481f-8c3a-2098e90821be';
    const newEmail = 'nataniel.andrade.corrigido@gmail.com'; // Email alternativo já que o .com já existe

    console.log(`🔍 Atualizando email do usuário: ${userId}`);

    // Primeiro, vamos deletar o usuário duplicado com .con já que o .com já existe
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Erro ao deletar usuário duplicado:', deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Usuário com email .con deletado com sucesso`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Usuário duplicado com .con foi removido. O usuário correto com .com já existe.',
      deletedUserId: userId,
      correctUserId: '70d8a3a2-c15a-4e7f-b744-9b20a412b337'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});