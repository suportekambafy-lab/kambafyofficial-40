import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Download, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface DuplicatesManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  transfers: PendingTransfer[];
  onApprove: (transferId: string) => Promise<void>;
  onReject: (transferId: string) => Promise<void>;
  onBulkReject: (transferIds: string[]) => Promise<void>;
  onApproveOneRejectOthers: (approveId: string, rejectIds: string[]) => Promise<void>;
  onViewProof: (proof: any) => void;
  onDownloadProof: (proof: any) => void;
  formatAmount: (amount: string, currency: string) => string;
}

export function DuplicatesManagementDialog({
  open,
  onOpenChange,
  email,
  transfers,
  onApprove,
  onReject,
  onBulkReject,
  onApproveOneRejectOthers,
  onViewProof,
  onDownloadProof,
  formatAmount
}: DuplicatesManagementDialogProps) {
  const [selectedForApproval, setSelectedForApproval] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ type: 'reject_all' | 'approve_one'; data?: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleBulkRejectConfirm = async () => {
    setProcessing(true);
    try {
      await onBulkReject(transfers.map(t => t.id));
      setBulkAction(null);
      onOpenChange(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveOneRejectOthersConfirm = async () => {
    if (!selectedForApproval) return;
    
    setProcessing(true);
    try {
      const rejectIds = transfers.filter(t => t.id !== selectedForApproval).map(t => t.id);
      await onApproveOneRejectOthers(selectedForApproval, rejectIds);
      setBulkAction(null);
      setSelectedForApproval(null);
      onOpenChange(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleIndividualApprove = async (transferId: string) => {
    setProcessing(true);
    try {
      await onApprove(transferId);
      // Se sobrar apenas 1 pedido, fechar o modal
      if (transfers.length <= 2) {
        onOpenChange(false);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleIndividualReject = async (transferId: string) => {
    setProcessing(true);
    try {
      await onReject(transferId);
      // Se sobrar apenas 1 pedido, fechar o modal
      if (transfers.length <= 2) {
        onOpenChange(false);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Ordenar por data (mais antigo primeiro)
  const sortedTransfers = [...transfers].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔍 Pedidos Duplicados
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{email}</span> - {transfers.length} pedidos pendentes encontrados
              <br />
              <span className="text-xs text-muted-foreground">💡 Sugerimos aprovar o pedido mais antigo</span>
            </DialogDescription>
          </DialogHeader>
          
          {/* Grid com os pedidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto p-1">
            {sortedTransfers.map((transfer, idx) => (
              <Card 
                key={transfer.id} 
                className={`relative transition-all ${
                  selectedForApproval === transfer.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : ''
                }`}
              >
                <Badge 
                  className="absolute top-2 right-2 z-10"
                  variant={idx === 0 ? "default" : "secondary"}
                >
                  {idx === 0 ? '🕐 Mais Antigo' : `${idx + 1} de ${transfers.length}`}
                </Badge>
                
                <CardContent className="p-4 pt-10 space-y-3">
                  {/* Thumbnail do comprovativo */}
                  {transfer.payment_proof_data?.url && (
                    <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                      <img 
                        src={transfer.payment_proof_data.url} 
                        alt="Comprovativo" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onViewProof(transfer.payment_proof_data)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDownloadProof(transfer.payment_proof_data)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Informações do pedido */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Pedido #{transfer.order_id}</span>
                    </div>
                    
                    <div className="text-lg font-bold text-primary">
                      {formatAmount(transfer.amount, transfer.currency)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {transfer.product_name}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transfer.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </div>
                    
                    {transfer.payment_proof_data?.bank && (
                      <Badge variant="outline" className="text-xs">
                        {transfer.payment_proof_data.bank}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Checkbox para seleção */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="radio"
                      name="selected-transfer"
                      checked={selectedForApproval === transfer.id}
                      onChange={() => setSelectedForApproval(transfer.id)}
                      className="w-4 h-4"
                    />
                    <label className="text-xs text-muted-foreground">
                      Selecionar para aprovar
                    </label>
                  </div>
                  
                  {/* Botões individuais */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => handleIndividualApprove(transfer.id)}
                      disabled={processing}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleIndividualReject(transfer.id)}
                      disabled={processing}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Ações em lote */}
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="destructive" 
              onClick={() => setBulkAction({ type: 'reject_all' })}
              disabled={processing || transfers.length === 0}
            >
              🗑️ Rejeitar Todos ({transfers.length})
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                if (!selectedForApproval) {
                  // Selecionar automaticamente o mais antigo
                  setSelectedForApproval(sortedTransfers[0].id);
                }
                setBulkAction({ type: 'approve_one', data: selectedForApproval || sortedTransfers[0].id });
              }}
              disabled={processing || transfers.length === 0}
            >
              ✅ Aprovar {selectedForApproval ? 'Selecionado' : '1º'} e Rejeitar Outros
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar ações em lote */}
      <AlertDialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction?.type === 'reject_all' 
                ? '🗑️ Rejeitar Todos os Pedidos?' 
                : '✅ Aprovar e Rejeitar Pedidos?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction?.type === 'reject_all' 
                ? `Tem certeza que deseja rejeitar todos os ${transfers.length} pedidos de ${email}? Esta ação não pode ser desfeita.`
                : `Aprovar o pedido selecionado e rejeitar os outros ${transfers.length - 1} pedido(s) de ${email}? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkAction?.type === 'reject_all' 
                ? handleBulkRejectConfirm 
                : handleApproveOneRejectOthersConfirm}
              disabled={processing}
            >
              {processing ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
