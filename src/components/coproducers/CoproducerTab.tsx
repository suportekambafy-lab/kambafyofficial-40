import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Mail, Percent, Clock, CheckCircle, XCircle, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { useCoproducers, Coproducer, isCoproductionActive, getDaysRemaining } from '@/hooks/useCoproducers';
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
  const [coproducerToCancel, setCoproducerToCancel] = useState<Coproducer | null>(null);
  
  const {
    coproducers,
    isLoading,
    totalCommission,
    availableCommission,
    inviteCoproducer,
    isInviting,
    cancelInvite,
    isCanceling
  } = useCoproducers(productId);

  const getStatusBadge = (coproducer: Coproducer) => {
    // Verificar se está expirado
    if (coproducer.status === 'accepted' && coproducer.expires_at && new Date(coproducer.expires_at) < new Date()) {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    
    // Verificar se está cancelado
    if (coproducer.canceled_at) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelado
        </Badge>
      );
    }

    switch (coproducer.status) {
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
            Ativo
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

  const handleCancelInvite = () => {
    if (coproducerToCancel) {
      cancelInvite(coproducerToCancel.id);
      setCoproducerToCancel(null);
    }
  };

  // Só pode cancelar convites pendentes
  const canCancel = (coproducer: Coproducer) => coproducer.status === 'pending';

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

      {/* Aviso sobre regras */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-blue-700 dark:text-blue-400">Regras de Co-Produção:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Você pode cancelar convites <strong>pendentes</strong></li>
                <li>• Após aceite, apenas o co-produtor pode cancelar</li>
                <li>• Contratos têm validade (padrão 30 dias)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
          coproducers.map((coproducer) => {
            const isActive = isCoproductionActive(coproducer);
            const daysRemaining = getDaysRemaining(coproducer.expires_at);
            
            return (
              <Card key={coproducer.id} className={`overflow-hidden ${!isActive && coproducer.status === 'accepted' ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium truncate">
                          {coproducer.coproducer_name || 'Sem nome'}
                        </span>
                        {getStatusBadge(coproducer)}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{coproducer.coproducer_email}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Percent className="w-3.5 h-3.5" />
                          <span>Comissão: <strong className="text-foreground">{coproducer.commission_rate}%</strong></span>
                        </div>
                        
                        {coproducer.status === 'accepted' && daysRemaining !== null && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {daysRemaining > 0 
                                ? `${daysRemaining} dias restantes`
                                : 'Expirado'
                              }
                            </span>
                          </div>
                        )}
                        
                        {coproducer.status === 'pending' && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Validade: {coproducer.duration_days} dias</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {canCancel(coproducer) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setCoproducerToCancel(coproducer)}
                        disabled={isCanceling}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de convite */}
      <CoproducerInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onInvite={(email, rate, name, durationDays) => {
          inviteCoproducer({ email, commissionRate: rate, name, durationDays });
          setShowInviteModal(false);
        }}
        isLoading={isInviting}
        availableCommission={availableCommission}
      />

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={!!coproducerToCancel} onOpenChange={() => setCoproducerToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o convite para <strong>{coproducerToCancel?.coproducer_name || coproducerToCancel?.coproducer_email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Cancelar Convite'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
