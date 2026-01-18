import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Check, 
  X, 
  Loader2, 
  Calendar, 
  Percent, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useMyCoproductions, isCoproductionActive, getDaysRemaining, CoproducerWithProduct } from '@/hooks/useCoproducers';
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

export function MyCoproductionsPage() {
  const {
    pendingInvites,
    activeCoproductions,
    inactiveCoproductions,
    isLoading,
    respondToInvite,
    isResponding,
    cancelCoproduction,
    isCanceling
  } = useMyCoproductions();

  const [coproductionToCancel, setCoproductionToCancel] = useState<CoproducerWithProduct | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleRespond = (coproducerId: string, accept: boolean) => {
    setRespondingId(coproducerId);
    respondToInvite({ coproducerId, accept }, {
      onSettled: () => setRespondingId(null)
    });
  };

  const handleCancelCoproduction = () => {
    if (coproductionToCancel) {
      cancelCoproduction(coproductionToCancel.id);
      setCoproductionToCancel(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const CoproductionCard = ({ coproduction, showActions = false }: { coproduction: CoproducerWithProduct; showActions?: boolean }) => {
    const isActive = isCoproductionActive(coproduction);
    const daysRemaining = getDaysRemaining(coproduction.expires_at);
    const isExpired = coproduction.expires_at && new Date(coproduction.expires_at) < new Date();
    const isCanceled = !!coproduction.canceled_at;

    return (
      <Card className={!isActive && coproduction.status === 'accepted' ? 'opacity-60' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Imagem do produto */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
              {coproduction.products?.cover ? (
                <img 
                  src={coproduction.products.cover} 
                  alt={coproduction.products?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium truncate">
                  {coproduction.products?.name || 'Produto'}
                </h3>
                
                {/* Status badges */}
                {coproduction.status === 'pending' && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                )}
                {isCanceled && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                    <XCircle className="w-3 h-3 mr-1" />
                    Cancelado
                  </Badge>
                )}
                {isExpired && !isCanceled && (
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Expirado
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  <span>Comissão: <strong className="text-foreground">{coproduction.commission_rate}%</strong></span>
                </div>
                
                {coproduction.status === 'pending' && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Validade: {coproduction.duration_days} dias</span>
                  </div>
                )}
                
                {coproduction.status === 'accepted' && daysRemaining !== null && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {daysRemaining > 0 
                        ? `${daysRemaining} dias restantes`
                        : 'Expirado'
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Ações para convites pendentes */}
              {coproduction.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleRespond(coproduction.id, true)}
                    disabled={isResponding && respondingId === coproduction.id}
                  >
                    {isResponding && respondingId === coproduction.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Aceitar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespond(coproduction.id, false)}
                    disabled={isResponding && respondingId === coproduction.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Recusar
                  </Button>
                </div>
              )}

              {/* Botão de cancelar para co-produções ativas */}
              {showActions && isActive && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCoproductionToCancel(coproduction)}
                    disabled={isCanceling}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancelar Co-Produção
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: React.ElementType }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <Icon className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Minhas Co-Produções</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos onde você é co-produtor
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingInvites.length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 bg-yellow-500">
                {pendingInvites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            Ativas
            {activeCoproductions.length > 0 && (
              <Badge variant="outline" className="ml-2 h-5 px-1.5">
                {activeCoproductions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Encerradas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingInvites.length === 0 ? (
            <EmptyState message="Nenhum convite pendente" icon={Clock} />
          ) : (
            pendingInvites.map(coproduction => (
              <CoproductionCard key={coproduction.id} coproduction={coproduction} />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeCoproductions.length === 0 ? (
            <EmptyState message="Nenhuma co-produção ativa" icon={Users} />
          ) : (
            <>
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Você pode cancelar uma co-produção a qualquer momento. O dono do produto não pode cancelar sem o seu consentimento.
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {activeCoproductions.map(coproduction => (
                <CoproductionCard 
                  key={coproduction.id} 
                  coproduction={coproduction} 
                  showActions 
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="mt-4 space-y-3">
          {inactiveCoproductions.length === 0 ? (
            <EmptyState message="Nenhuma co-produção encerrada" icon={XCircle} />
          ) : (
            inactiveCoproductions.map(coproduction => (
              <CoproductionCard key={coproduction.id} coproduction={coproduction} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de cancelamento */}
      <AlertDialog open={!!coproductionToCancel} onOpenChange={() => setCoproductionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Co-Produção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar sua co-produção em <strong>{coproductionToCancel?.products?.name}</strong>?
              <br /><br />
              Você deixará de receber comissões das vendas deste produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelCoproduction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Cancelar Co-Produção'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
