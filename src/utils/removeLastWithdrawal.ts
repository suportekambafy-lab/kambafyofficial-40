import { supabase } from '@/integrations/supabase/client';

// Executar esta função para remover o último saque
export async function removeLastWithdrawal() {
  console.log('🗑️ Removendo último saque pendente...');
  
  const withdrawalId = 'af2474e2-887e-47cf-85e2-522d73a0bebe';
  
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .delete()
    .eq('id', withdrawalId)
    .select();

  if (error) {
    console.error('❌ Erro ao remover saque:', error);
    return { success: false, error };
  }

  console.log('✅ Saque removido com sucesso:', data);
  console.log('💰 Saldo disponível voltará para: 1.812.109,96 KZ');
  console.log('🔄 Recarregue a página para ver o saldo atualizado');
  return { success: true, data };
}

// Auto-executar
removeLastWithdrawal();
