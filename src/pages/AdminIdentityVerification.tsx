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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SEO } from '@/components/SEO';
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
  ArrowLeft
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

interface IdentityVerification {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  document_type: string;
  document_number: string;
  document_front_url?: string;
  document_back_url?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminIdentityVerification() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
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
      toast.error('Erro ao carregar verificações de identidade');
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

      const { error } = await supabase
        .from('identity_verification')
        .update(updateData)
        .eq('id', id);

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

      toast.success(`Verificação ${newStatus === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso`);
      setRejectionReason('');
      setSelectedVerification(null);
      await loadVerifications();
    } catch (error) {
      console.error('Erro ao atualizar verificação:', error);
      toast.error('Erro ao atualizar status da verificação');
    } finally {
      setProcessingId(null);
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

  const openDocument = async (url: string, title: string, verification: IdentityVerification) => {
    try {
      console.log('🔍 Tentando abrir documento:', { url, title });
      
      // Para identity-documents (bucket privado), usar URL assinada
      if (url.includes('identity-documents')) {
        // Extrair o caminho do arquivo do URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // O formato típico é: /storage/v1/object/public/identity-documents/user_id/filename
        // Procurar pelo índice de 'identity-documents' e pegar tudo depois
        const bucketIndex = pathParts.indexOf('identity-documents');
        if (bucketIndex === -1) {
          console.error('❌ Bucket identity-documents não encontrado no URL');
          toast.error('URL de documento inválida');
          return;
        }
        
        // Pegar o path completo após 'identity-documents'
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        console.log('📂 Caminho do arquivo extraído:', filePath);
        
        const { data, error } = await supabase.storage
          .from('identity-documents')
          .createSignedUrl(filePath, 3600); // 1 hora de validade
        
        if (error) {
          console.error('❌ Erro ao criar URL assinada:', error);
          toast.error('Erro ao acessar documento: ' + error.message);
          return;
        }
        
        console.log('✅ URL assinada criada com sucesso');
        setDocumentModal({
          isOpen: true,
          imageUrl: data.signedUrl,
          title: title,
          verification: verification
        });
      } else {
        // Para URLs públicas, usar diretamente
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
      toast.error('Erro ao acessar documento');
    }
  };

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Carregando verificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="Kambafy Admin – KYC" description="Aprovar ou reprovar verificações de identidade" canonical="https://kambafy.com/admin/identity" noIndex />
      {/* Header - Responsivo */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="text-white h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Verificação de Identidade</h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gerencie verificações dos vendedores</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsivo */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Filters - Responsivo */}
        <div className="mb-4 sm:mb-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
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

                  {verification.status === 'pendente' && (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
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
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
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
          <div className="flex justify-center items-center p-4 bg-gray-50 rounded-lg">
            {documentModal.imageUrl && (
              <img 
                src={documentModal.imageUrl} 
                alt={documentModal.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', e);
                  toast.error('Erro ao carregar documento');
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}