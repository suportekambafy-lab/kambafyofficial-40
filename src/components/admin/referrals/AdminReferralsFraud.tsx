import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Shield, ShieldCheck, ShieldX, Eye, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FraudReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  is_valid: boolean;
  ip_match_detected: boolean;
  fraud_flags: string[];
  fraud_check: {
    referrer_ip?: string;
    referred_ip?: string;
    ip_match?: boolean;
    email_domain_match?: boolean;
    flags?: string[];
    checked_at?: string;
  };
  validation_notes: string | null;
  created_at: string;
  referrer_profile?: {
    full_name: string | null;
    email: string | null;
    registration_ip: string | null;
  };
  referred_profile?: {
    full_name: string | null;
    email: string | null;
    registration_ip: string | null;
  };
}

export function AdminReferralsFraud() {
  const queryClient = useQueryClient();
  const [selectedReferral, setSelectedReferral] = useState<FraudReferral | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filter, setFilter] = useState<'fraud_review' | 'all_flagged' | 'cleared'>('fraud_review');

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['admin-fraud-referrals', filter],
    queryFn: async () => {
      let query = supabase
        .from('seller_referrals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filter === 'fraud_review') {
        query = query.eq('status', 'fraud_review');
      } else if (filter === 'all_flagged') {
        query = query.eq('ip_match_detected', true);
      } else if (filter === 'cleared') {
        query = query.eq('is_valid', true).neq('fraud_flags', '[]');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar perfis separadamente
      const referrerIds = [...new Set(data.map(r => r.referrer_id))];
      const referredIds = [...new Set(data.map(r => r.referred_id))];
      const allIds = [...new Set([...referrerIds, ...referredIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, registration_ip')
        .in('id', allIds);

      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, typeof profiles[0]>);

      return data.map(referral => ({
        ...referral,
        fraud_flags: (referral.fraud_flags as string[]) || [],
        fraud_check: (referral.fraud_check as FraudReferral['fraud_check']) || {},
        referrer_profile: profilesMap[referral.referrer_id] || null,
        referred_profile: profilesMap[referral.referred_id] || null,
      })) as FraudReferral[];
    },
  });

  const clearReferral = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase
        .from('seller_referrals')
        .update({
          is_valid: true,
          status: 'pending',
          validation_notes: 'Liberado manualmente pelo admin após revisão',
        })
        .eq('id', referralId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Indicação liberada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-referrals'] });
      setShowDetailsDialog(false);
    },
    onError: (error) => {
      console.error('Error clearing referral:', error);
      toast.error('Erro ao liberar indicação');
    },
  });

  const rejectReferral = useMutation({
    mutationFn: async (referralId: string) => {
      const { error } = await supabase
        .from('seller_referrals')
        .update({
          is_valid: false,
          status: 'cancelled',
          validation_notes: 'Rejeitado pelo admin - Fraude confirmada',
        })
        .eq('id', referralId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Indicação rejeitada por fraude');
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-referrals'] });
      setShowDetailsDialog(false);
    },
    onError: (error) => {
      console.error('Error rejecting referral:', error);
      toast.error('Erro ao rejeitar indicação');
    },
  });

  const getFraudBadges = (referral: FraudReferral) => {
    const flags = referral.fraud_flags || [];
    return flags.map((flag, i) => {
      let label = flag;
      let className = 'bg-red-500/10 text-red-600';
      
      switch (flag) {
        case 'same_registration_ip':
          label = 'Mesmo IP';
          break;
        case 'multiple_referrals_same_ip':
          label = 'Múltiplas indicações mesmo IP';
          break;
        case 'same_email_domain':
          label = 'Mesmo domínio email';
          className = 'bg-amber-500/10 text-amber-600';
          break;
        case 'ip_match_on_update':
          label = 'IP correspondeu após registro';
          break;
      }
      
      return (
        <Badge key={i} variant="outline" className={className}>
          {label}
        </Badge>
      );
    });
  };

  const getStatusBadge = (referral: FraudReferral) => {
    if (referral.status === 'fraud_review') {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Em Revisão
        </Badge>
      );
    }
    if (referral.status === 'cancelled' && !referral.is_valid) {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
          <ShieldX className="h-3 w-3 mr-1" />
          Fraude Confirmada
        </Badge>
      );
    }
    if (referral.is_valid && referral.ip_match_detected) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Liberado
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Detecção de Fraude
              </CardTitle>
              <CardDescription>
                Indicações sinalizadas pelo sistema anti-fraude para revisão manual
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'fraud_review' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('fraud_review')}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Pendentes
              </Button>
              <Button
                variant={filter === 'all_flagged' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all_flagged')}
              >
                Todas Sinalizadas
              </Button>
              <Button
                variant={filter === 'cleared' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cleared')}
              >
                Liberadas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {referrals?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <p>Nenhuma indicação suspeita encontrada</p>
              <p className="text-sm mt-1">O sistema está monitorando automaticamente</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Indicado</TableHead>
                  <TableHead>IPs</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals?.map((referral) => (
                  <TableRow key={referral.id} className={!referral.is_valid ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {referral.referrer_profile?.full_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {referral.referrer_profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {referral.referred_profile?.full_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {referral.referred_profile?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs font-mono">
                        <p>
                          <span className="text-muted-foreground">Ind:</span>{' '}
                          {referral.fraud_check?.referrer_ip || '-'}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Ref:</span>{' '}
                          {referral.fraud_check?.referred_ip || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getFraudBadges(referral)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(referral)}</TableCell>
                    <TableCell>
                      {format(new Date(referral.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedReferral(referral);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {referral.status === 'fraud_review' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => clearReferral.mutate(referral.id)}
                              disabled={clearReferral.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectReferral.mutate(referral.id)}
                              disabled={rejectReferral.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Análise de Fraude
            </DialogTitle>
            <DialogDescription>
              Detalhes completos da indicação suspeita
            </DialogDescription>
          </DialogHeader>
          
          {selectedReferral && (
            <div className="space-y-6">
              {/* Comparação lado a lado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground">INDICADOR</h4>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedReferral.referrer_profile?.full_name}</p>
                    <p className="text-sm">{selectedReferral.referrer_profile?.email}</p>
                    <p className="text-xs font-mono bg-background p-2 rounded">
                      IP: {selectedReferral.fraud_check?.referrer_ip || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-3 text-sm text-muted-foreground">INDICADO</h4>
                  <div className="space-y-2">
                    <p className="font-medium">{selectedReferral.referred_profile?.full_name}</p>
                    <p className="text-sm">{selectedReferral.referred_profile?.email}</p>
                    <p className="text-xs font-mono bg-background p-2 rounded">
                      IP: {selectedReferral.fraud_check?.referred_ip || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alertas */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas Detectados
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getFraudBadges(selectedReferral)}
                </div>
              </div>

              {/* Detalhes técnicos */}
              <div>
                <h4 className="font-semibold mb-2">Detalhes da Verificação</h4>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedReferral.fraud_check, null, 2)}
                </pre>
              </div>

              {selectedReferral.validation_notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Nota:</strong> {selectedReferral.validation_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedReferral?.status === 'fraud_review' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedReferral && rejectReferral.mutate(selectedReferral.id)}
                  disabled={rejectReferral.isPending}
                >
                  {rejectReferral.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldX className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Fraude
                </Button>
                <Button
                  onClick={() => selectedReferral && clearReferral.mutate(selectedReferral.id)}
                  disabled={clearReferral.isPending}
                >
                  {clearReferral.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Liberar Indicação
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
