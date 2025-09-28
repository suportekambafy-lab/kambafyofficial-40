import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Download, Eye, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

export function PendingTransfersManager() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);

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
            fetchPendingTransfers();
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

      const formattedTransfers: PendingTransfer[] = (orders || []).map(order => ({
        id: order.id,
        order_id: order.order_id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        amount: order.amount,
        currency: order.currency || 'KZ',
        created_at: order.created_at,
        payment_proof_data: order.payment_proof_data,
        product_name: order.product_name,
        user_id: order.user_id
      }));

      setPendingTransfers(formattedTransfers);
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

  const processTransfer = async (transferId: string, action: 'approve' | 'reject') => {
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

      // Só atualizar o status APÓS todas as ações pós-aprovação serem bem-sucedidas
      console.log('🔄 Atualizando status do pedido para:', newStatus);
      
      // Para rejeitar, limpar affiliate_code se estava incorreto
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', transferId);

      if (updateError) {
        console.error('❌ Erro ao atualizar status do pedido:', updateError);
        throw updateError;
      } else {
        console.log('✅ Status do pedido atualizado com sucesso para:', newStatus);
      }

      toast({
        title: action === 'approve' ? "Transferência Aprovada" : "Transferência Rejeitada",
        description: action === 'approve' 
          ? "Pagamento aprovado! Cliente receberá acesso ao produto e email de confirmação."
          : `O pagamento foi rejeitado com sucesso`,
        variant: action === 'approve' ? "default" : "destructive"
      });

      // Atualizar lista
      fetchPendingTransfers();
      
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
          <CardTitle className="flex items-center justify-between">
            Aprovar Pagamentos - Transferências
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
                <div key={transfer.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{transfer.customer_name}</h3>
                        <Badge variant="outline">#{transfer.order_id}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                        <div>
                          <span className="font-medium">Email:</span> {transfer.customer_email}
                        </div>
                        <div>
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

                      <div className="flex items-center gap-2 mb-3">
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

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => processTransfer(transfer.id, 'approve')}
                        disabled={processingId === transfer.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => processTransfer(transfer.id, 'reject')}
                        disabled={processingId === transfer.id}
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

      {/* Dialog para ver comprovativo */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
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
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Nome do arquivo:</label>
                    <p className="text-muted-foreground">{selectedProof.fileName || 'N/A'}</p>
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
    </>
  );
}