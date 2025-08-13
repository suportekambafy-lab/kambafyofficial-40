import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Download, Eye } from 'lucide-react';
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

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_id,
          customer_name,
          customer_email,
          amount,
          currency,
          created_at,
          payment_proof_data,
          user_id,
          status,
          payment_method,
          products (
            name
          )
        `)
        .in('status', ['pending', 'pending_verification'])
        .in('payment_method', ['transfer', 'bank_transfer', 'transferencia'])
        .not('payment_proof_data', 'is', null)
        .order('created_at', { ascending: false });

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
        product_name: (order.products as any)?.name,
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

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: action === 'approve' ? "Transferência Aprovada" : "Transferência Rejeitada",
        description: `O pagamento foi ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso`,
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

  const viewProof = (proofData: any) => {
    setSelectedProof(proofData);
    setShowProofDialog(true);
  };

  const downloadProof = (proofData: any, orderNumber: string) => {
    try {
      if (proofData.file) {
        // Se for um arquivo base64
        const link = document.createElement('a');
        link.href = proofData.file;
        link.download = `comprovativo_${orderNumber}.${proofData.fileType?.split('/')[1] || 'jpg'}`;
        link.click();
      }
    } catch (error) {
      console.error('❌ Erro ao fazer download:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer download do comprovativo",
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
                        
                        {transfer.payment_proof_data?.file && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadProof(transfer.payment_proof_data, transfer.order_id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
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
                {selectedProof.file && (
                  <div className="border rounded p-2">
                    <img 
                      src={selectedProof.file} 
                      alt="Comprovativo de transferência"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                )}
                
                {selectedProof.description && (
                  <div>
                    <label className="text-sm font-medium">Descrição:</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedProof.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Tipo de arquivo:</label>
                    <p className="text-muted-foreground">{selectedProof.fileType || 'N/A'}</p>
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
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}