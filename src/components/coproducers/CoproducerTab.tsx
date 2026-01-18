import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Loader2, Info, ExternalLink } from 'lucide-react';
import { useCoproducers, Coproducer, isCoproductionActive, getDaysRemaining } from '@/hooks/useCoproducers';
import { CoproducerInviteModal } from './CoproducerInviteModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CoproducerTabProps {
  productId: string;
}

export function CoproducerTab({ productId }: CoproducerTabProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [coproducerToCancel, setCoproducerToCancel] = useState<Coproducer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const {
    coproducers,
    isLoading,
    availableCommission,
    inviteCoproducer,
    isInviting,
    cancelInvite,
    isCanceling
  } = useCoproducers(productId);

  const filteredCoproducers = useMemo(() => {
    return coproducers.filter(c => {
      // Filtro de busca
      const matchesSearch = 
        c.coproducer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.coproducer_email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de status
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired') {
          matchesStatus = c.status === 'accepted' && c.expires_at && new Date(c.expires_at) < new Date();
        } else if (statusFilter === 'canceled') {
          matchesStatus = !!c.canceled_at;
        } else {
          matchesStatus = c.status === statusFilter && !c.canceled_at;
        }
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [coproducers, searchTerm, statusFilter]);

  const getStatusBadge = (coproducer: Coproducer) => {
    if (coproducer.canceled_at) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Cancelado</Badge>;
    }
    
    if (coproducer.status === 'accepted' && coproducer.expires_at && new Date(coproducer.expires_at) < new Date()) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Expirado</Badge>;
    }

    switch (coproducer.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Ativo</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const getValidity = (coproducer: Coproducer) => {
    if (coproducer.status === 'pending') {
      return `${coproducer.duration_days} dias`;
    }
    if (coproducer.expires_at) {
      const daysRemaining = getDaysRemaining(coproducer.expires_at);
      if (daysRemaining !== null && daysRemaining > 0) {
        return `${daysRemaining} dias restantes`;
      }
      return 'Expirado';
    }
    return '-';
  };

  const handleCancelInvite = () => {
    if (coproducerToCancel) {
      cancelInvite(coproducerToCancel.id);
      setCoproducerToCancel(null);
    }
  };

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
      {/* Barra de filtros e botão */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar...."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="accepted">Ativo</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline"
          onClick={() => setShowInviteModal(true)}
          disabled={availableCommission <= 0}
        >
          Convidar co-produtor
        </Button>
      </div>

      {/* Tabela de co-produtores */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-medium">DATA</TableHead>
              <TableHead className="font-medium">NOME</TableHead>
              <TableHead className="font-medium">COMISSÃO</TableHead>
              <TableHead className="font-medium">VALIDADE</TableHead>
              <TableHead className="font-medium">STATUS</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCoproducers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p>Nenhum co-produtor encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCoproducers.map((coproducer) => (
                <TableRow key={coproducer.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(coproducer.created_at || coproducer.invited_at || new Date()), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{coproducer.coproducer_name || '-'}</p>
                      <p className="text-sm text-muted-foreground">{coproducer.coproducer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{coproducer.commission_rate}%</TableCell>
                  <TableCell className="text-muted-foreground">{getValidity(coproducer)}</TableCell>
                  <TableCell>{getStatusBadge(coproducer)}</TableCell>
                  <TableCell>
                    {canCancel(coproducer) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setCoproducerToCancel(coproducer)}
                        disabled={isCanceling}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Link de ajuda */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 text-primary" />
        <span>Aprenda mais sobre a</span>
        <a href="#" className="text-primary hover:underline inline-flex items-center gap-1">
          co-produção
          <ExternalLink className="w-3 h-3" />
        </a>
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
