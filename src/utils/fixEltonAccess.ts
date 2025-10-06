import { supabase } from '@/integrations/supabase/client';

// Executar esta função para liberar o acesso do sneeperhelton@gmail.com
export async function fixEltonAccess() {
  console.log('🔓 Liberando acesso do Elton ao módulo CONFIGURANDO SUA LOJA...');
  
  const { data, error } = await supabase.functions.invoke('grant-module-access-manually', {
    body: {
      studentEmail: 'sneeperhelton@gmail.com',
      moduleId: '5bcee871-f9e9-42d1-995d-634c67b6a0a9'
    }
  });

  if (error) {
    console.error('❌ Erro:', error);
    return { success: false, error };
  }

  console.log('✅ Acesso liberado com sucesso:', data);
  return { success: true, data };
}

// Auto-executar
fixEltonAccess().then(() => {
  console.log('✅ Processo concluído. O Elton já pode acessar o módulo!');
});
