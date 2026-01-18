import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Mail, Percent, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useCoproducers, Coproducer } from '@/hooks/useCoproducers';
import { CoproducerInviteModal } from './CoproducerInviteModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CoproducerTabProps {
  productId: string;
}

export function CoproducerTab({ productId }: CoproducerTabProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [coproducerToRemove, setCoproducerToRemove] = useState<Coproducer | null>(null);
  
  const {
    coproducers,
    isLoading,
    totalCommission,
    availableCommission,
    inviteCoproducer,
    isInviting,
    removeCoproducer,
    isRemoving
  } = useCoproducers(productId);

  const getStatusBadge = (status: Coproducer['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aceito
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleRemove = () => {
    if (coproducerToRemove) {
      removeCoproducer(coproducerToRemove.id);
      setCoproducerToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com descrição */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Co-Produção</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Convide pessoas para co-produzir este produto. Os co-produtores receberão automaticamente 
          a percentagem definida em cada venda realizada.
        </p>
      </div>

      {/* Botão de convidar */}
      <Button 
        onClick={() => setShowInviteModal(true)}
        className="w-full"
        disabled={availableCommission <= 0}
      >
        <Plus className="w-4 h-4 mr-2" />
        Convidar Co-Produtor
      </Button>

      {/* Resumo de comissões */}
      {coproducers.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de comissões:</span>
              <span className="font-medium">{totalCommission}%</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Sua parte:</span>
              <span className="font-medium text-primary">{100 - totalCommission}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de co-produtores */}
      <div className="space-y-3">
        {coproducers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nenhum co-produtor ainda.
              </p>
              <p className="text-sm text-muted-foreground/70">
                Convide alguém para dividir os lucros das vendas.
              </p>
            </CardContent>
          </Card>
        ) : (
          coproducers.map((coproducer) => (
            <Card key={coproducer.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {coproducer.coproducer_name || 'Sem nome'}
                      </span>
                      {getStatusBadge(coproducer.status)}
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{coproducer.coproducer_email}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Comissão: <strong className="text-foreground">{coproducer.commission_rate}%</strong></span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setCoproducerToRemove(coproducer)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de convite */}
      <CoproducerInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInvite={(email, rate, name) => {
          inviteCoproducer({ email, commissionRate: rate, name });
          setShowInviteModal(false);
        }}
        isLoading={isInviting}
        availableCommission={availableCommission}
      />

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!coproducerToRemove} onOpenChange={() => setCoproducerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Co-Produtor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{coproducerToRemove?.coproducer_name || coproducerToRemove?.coproducer_email}</strong> como co-produtor?
              <br /><br />
              Esta ação não pode ser desfeita. O co-produtor deixará de receber comissões das próximas vendas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
