import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Download, Eye, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingTransfer {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  currency: string;
  created_at: string;
  payment_proof_data: any;
  product_name?: string;
  user_id: string;
  product_id?: string;
  payment_proof_hash?: string;
}

interface DuplicateWarning {
  type: 'multiple_pending' | 'has_access' | 'duplicate_hash' | 'multiple_today';
  message: string;
  severity: 'warning' | 'error';
}

interface ConfirmationDialog {
  open: boolean;
  transferId: string;
  action: 'approve' | 'reject';
  warnings: DuplicateWarning[];
}

export function PendingTransfersManager() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<string, DuplicateWarning[]>>(new Map());
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog | null>(null);

  useEffect(() => {
    if (admin) {
      fetchPendingTransfers();
      
      // Set up real-time subscription for updates
      const channel = supabase
        .channel('pending-transfers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
           (payload) => {
             console.log('💰 Pending transfers update triggered:', payload);
             // Pequeno delay para permitir que a transação complete
             setTimeout(() => {
               fetchPendingTransfers();
             }, 500);
           }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [admin]);

  const fetchPendingTransfers = async () => {
    try {
      setLoading(true);
      
      console.log('💰 Buscando transferências pendentes...');

      // Usar função RPC para contornar problemas de RLS
      const { data: orders, error } = await supabase
        .rpc('get_pending_transfers_for_admin');

      console.log('💰 Query resultado:', { data: orders, error });

      if (error) {
        console.error('❌ Erro na query:', error);
        throw error;
      }

      const formattedTransfers: PendingTransfer[] = (orders || [])
        .filter(order => 
          order.status === 'pending' && 
          ['transfer', 'bank_transfer', 'transferencia'].includes(order.payment_method)
        )
        .map(order => {
          const orderWithExtras = order as typeof order & { 
            product_id?: string; 
            payment_proof_hash?: string 
          };
          
          return {
            id: order.id,
            order_id: order.order_id,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            amount: order.amount,
            currency: order.currency || 'KZ',
            created_at: order.created_at,
            payment_proof_data: order.payment_proof_data,
            product_name: order.product_name,
            user_id: order.user_id,
            product_id: orderWithExtras.product_id, // ✅ Agora vem direto da RPC
            payment_proof_hash: orderWithExtras.payment_proof_hash // ✅ Agora vem direto da RPC
          };
        });

      console.log('🔍 Dados das transferências com product_id e hash:', formattedTransfers);

      console.log(`💰 ${formattedTransfers.length} transferências realmente pendentes encontradas`);
      setPendingTransfers(formattedTransfers);
      
      // 🔍 Verificar duplicatas após carregar transferências
      await checkForDuplicates(formattedTransfers);
      
      console.log(`💰 ${formattedTransfers.length} transferências pendentes carregadas`);
    } catch (error) {
      console.error('❌ Erro ao buscar transferências:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transferências pendentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Função para verificar duplicatas e gerar warnings
  const checkForDuplicates = async (transfers: PendingTransfer[]) => {
    console.log('🔍 Verificando duplicatas em', transfers.length, 'transferências...');
    const warnings = new Map<string, DuplicateWarning[]>();
    
    for (const transfer of transfers) {
      const transferWarnings: DuplicateWarning[] = [];
      
      // 1️⃣ Verificar múltiplos pedidos pendentes do mesmo email
      const sameEmailCount = transfers.filter(
        t => t.customer_email === transfer.customer_email
      ).length;
      
      if (sameEmailCount > 1) {
        transferWarnings.push({
          type: 'multiple_pending',
          message: `⚠️ ${sameEmailCount} pedidos pendentes do mesmo email`,
          severity: 'warning'
        });
      }
      
      // 2️⃣ Verificar se cliente já tem acesso ao produto
      if (transfer.product_id) {
        try {
          const { data: access } = await supabase
            .from('customer_access')
            .select('id')
            .eq('customer_email', transfer.customer_email)
            .eq('product_id', transfer.product_id)
            .eq('is_active', true)
            .maybeSingle();
            
          if (access) {
            transferWarnings.push({
              type: 'has_access',
              message: '🚨 Cliente já tem acesso ativo ao produto',
              severity: 'error'
            });
          }
        } catch (error) {
          console.error('Erro ao verificar acesso:', error);
        }
      }
      
      // 3️⃣ Verificar hash duplicado em pedidos aprovados
      if (transfer.payment_proof_hash) {
        try {
          // @ts-ignore - Tipos do Supabase ainda não atualizados após migração
          const { data: duplicateHash } = await supabase
            .from('orders')
            .select('order_id, customer_email, created_at')
            .eq('payment_proof_hash', transfer.payment_proof_hash)
            .eq('status', 'completed')
            .not('id', 'eq', transfer.id)
            .limit(1)
            .maybeSingle();
            
          if (duplicateHash) {
            transferWarnings.push({
              type: 'duplicate_hash',
              message: `🔴 COMPROVATIVO DUPLICADO - já usado no pedido #${duplicateHash.order_id}`,
              severity: 'error'
            });
          }
        } catch (error) {
          console.error('Erro ao verificar hash:', error);
        }
      }
      
      // 4️⃣ Verificar múltiplos pedidos aprovados do mesmo cliente hoje
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayOrders, count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: false })
          .eq('customer_email', transfer.customer_email)
          .eq('status', 'completed')
          .gte('created_at', today)
          .not('id', 'eq', transfer.id);

        if (count && count > 0) {
          transferWarnings.push({
            type: 'multiple_today',
            message: `⚠️ Cliente já teve ${count} pedido(s) aprovado(s) hoje`,
            severity: 'warning'
          });
        }
      } catch (error) {
        console.error('Erro ao verificar pedidos de hoje:', error);
      }
      
      if (transferWarnings.length > 0) {
        warnings.set(transfer.id, transferWarnings);
        console.log(`⚠️ ${transferWarnings.length} warning(s) para pedido #${transfer.order_id}:`, transferWarnings);
      }
    }
    
    setDuplicateWarnings(warnings);
    console.log(`✅ Verificação completa: ${warnings.size} transferências com warnings`);
  };

  const processTransfer = async (transferId: string, action: 'approve' | 'reject') => {
    // Verificar se há warnings antes de processar
    const warnings = duplicateWarnings.get(transferId);
    if (warnings && warnings.length > 0 && action === 'approve') {
      // Mostrar dialog de confirmação
      setConfirmationDialog({
        open: true,
        transferId,
        action,
        warnings
      });
      return;
    }
    
    // Processar normalmente se não houver warnings
    await executeProcessTransfer(transferId, action);
  };

  const executeProcessTransfer = async (transferId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(transferId);
      
      const newStatus = action === 'approve' ? 'completed' : 'failed';
      
      console.log(`💰 ${action === 'approve' ? 'Aprovando' : 'Rejeitando'} transferência:`, transferId);

      // Buscar dados completos do pedido antes de aprovar usando função RPC
      const { data: orderDataArray, error: orderFetchError } = await supabase
        .rpc('get_order_details_for_admin', { p_order_id: transferId });
      
      const orderData = orderDataArray?.[0];

      if (orderFetchError || !orderData) {
        console.error('❌ Erro ao buscar dados do pedido:', orderFetchError);
        throw new Error('Não foi possível buscar dados do pedido');
      }

      // Se aprovando, executar ações pós-aprovação ANTES de marcar como completed
      if (action === 'approve') {
        console.log('✅ Executando ações pós-aprovação...');
        
        try {
          // 1. Criar acesso ao produto (customer_access) - tratar duplicação como sucesso
          console.log('🔑 Criando acesso ao produto...');
          const { error: accessError } = await supabase.rpc('extend_customer_access', {
            p_customer_email: orderData.customer_email,
            p_product_id: orderData.product_id,
            p_order_id: orderData.order_id,
            p_extension_type: orderData.product_access_duration_type || 'lifetime',
            p_extension_value: orderData.product_access_duration_value || 0
          });

          if (accessError && !accessError.message.includes('already exists') && !accessError.message.includes('duplicate key')) {
            console.error('❌ Erro ao criar acesso:', accessError);
            throw accessError;
          } else {
            console.log('✅ Acesso ao produto criado/verificado com sucesso');
          }

          // 2. Adicionar estudante à área de membros (se aplicável) - tratar duplicação como sucesso
          if (orderData.product_member_area_id) {
            console.log('👨‍🎓 Adicionando estudante à área de membros...');
            const { error: studentError } = await supabase
              .from('member_area_students')
              .insert({
                member_area_id: orderData.product_member_area_id,
                student_email: orderData.customer_email,
                student_name: orderData.customer_name
              })
              .select()
              .single();

            if (studentError && !studentError.message.includes('duplicate key') && !studentError.message.includes('already exists')) {
              console.error('❌ Erro ao adicionar estudante:', studentError);
              throw studentError;
            } else {
              console.log('✅ Estudante adicionado/verificado à área de membros');
            }
          }

          // 3. Criar transação de saldo para o vendedor
          console.log('💰 Criando transação de saldo para o vendedor...');
          const sellerCommission = parseFloat(orderData.amount);
          const { error: balanceError } = await supabase
            .from('balance_transactions')
            .insert({
              user_id: orderData.product_user_id,
              type: 'credit',
              amount: sellerCommission,
              currency: orderData.currency || 'KZ',
              description: `Venda do produto: ${orderData.product_name}`,
              order_id: orderData.order_id
            });

          if (balanceError && !balanceError.message.includes('duplicate key') && !balanceError.message.includes('already exists')) {
            console.error('❌ Erro ao criar transação do vendedor:', balanceError);
          } else {
            console.log('✅ Transação do vendedor criada/verificada');
          }

          // 4. Processar dados do order bump se existirem
          let orderBumpData = null;
          if (orderData.order_bump_data) {
            try {
              const bumpData = typeof orderData.order_bump_data === 'string' 
                ? JSON.parse(orderData.order_bump_data) 
                : orderData.order_bump_data;
              
              orderBumpData = {
                bump_product_name: bumpData.bump_product_name,
                bump_product_price: bumpData.bump_product_price,
                bump_product_image: bumpData.bump_product_image,
                discount: bumpData.discount || 0,
                discounted_price: bumpData.discounted_price || 0,
                bump_product_id: bumpData.bump_product_id,
                bump_share_link: bumpData.bump_share_link,
                bump_member_area_id: bumpData.bump_member_area_id
              };
            } catch (error) {
              console.error('❌ Erro ao processar dados do order bump:', error);
            }
          }
          
          // 5. Enviar email de confirmação
          console.log('📧 Enviando email de confirmação...');
          const confirmationPayload = {
            customerName: orderData.customer_name,
            customerEmail: orderData.customer_email,
            productName: orderData.product_name || 'Produto',
            orderId: orderData.order_id,
            amount: orderData.amount,
            currency: orderData.currency || 'KZ',
            productId: orderData.product_id,
            shareLink: orderData.product_share_link,
            memberAreaId: orderData.product_member_area_id,
            sellerId: orderData.product_user_id,
            orderBump: orderBumpData,
            baseProductPrice: orderData.amount
          };

          const { error: emailError } = await supabase.functions.invoke('process-customer-registration', {
            body: confirmationPayload
          });

          if (emailError) {
            console.error('❌ Erro ao processar registro do cliente:', emailError);
          } else {
            console.log('✅ Processo de registro do cliente concluído');
          }

        } catch (postApprovalError) {
          console.error('❌ Erro crítico nas ações pós-aprovação:', postApprovalError);
          throw postApprovalError; // Falhar a aprovação se houver erro crítico
        }
      }

      // Usar função RPC específica para admin
      console.log('🔄 Usando função RPC para processar transferência...');
      
      const { data: updateResult, error: updateError } = await supabase
        .rpc('admin_process_transfer_request', {
          p_transfer_id: transferId,
          p_action: action
        });

      if (updateError) {
        console.error('❌ Erro na função RPC:', updateError);
        throw updateError;
      } 
      
      console.log('✅ Transferência processada via RPC:', updateResult);

      // Verificar se a atualização realmente aconteceu consultando novamente
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('status, updated_at')
        .eq('id', transferId)
        .single();
      
      if (verifyError) {
        console.error('❌ Erro ao verificar atualização:', verifyError);
      } else {
        console.log('🔍 Status final verificado no banco:', verifyOrder);
      }

      // Enviar notificação para o vendedor se aprovado
      if (action === 'approve') {
        try {
          console.log('📬 Enviando notificação para o vendedor...');
          
          // 1. Notificação no banco de dados
          const { error: notificationError } = await supabase
            .from('seller_notifications')
            .insert({
              user_id: orderData.product_user_id,
              type: 'payment_approved',
              title: '🎉 Transferência Aprovada!',
              message: `Sua transferência bancária foi aprovada para o produto "${orderData.product_name}". Valor: ${formatAmount(orderData.amount, orderData.currency)}`,
              order_id: orderData.order_id,
              amount: parseFloat(orderData.amount),
              currency: orderData.currency || 'KZ'
            });

          if (notificationError) {
            console.error('⚠️ Erro ao enviar notificação no banco:', notificationError);
          } else {
            console.log('✅ Notificação salva no banco de dados');
          }

          // 2. Buscar dados do vendedor para enviar email
          console.log('📧 Buscando dados do vendedor para email...');
          const { data: sellerProfile, error: sellerError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', orderData.product_user_id)
            .single();

          if (sellerError || !sellerProfile) {
            console.error('⚠️ Erro ao buscar dados do vendedor:', sellerError);
          } else {
            // 3. Enviar email de notificação
            console.log('📬 Enviando email de notificação para o vendedor...');
            const { error: emailError } = await supabase.functions.invoke('send-seller-notification-email', {
              body: {
                sellerEmail: sellerProfile.email,
                sellerName: sellerProfile.full_name || 'Vendedor',
                productName: orderData.product_name,
                orderNumber: orderData.order_id,
                amount: orderData.amount,
                currency: orderData.currency || 'KZ',
                customerName: orderData.customer_name,
                customerEmail: orderData.customer_email
              }
            });

            if (emailError) {
              console.error('⚠️ Erro ao enviar email para vendedor:', emailError);
            } else {
              console.log('✅ Email de notificação enviado para o vendedor');
            }
          }
          
          console.log('✅ Notificação completa enviada para o vendedor');
        } catch (notificationError) {
          console.error('⚠️ Erro ao enviar notificação para vendedor:', notificationError);
        }
      }

      toast({
        title: action === 'approve' ? "🎉 Transferência Aprovada com Sucesso!" : "Transferência Rejeitada",
        description: action === 'approve' 
          ? "Pagamento processado! Cliente recebeu acesso, vendedor foi notificado por email e o valor foi creditado."
          : `O pagamento foi rejeitado com sucesso`,
        variant: action === 'approve' ? "default" : "destructive"
      });

      // Mostrar toast adicional de sucesso com mais detalhes se aprovado
      if (action === 'approve') {
        setTimeout(() => {
          toast({
            title: "✅ Processamento Completo",
            description: `Pedido #${orderData.order_id} - Cliente: ${orderData.customer_name} - Produto: ${orderData.product_name}`,
            variant: "default"
          });
        }, 2000);
      }

      // Remover imediatamente da lista local para melhor UX
      setPendingTransfers(prev => prev.filter(t => t.id !== transferId));
      
      // NÃO recarregar a lista - confiar na remoção local
      console.log('✅ Processamento concluído - transferência removida da lista');
      
    } catch (error) {
      console.error(`❌ Erro ao ${action === 'approve' ? 'aprovar' : 'rejeitar'} transferência:`, error);
      toast({
        title: "Erro",
        description: `Erro ao ${action === 'approve' ? 'aprovar' : 'rejeitar'} transferência`,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const viewProof = async (proofData: any) => {
    try {
      const data = typeof proofData === 'string' ? JSON.parse(proofData) : proofData;
      
      if (data.proof_file_path) {
        // Novo formato com arquivo no storage - usar signed URL para bucket privado
        const { data: signedUrlData, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(data.proof_file_path, 3600); // URL válida por 1 hora
        
        if (error) {
          console.error('Erro ao criar signed URL:', error);
          throw error;
        }
        
        setSelectedProof({
          url: signedUrlData.signedUrl,
          fileName: data.proof_file_name || 'Comprovativo',
          bank: data.bank || 'N/A',
          uploadedAt: data.upload_timestamp,
          hasFile: true
        });
      } else {
        // Formato antigo - arquivo não disponível no storage
        setSelectedProof({
          url: null,
          fileName: data.proof_file_name || 'Comprovativo',
          bank: data.bank || 'N/A',
          uploadedAt: data.upload_timestamp,
          hasFile: false
        });
      }
      
      setShowProofDialog(true);
    } catch (error) {
      console.error('Erro ao visualizar comprovativo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o comprovativo",
        variant: "destructive"
      });
    }
  };

  const downloadProof = async (proofData: any, orderNumber: string) => {
    try {
      const data = typeof proofData === 'string' ? JSON.parse(proofData) : proofData;
      
      if (data.proof_file_path) {
        // Novo formato com arquivo no storage - usar signed URL para download
        const { data: signedUrlData, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(data.proof_file_path, 3600);
        
        if (error) {
          console.error('Erro ao criar signed URL para download:', error);
          throw error;
        }
        
        const link = document.createElement('a');
        link.href = signedUrlData.signedUrl;
        link.download = `comprovativo-${orderNumber}.${data.proof_file_name?.split('.').pop() || 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: "Arquivo não disponível",
          description: "Este comprovativo foi enviado antes da implementação do sistema de arquivos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer download do comprovativo",
        variant: "destructive"
      });
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    if (currency === 'EUR') {
      return `€${numAmount.toFixed(2)}`;
    } else if (currency === 'MZN') {
      return `${numAmount.toLocaleString()} MT`;
    }
    return `${numAmount.toLocaleString()} KZ`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aprovar Pagamentos - Transferências</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-lg sm:text-xl">Aprovar Pagamentos - Transferências</span>
            <Badge variant="secondary">{pendingTransfers.length} pendentes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTransfers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Nenhuma transferência pendente para aprovação</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTransfers.map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-medium">{transfer.customer_name}</h3>
                        <Badge variant="outline" className="w-fit">#{transfer.order_id}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-muted-foreground mb-3">
                        <div className="break-all">
                          <span className="font-medium">Email:</span> {transfer.customer_email}
                        </div>
                        <div className="break-words">
                          <span className="font-medium">Produto:</span> {transfer.product_name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Valor:</span> {formatAmount(transfer.amount, transfer.currency)}
                        </div>
                        <div>
                          <span className="font-medium">Data:</span> {formatDistanceToNow(new Date(transfer.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                      </div>

                      {/* 🚨 ALERTAS DE DUPLICAÇÃO */}
                      {duplicateWarnings.has(transfer.id) && (
                        <div className="space-y-2 mb-3">
                          {duplicateWarnings.get(transfer.id)!.map((warning, idx) => (
                            <Alert 
                              key={idx} 
                              variant={warning.severity === 'error' ? 'destructive' : 'default'}
                              className={warning.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
                            >
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle className="text-sm font-semibold">Atenção!</AlertTitle>
                              <AlertDescription className="text-xs">
                                {warning.message}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewProof(transfer.payment_proof_data)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Comprovativo
                        </Button>
                        
                        {(() => {
                          try {
                            const data = typeof transfer.payment_proof_data === 'string' 
                              ? JSON.parse(transfer.payment_proof_data) 
                              : transfer.payment_proof_data;
                            return data?.proof_file_path && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadProof(transfer.payment_proof_data, transfer.order_id)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto lg:ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => processTransfer(transfer.id, 'approve')}
                        disabled={processingId === transfer.id}
                        className="bg-green-600 hover:bg-green-700 flex-1 lg:flex-none lg:w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => processTransfer(transfer.id, 'reject')}
                        disabled={processingId === transfer.id}
                        className="flex-1 lg:flex-none lg:w-full"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para ver comprovativo - Responsivo */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprovativo de Transferência</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedProof && (
              <>
                {selectedProof.hasFile && selectedProof.url ? (
                  <div className="border rounded p-2">
                    <img 
                      src={selectedProof.url} 
                      alt="Comprovativo de transferência"
                      className="max-w-full h-auto rounded"
                      onError={(e) => {
                        console.error('Erro ao carregar imagem:', e);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="border rounded p-4 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>Arquivo não disponível para visualização</p>
                    <p className="text-sm">Este comprovativo foi enviado antes da implementação do sistema de arquivos</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Nome do arquivo:</label>
                    <p className="text-muted-foreground break-all">{selectedProof.fileName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="font-medium">Banco:</label>
                    <p className="text-muted-foreground">{selectedProof.bank || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="font-medium">Data de upload:</label>
                    <p className="text-muted-foreground">
                      {selectedProof.uploadedAt ? 
                        formatDistanceToNow(new Date(selectedProof.uploadedAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        }) : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="font-medium">Status do arquivo:</label>
                    <p className="text-muted-foreground">
                      {selectedProof.hasFile ? 'Disponível no storage' : 'Não disponível'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔔 DIALOG DE CONFIRMAÇÃO PARA CASOS SUSPEITOS */}
      <AlertDialog 
        open={confirmationDialog?.open || false} 
        onOpenChange={(open) => !open && setConfirmationDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Confirmar Aprovação Suspeita
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                Este pedido possui os seguintes avisos de segurança:
              </p>
              <div className="space-y-2">
                {confirmationDialog?.warnings.map((warning, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded border ${
                      warning.severity === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {warning.message}
                    </p>
                  </div>
                ))}
              </div>
              <p className="font-semibold text-foreground pt-2">
                Tem certeza que deseja aprovar esta transferência?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationDialog(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmationDialog) {
                  executeProcessTransfer(confirmationDialog.transferId, confirmationDialog.action);
                  setConfirmationDialog(null);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Sim, Aprovar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}