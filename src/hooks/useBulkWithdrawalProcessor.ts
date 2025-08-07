import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBulkWithdrawalProcessor(onSuccess: () => void) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = (ids: string[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const processBulkRequests = async (
    requestIds: string[], 
    status: 'aprovado' | 'rejeitado', 
    adminId?: string,
    notes?: string
  ) => {
    setProcessing(true);
    
    try {
      console.log('⚙️ Processando saques em lote:', { requestIds, status, adminId, notes });
      
      // Validar se adminId é um UUID válido
      const validAdminId = adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId) ? adminId : null;
      
      const updateData = {
        status,
        admin_notes: notes || null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Atualizando saques em lote:', updateData);

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .in('id', requestIds);

      if (error) {
        console.error('❌ Erro ao atualizar saques:', error);
        throw error;
      }

      // Se aprovado, enviar emails para todos os vendedores
      if (status === 'aprovado') {
        console.log('📧 Enviando emails para', requestIds.length, 'vendedores');
        
        const emailPromises = requestIds.map(async (requestId) => {
          try {
            const emailResult = await supabase.functions.invoke('send-withdrawal-approval-email', {
              body: { 
                requestId,
                adminId: validAdminId,
                notes: notes
              }
            });
            console.log(`📧 Email enviado para saque ${requestId}:`, emailResult);
            return { requestId, success: true };
          } catch (emailError) {
            console.error(`❌ Erro ao enviar email para saque ${requestId}:`, emailError);
            return { requestId, success: false, error: emailError };
          }
        });

        const emailResults = await Promise.allSettled(emailPromises);
        const successCount = emailResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length;
        
        console.log(`📧 Emails enviados: ${successCount}/${requestIds.length}`);
      }

      console.log('✅ Saques processados em lote com sucesso');

      // Registrar log administrativo (não bloqueante)
      if (validAdminId) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: validAdminId,
            action: `withdrawals_bulk_${status}`,
            target_type: 'withdrawal_request',
            target_id: null,
            details: { ids: requestIds, notes: notes || null }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log admin (bulk):', logErr);
        }
      }

      toast({
        title: 'Sucesso',
        description: `${requestIds.length} saque(s) ${status}(s) com sucesso`,
        variant: status === 'aprovado' ? 'default' : 'destructive'
      });

      // Limpar seleção
      clearSelection();
      
      // Atualizar dados
      onSuccess();
      
    } catch (error) {
      console.error('💥 Erro ao processar saques em lote:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar saques em lote',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    processBulkRequests
  };
}