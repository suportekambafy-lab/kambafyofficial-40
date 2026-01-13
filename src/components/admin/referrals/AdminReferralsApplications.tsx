import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Eye, Instagram, Youtube, Facebook, Link2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Application {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  other_social_url: string | null;
  audience_size: string | null;
  motivation: string | null;
  preferred_reward_option: string | null;
  status: string;
  rejection_reason: string | null;
  referral_code: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminReferralsApplications() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['admin-referral-applications', filter],
    queryFn: async () => {
      // Usar RPC para bypass do RLS (admins não usam auth do Supabase)
      const { data, error } = await supabase
        .rpc('get_referral_applications_for_admin', {
          status_filter: filter === 'all' ? null : filter
        });
      
      if (error) throw error;
      return data as Application[];
    },
  });

  const approveApplication = useMutation({
    mutationFn: async (app: Application) => {
      // Gerar código único
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_referral_code');
      
      if (codeError) throw codeError;

      const { error } = await supabase
        .from('referral_program_applications')
        .update({
          status: 'approved',
          referral_code: codeData,
          approved_at: new Date().toISOString(),
          approved_by: 'Admin',
        })
        .eq('id', app.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Candidatura aprovada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-referral-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-stats'] });
      setShowDetailsDialog(false);
    },
    onError: (error) => {
      console.error('Error approving:', error);
      toast.error('Erro ao aprovar candidatura');
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async ({ app, reason }: { app: Application; reason: string }) => {
      const { error } = await supabase
        .from('referral_program_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', app.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Candidatura rejeitada');
      queryClient.invalidateQueries({ queryKey: ['admin-referral-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-referrals-stats'] });
      setShowRejectDialog(false);
      setShowDetailsDialog(false);
      setRejectionReason('');
    },
    onError: (error) => {
      console.error('Error rejecting:', error);
      toast.error('Erro ao rejeitar candidatura');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSocialLinks = (app: Application) => {
    const links = [];
    if (app.instagram_url) links.push({ icon: Instagram, url: app.instagram_url, name: 'Instagram' });
    if (app.youtube_url) links.push({ icon: Youtube, url: app.youtube_url, name: 'YouTube' });
    if (app.facebook_url) links.push({ icon: Facebook, url: app.facebook_url, name: 'Facebook' });
    if (app.tiktok_url) links.push({ icon: Link2, url: app.tiktok_url, name: 'TikTok' });
    if (app.other_social_url) links.push({ icon: Link2, url: app.other_social_url, name: 'Outro' });
    return links;
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
              <CardTitle>Solicitações de Candidatura</CardTitle>
              <CardDescription>
                Aprovar ou rejeitar candidaturas ao programa de indicações
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' && 'Todos'}
                  {f === 'pending' && 'Pendentes'}
                  {f === 'approved' && 'Aprovados'}
                  {f === 'rejected' && 'Rejeitados'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {applications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma candidatura encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Audiência</TableHead>
                  <TableHead>Redes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications?.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.user_name}</TableCell>
                    <TableCell>{app.user_email}</TableCell>
                    <TableCell>{app.audience_size || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {getSocialLinks(app).slice(0, 3).map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-muted rounded"
                          >
                            <link.icon className="h-4 w-4" />
                          </a>
                        ))}
                        {getSocialLinks(app).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{getSocialLinks(app).length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      {format(new Date(app.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {app.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => approveApplication.mutate(app)}
                              disabled={approveApplication.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedApp(app);
                                setShowRejectDialog(true);
                              }}
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
            <DialogTitle>Detalhes da Candidatura</DialogTitle>
            <DialogDescription>
              Informações completas sobre a candidatura de {selectedApp?.user_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedApp.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedApp.user_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Audiência</p>
                  <p className="font-medium">{selectedApp.audience_size || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Redes Sociais</p>
                <div className="flex flex-wrap gap-2">
                  {getSocialLinks(selectedApp).map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-muted rounded-md hover:bg-muted/80"
                    >
                      <link.icon className="h-3 w-3" />
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Motivação</p>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {selectedApp.motivation || 'Não informado'}
                </p>
              </div>

              {selectedApp.referral_code && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Código de Indicação</p>
                  <p className="font-mono font-bold text-lg">{selectedApp.referral_code}</p>
                </div>
              )}

              {selectedApp.rejection_reason && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Motivo da Rejeição</p>
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {selectedApp.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedApp?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(true);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  onClick={() => selectedApp && approveApplication.mutate(selectedApp)}
                  disabled={approveApplication.isPending}
                >
                  {approveApplication.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Aprovar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Candidatura</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para {selectedApp?.user_name}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedApp) {
                  rejectApplication.mutate({ app: selectedApp, reason: rejectionReason });
                }
              }}
              disabled={rejectApplication.isPending || !rejectionReason.trim()}
            >
              {rejectApplication.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
