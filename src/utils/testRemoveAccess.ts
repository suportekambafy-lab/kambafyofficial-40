import { supabase } from '@/integrations/supabase/client';

// Executar esta função para remover o acesso
export async function removeLeosAccess() {
  console.log('🗑️ Removendo acesso do leoelg2@gmail.com ao módulo CONFIGURANDO SUA LOJA...');
  
  const { data, error } = await supabase.functions.invoke('remove-module-access', {
    body: {
      studentEmail: 'leoelg2@gmail.com',
      moduleId: '5bcee871-f9e9-42d1-995d-634c67b6a0a9'
    }
  });

  if (error) {
    console.error('❌ Erro:', error);
    return { success: false, error };
  }

  console.log('✅ Acesso removido com sucesso:', data);
  return { success: true, data };
}

// Auto-executar
removeLeosAccess().then(() => {
  console.log('✅ Processo concluído. Recarregue a página como leoelg2@gmail.com para ver o módulo como pago.');
});
