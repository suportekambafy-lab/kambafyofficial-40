import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomToast } from '@/hooks/useCustomToast';
import { format } from 'date-fns';
import { SEO } from '@/components/SEO';
import { BanUserDialog } from '@/components/BanUserDialog';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  FileText, 
  User,
  Calendar,
  Hash,
  ExternalLink,
  UserX,
  CheckCheck,
  Loader2,
  Globe
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface IdentityVerification {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  document_type: string;
  document_number: string;
  document_front_url?: string;
  document_back_url?: string;
  country?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  'AO': 'Angola',
  'MZ': 'Moçambique',
  'PT': 'Portugal',
  'BR': 'Brasil',
  'CV': 'Cabo Verde',
  'GW': 'Guiné-Bissau',
  'ST': 'São Tomé e Príncipe',
  'TL': 'Timor-Leste'
};

export default function AdminIdentityVerification() {
  const { admin } = useAdminAuth();
  const { toast } = useCustomToast();
  const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedVerification, setSelectedVerification] = useState<IdentityVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentModal, setDocumentModal] = useState<{isOpen: boolean, imageUrl: string, title: string, verification?: IdentityVerification}>({
    isOpen: false,
    imageUrl: '',
    title: '',
    verification: undefined
  });
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserForBan, setSelectedUserForBan] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isBanning, setIsBanning] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const loadVerifications = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Buscando verificações KYC para admin...');
      
      // Usar função RPC que tem SECURITY DEFINER para contornar RLS
      const { data: verifications, error: verificationsError } = await supabase
        .rpc('get_all_identity_verifications_for_admin');

      console.log('📊 Verificações recebidas:', verifications);

      if (verificationsError) {
        console.error('❌ Erro ao buscar verificações:', verificationsError);
        throw verificationsError;
      }

      // Filter by status if needed
      let filteredVerifications = verifications || [];
      if (statusFilter !== 'todos') {
        filteredVerifications = filteredVerifications.filter(v => v.status === statusFilter);
      }

      console.log('✅ Total de verificações após filtro:', filteredVerifications.length);

      // Get user profiles for each verification
      const userIds = filteredVerifications.map(v => v.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('❌ Erro ao buscar perfis:', profilesError);
          throw profilesError;
        }

        // Combine data
        const verificationsWithProfiles = filteredVerifications.map(verification => ({
          ...verification,
          profiles: profiles?.find(p => p.user_id === verification.user_id)
        }));

        setVerifications(verificationsWithProfiles as IdentityVerification[]);
      } else {
        setVerifications([]);
      }
    } catch (error) {
      console.error('Erro ao carregar verificações:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao carregar verificações de identidade',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      loadVerifications();
    }
  }, [admin, statusFilter]);

  const updateVerificationStatus = async (id: string, newStatus: 'aprovado' | 'rejeitado', reason?: string) => {
    try {
      setProcessingId(id);

      console.log('🔄 Atualizando status da verificação:', { id, newStatus, reason });

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'rejeitado' && reason) {
        updateData.rejection_reason = reason;
      } else if (newStatus === 'aprovado') {
        updateData.rejection_reason = null;
        updateData.verified_at = new Date().toISOString();
        updateData.verified_by = admin?.id;
      }

      // Usar função admin para atualizar verificação
      const { error } = await supabase.rpc('admin_update_identity_verification', {
        p_verification_id: id,
        p_status: newStatus,
        p_rejection_reason: reason || null,
        p_admin_id: admin?.id || null,
        p_admin_email: admin?.email || null
      });

      if (error) {
        console.error('❌ Erro ao atualizar verificação:', error);
        throw error;
      }

      console.log('✅ Verificação atualizada com sucesso');

      // Registrar log administrativo (não bloqueante)
      if (admin?.id) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: admin.id,
            action: newStatus === 'aprovado' ? 'kyc_approve' : 'kyc_reject',
            target_type: 'identity_verification',
            target_id: id,
            details: { reason: reason || null }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log de KYC:', logErr);
        }
      }

      toast({
        title: 'Sucesso',
        message: `Verificação ${newStatus === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso`,
        variant: 'success'
      });
      setRejectionReason('');
      setSelectedVerification(null);
      await loadVerifications();
    } catch (error) {
      console.error('Erro ao atualizar verificação:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao atualizar status da verificação',
        variant: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const approveAllPending = async () => {
    const pendingVerifications = verifications.filter(v => v.status === 'pendente');
    
    if (pendingVerifications.length === 0) {
      toast({
        title: 'Aviso',
        message: 'Não há verificações pendentes para aprovar',
        variant: 'warning'
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja aprovar ${pendingVerifications.length} verificação(ões) pendente(s)?`)) {
      return;
    }

    try {
      setIsApprovingAll(true);
      let successCount = 0;
      let errorCount = 0;

      for (const verification of pendingVerifications) {
        try {
          const { error } = await supabase.rpc('admin_update_identity_verification', {
            p_verification_id: verification.id,
            p_status: 'aprovado',
            p_rejection_reason: null,
            p_admin_id: admin?.id || null,
            p_admin_email: admin?.email || null
          });

          if (error) {
            console.error('Erro ao aprovar verificação:', verification.id, error);
            errorCount++;
          } else {
            successCount++;
            
            // Registrar log administrativo
            if (admin?.id) {
              try {
                await supabase.from('admin_logs').insert({
                  admin_id: admin.id,
                  action: 'kyc_approve_bulk',
                  target_type: 'identity_verification',
                  target_id: verification.id,
                  details: { bulk_action: true }
                });
              } catch (logErr) {
                console.warn('Falha ao registrar log:', logErr);
              }
            }
          }
        } catch (err) {
          errorCount++;
        }
      }

      toast({
        title: 'Concluído',
        message: `${successCount} aprovada(s)${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}`,
        variant: errorCount > 0 ? 'warning' : 'success'
      });

      await loadVerifications();
    } catch (error) {
      console.error('Erro ao aprovar verificações em massa:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao processar aprovações em massa',
        variant: 'error'
      });
    } finally {
      setIsApprovingAll(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const handleBanUser = async (reason: string) => {
    if (!selectedUserForBan) return;

    try {
      setIsBanning(true);
      console.log('🚫 Banindo usuário:', selectedUserForBan);

      // Atualizar perfil para marcar como banido
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ banned: true })
        .eq('user_id', selectedUserForBan.id);

      if (profileError) {
        console.error('❌ Erro ao banir usuário:', profileError);
        throw profileError;
      }

      // Enviar email de notificação de banimento
      const { error: emailError } = await supabase.functions.invoke('send-user-ban-notification', {
        body: {
          userEmail: selectedUserForBan.email,
          userName: selectedUserForBan.name,
          banReason: reason
        }
      });

      if (emailError) {
        console.warn('⚠️ Erro ao enviar email de banimento:', emailError);
      }

      // Registrar log administrativo
      if (admin?.id) {
        try {
          await supabase.from('admin_logs').insert({
            admin_id: admin.id,
            action: 'ban_user',
            target_type: 'user',
            target_id: selectedUserForBan.id,
            details: { reason, email: selectedUserForBan.email }
          });
        } catch (logErr) {
          console.warn('⚠️ Falha ao registrar log:', logErr);
        }
      }

      toast({
        title: 'Usuário banido',
        message: 'Usuário banido com sucesso',
        variant: 'success'
      });
      setBanDialogOpen(false);
      setSelectedUserForBan(null);
      await loadVerifications();
    } catch (error) {
      console.error('Erro ao banir usuário:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao banir usuário',
        variant: 'error'
      });
    } finally {
      setIsBanning(false);
    }
  };

  const openDocument = async (url: string, title: string, verification: IdentityVerification) => {
    try {
      console.log('🔍 Tentando abrir documento:', { url, title });
      
      // Verificar se é URL do Bunny CDN (público e direto)
      if (url.includes('b-cdn.net') || url.includes('bunnycdn.net')) {
        console.log('✅ Documento do Bunny CDN - abrindo diretamente');
        setDocumentModal({
          isOpen: true,
          imageUrl: url,
          title: title,
          verification: verification
        });
        return;
      }
      
      // Para documentos antigos no Supabase Storage (bucket privado), gerar URL assinada
      if (url.includes('supabase.co') && url.includes('identity-documents')) {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        const bucketIndex = pathParts.indexOf('identity-documents');
        if (bucketIndex === -1) {
          console.error('❌ Bucket não encontrado no URL');
          toast({
            title: 'Erro',
            message: 'URL de documento inválido',
            variant: 'error'
          });
          return;
        }
        
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        console.log('📂 Gerando signed URL para documento antigo do Supabase:', filePath);
        
        const { data, error } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          console.error('❌ Erro ao criar URL assinada:', error);
          toast({
            title: 'Erro',
            message: 'Documento não encontrado no servidor. Pode ter sido movido ou deletado.',
            variant: 'error'
          });
          return;
        }
        
        if (!data?.signedUrl) {
          console.error('❌ URL assinada vazia');
          toast({
            title: 'Erro',
            message: 'Erro ao gerar link do documento',
            variant: 'error'
          });
          return;
        }
        
        console.log('✅ URL assinada gerada para documento antigo');
        setDocumentModal({
          isOpen: true,
          imageUrl: data.signedUrl,
          title: title,
          verification: verification
        });
      } else {
        console.log('✅ Usando URL pública diretamente');
        setDocumentModal({
          isOpen: true,
          imageUrl: url,
          title: title,
          verification: verification
        });
      }
    } catch (error) {
      console.error('❌ Erro ao abrir documento:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao acessar documento',
        variant: 'error'
      });
    }
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <AdminLayout title="Verificação de Identidade" description="Carregando dados...">
        <AdminPageSkeleton variant="table" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Verificação de Identidade" description="Gerencie verificações KYC dos vendedores">
      <SEO title="Kambafy Admin – KYC" description="Aprovar ou reprovar verificações de identidade" canonical="https://kambafy.com/admin/identity" noIndex />
        {/* Filters - Responsivo */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
            <Label htmlFor="status-filter" className="text-xs sm:text-sm">Filtrar por Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {verifications.filter(v => v.status === 'pendente').length > 0 && (
            <Button
              onClick={approveAllPending}
              disabled={isApprovingAll}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApprovingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Aprovar Todos ({verifications.filter(v => v.status === 'pendente').length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Verifications List - Responsivo */}
        <div className="space-y-4">
          {verifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma verificação encontrada
                </h3>
                <p className="text-gray-600">
                  {statusFilter === 'todos' 
                    ? 'Ainda não há solicitações de verificação de identidade.' 
                    : `Não há verificações com status "${statusFilter}".`}
                </p>
              </CardContent>
            </Card>
          ) : (
            verifications.map((verification) => (
              <Card key={verification.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">
                          {verification.profiles?.full_name || 'Nome não informado'}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm truncate">
                          {verification.profiles?.email}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(verification.status)}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">País:</span>
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {verification.country ? (COUNTRY_NAMES[verification.country] || verification.country) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">Tipo:</span>
                      <span className="text-xs sm:text-sm font-medium truncate">{verification.document_type}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">Número:</span>
                      <span className="text-xs sm:text-sm font-medium truncate">{verification.document_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">Nascimento:</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {format(new Date(verification.birth_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">Enviado:</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {format(new Date(verification.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  {verification.status === 'rejeitado' && verification.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-red-800 font-medium mb-1 text-xs sm:text-sm">Motivo da rejeição:</p>
                      <p className="text-red-700 text-xs sm:text-sm">{verification.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">Documentos:</span>
                    {verification.document_front_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocument(verification.document_front_url!, 'Documento - Frente', verification)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">Frente</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {verification.document_back_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDocument(verification.document_back_url!, 'Documento - Verso', verification)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span className="text-xs">Verso</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    {verification.status === 'pendente' && (
                      <>
                        <Button
                          onClick={() => updateVerificationStatus(verification.id, 'aprovado')}
                          disabled={processingId === verification.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setSelectedVerification(verification)}
                              className="w-full sm:w-auto"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Reprovar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Reprovar Verificação</DialogTitle>
                              <DialogDescription className="text-xs sm:text-sm">
                                Informe o motivo para {verification.profiles?.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejection-reason" className="text-xs sm:text-sm">Motivo da Reprovação</Label>
                                <Textarea
                                  id="rejection-reason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Ex: Documento ilegível, informações não conferem..."
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setRejectionReason('')}>
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => updateVerificationStatus(verification.id, 'rejeitado', rejectionReason)}
                                  disabled={!rejectionReason.trim() || processingId === verification.id}
                                >
                                  Reprovar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    
                    {verification.status === 'aprovado' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedVerification(verification)}
                              className="w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Reprovar Verificação
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Reprovar Verificação</DialogTitle>
                              <DialogDescription className="text-xs sm:text-sm">
                                Esta ação irá remover a verificação de identidade de {verification.profiles?.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejection-reason-approved" className="text-xs sm:text-sm">Motivo da Reprovação</Label>
                                <Textarea
                                  id="rejection-reason-approved"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Ex: Documento expirado, informações desatualizadas..."
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setRejectionReason('')}>
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => updateVerificationStatus(verification.id, 'rejeitado', rejectionReason)}
                                  disabled={!rejectionReason.trim() || processingId === verification.id}
                                >
                                  Reprovar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForBan({
                              id: verification.user_id,
                              name: verification.profiles?.full_name || 'Usuário',
                              email: verification.profiles?.email || ''
                            });
                            setBanDialogOpen(true);
                          }}
                          className="w-full sm:w-auto"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Banir Usuário
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      {/* Document Modal */}
      <Dialog open={documentModal.isOpen} onOpenChange={(open) => setDocumentModal(prev => ({...prev, isOpen: open}))}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{documentModal.title}</DialogTitle>
            <DialogDescription>
              Informações completas da verificação de identidade
            </DialogDescription>
          </DialogHeader>
          
          {/* Informações do KYC */}
          {documentModal.verification && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Vendedor
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Nome Completo:</span>
                    <span className="text-sm">{documentModal.verification.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <span className="text-sm">{documentModal.verification.profiles?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Data de Nascimento:</span>
                    <span className="text-sm">{format(new Date(documentModal.verification.birth_date), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Tipo de Documento:</span>
                    <span className="text-sm">{documentModal.verification.document_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Número do Documento:</span>
                    <span className="text-sm">{documentModal.verification.document_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Data de Envio:</span>
                    <span className="text-sm">{format(new Date(documentModal.verification.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Status:</span>
                {getStatusBadge(documentModal.verification.status)}
              </div>
              
              {documentModal.verification.status === 'rejeitado' && documentModal.verification.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 font-medium mb-1">Motivo da rejeição:</p>
                  <p className="text-red-700 text-sm">{documentModal.verification.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Documento */}
          <div className="flex flex-col justify-center items-center p-4 bg-gray-50 rounded-lg">
            {documentModal.imageUrl && (
              <>
                {/* Verificar se é PDF */}
                {documentModal.imageUrl.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <iframe 
                      src={documentModal.imageUrl}
                      className="w-full h-[60vh] rounded-lg shadow-lg border"
                      title={documentModal.title}
                    />
                    <a 
                      href={documentModal.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir PDF em nova aba
                    </a>
                  </div>
                ) : (
                  <img 
                    src={documentModal.imageUrl} 
                    alt={documentModal.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', e);
                      toast({
                        title: 'Erro',
                        message: 'Erro ao carregar documento',
                        variant: 'error'
                      });
                    }}
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <BanUserDialog
        isOpen={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setSelectedUserForBan(null);
        }}
        onConfirm={handleBanUser}
        userName={selectedUserForBan?.name || ''}
        isLoading={isBanning}
      />
    </AdminLayout>
  );
}