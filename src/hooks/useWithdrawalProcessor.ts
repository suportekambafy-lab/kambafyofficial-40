
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useWithdrawalProcessor(onSuccess: () => void) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const processRequest = async (requestId: string, status: 'aprovado' | 'rejeitado', adminId?: string) => {
    setProcessingId(requestId);
    
    try {
      console.log('⚙️ Processando saque via RPC admin:', { requestId, status, notes: notes[requestId], adminId });
      
      // Validar se adminId é um UUID válido
      const validAdminId = adminId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminId) ? adminId : null;
      
      console.log('⚙️ Admin ID validado:', { original: adminId, valid: validAdminId });

      // Usar função RPC específica para admin que bypassa RLS
      const { error } = await supabase.rpc('admin_process_withdrawal_request', {
        request_id: requestId,
        new_status: status,
        admin_id: validAdminId,
        notes_text: notes[requestId] || null
      });

      if (error) {
        console.error('❌ Erro ao processar saque via RPC:', error);
        throw error;
      }

      console.log('✅ Saque processado via RPC com sucesso');

      // ✅ Se aprovado, criar transação de débito para deduzir do saldo
      if (status === 'aprovado') {
        try {
          // Buscar dados da solicitação para saber o valor
          const { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawal_requests')
            .select('user_id, amount')
            .eq('id', requestId)
            .single();

          if (withdrawalError) throw withdrawalError;

          // Calcular o valor bruto original (antes do desconto de 8%)
          const grossAmount = withdrawal.amount / 0.92;

          // Criar transação de débito
          const { error: transactionError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: withdrawal.user_id,
              type: 'debit',
              amount: -grossAmount,
              currency: 'KZ',
              description: `Saque aprovado - Valor líquido: ${withdrawal.amount.toLocaleString()} KZ`
            });

          if (transactionError) {
            console.error('❌ Erro ao criar transação de débito:', transactionError);
          } else {
            console.log('✅ Transação de débito criada com sucesso');
          }
        } catch (err) {
          console.error('❌ Erro ao processar transação:', err);
        }
      }

      // Registrar log administrativo (não bloqueante)
      if (validAdminId) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: validAdminId,
            action: `withdrawal_${status}`,
            target_type: 'withdrawal_request',
            target_id: requestId,
            details: { notes: notes[requestId] || null }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log admin:', logErr);
        }
      }

      // Se aprovado, tentar enviar email para o vendedor
      if (status === 'aprovado') {
        try {
          console.log('📧 Iniciando envio de email...');
          console.log('📧 Parâmetros do email:', { 
            requestId, 
            adminId: validAdminId, 
            notes: notes[requestId] 
          });

          const emailResult = await supabase.functions.invoke('send-withdrawal-approval-email', {
            body: { 
              requestId,
              adminId: validAdminId,
              notes: notes[requestId]
            }
          });

          console.log('📧 Resultado completo do email:', emailResult);
          
          if (emailResult.error) {
            console.error('❌ Erro na função de email:', emailResult.error);
            
            toast({
              title: 'Saque aprovado com aviso',
              description: 'Saque processado, mas houve problema no envio do email',
              variant: 'default'
            });
          } else if (emailResult.data) {
            const responseData = emailResult.data;
            console.log('📧 Dados da resposta do email:', responseData);
            
            if (responseData.success) {
              if (responseData.warning) {
                // Email teve problema mas saque foi processado
                toast({
                  title: 'Saque aprovado com aviso',
                  description: responseData.message || 'Saque processado, mas email não foi enviado',
                  variant: 'default'
                });
              } else {
                // Email enviado com sucesso
                toast({
                  title: 'Sucesso',
                  description: `Saque aprovado e email enviado para ${responseData.recipient}`,
                  variant: 'default'
                });
              }
            } else {
              // Função retornou erro
              toast({
                title: 'Saque aprovado com aviso',
                description: responseData.error || 'Saque processado, mas falha no email',
                variant: 'default'
              });
            }
          } else {
            console.warn('⚠️ Resposta inesperada do email:', emailResult);
            
            toast({
              title: 'Saque aprovado',
              description: 'Saque processado com sucesso',
              variant: 'default'
            });
          }
        } catch (emailError) {
          console.error('💥 Erro inesperado ao enviar email:', emailError);
          
          toast({
            title: 'Saque aprovado com aviso',
            description: 'Saque processado, mas falha ao enviar notificação por email',
            variant: 'default'
          });
        }
      } else {
        // Para rejeições, apenas mostrar sucesso
        toast({
          title: 'Sucesso',
          description: `Saque ${status} com sucesso`,
          variant: 'destructive'
        });
      }

      // Limpar notas após processamento
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });

      // Atualizar imediatamente os dados
      onSuccess();
      
    } catch (error) {
      console.error('💥 Erro geral ao processar saque:', error);
      toast({
        title: 'Erro',
        description: `Erro ao processar saque: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return {
    processingId,
    notes,
    setNotes,
    processRequest
  };
}
