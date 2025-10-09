import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, Upload, X, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface IdentityVerification {
  id: string;
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
}

const documentTypes = [
  { value: 'BI', label: 'Bilhete de Identidade (BI)' },
  { value: 'Passaporte', label: 'Passaporte' },
  { value: 'Cartao_Residencia', label: 'Cartão de Residência' },
  { value: 'Outro', label: 'Outro' }
];

export default function UserIdentity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    birth_date: '',
    document_type: '',
    document_number: ''
  });

  const loadVerification = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('identity_verification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setVerification(data as IdentityVerification);
        setFormData({
          full_name: data.full_name,
          birth_date: data.birth_date,
          document_type: data.document_type,
          document_number: data.document_number
        });
      }
    } catch (error) {
      console.error('Erro ao carregar verificação:', error);
      toast.error('Erro ao carregar dados de verificação');
    }
  };

  useEffect(() => {
    loadVerification();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadDocument = async (file: File, type: 'front' | 'back') => {
    if (!user) return null;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${formData.document_type}_${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload do documento');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB');
      return;
    }

    const url = await uploadDocument(file, type);
    if (url) {
      setVerification(prev => prev ? {
        ...prev,
        [`document_${type}_url`]: url
      } : null);
      toast.success('Documento enviado com sucesso');
    }
  };

  const removeDocument = async (type: 'front' | 'back') => {
    const currentUrl = verification?.[`document_${type}_url` as keyof IdentityVerification];
    if (currentUrl && typeof currentUrl === 'string') {
      const fileName = currentUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('identity-documents')
          .remove([`${user?.id}/${fileName}`]);
      }
    }

    setVerification(prev => prev ? {
      ...prev,
      [`document_${type}_url`]: undefined
    } : null);
  };

  const handleSubmit = async () => {
    if (!user || !formData.full_name || !formData.birth_date || !formData.document_type || !formData.document_number) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // ✅ VALIDAÇÃO OBRIGATÓRIA: Verificar se os documentos foram anexados
    if (!verification?.document_front_url) {
      toast.error('É obrigatório anexar a frente do documento');
      return;
    }

    // Para BI, o verso também é obrigatório
    if (needsBackside && !verification?.document_back_url) {
      toast.error('É obrigatório anexar o verso do Bilhete de Identidade');
      return;
    }

    try {
      setLoading(true);

      const verificationData = {
        user_id: user.id,
        full_name: formData.full_name,
        birth_date: formData.birth_date,
        document_type: formData.document_type,
        document_number: formData.document_number,
        document_front_url: verification?.document_front_url,
        document_back_url: verification?.document_back_url,
        status: 'pendente'
      };

      if (verification) {
        const { error } = await supabase
          .from('identity_verification')
          .update(verificationData)
          .eq('id', verification.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('identity_verification')
          .insert([verificationData]);

        if (error) throw error;
      }

      toast.success('Dados de verificação salvos com sucesso');
      await loadVerification();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados de verificação');
    } finally {
      setLoading(false);
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

  const needsBackside = formData.document_type === 'BI';
  const isReadOnly = verification?.status === 'aprovado';

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Verificação de Identidade</h1>
            <p className="text-muted-foreground">
              Complete sua verificação de identidade para habilitar funcionalidades adicionais
            </p>
          </div>
        </div>

        {verification && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Status da Verificação</CardTitle>
                {getStatusBadge(verification.status)}
              </div>
            </CardHeader>
            <CardContent>
              {verification.status === 'rejeitado' && verification.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium mb-2">Motivo da rejeição:</p>
                  <p className="text-red-700">{verification.rejection_reason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Última atualização: {format(new Date(verification.updated_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Preencha suas informações pessoais conforme constam no seu documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Digite seu nome completo"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label htmlFor="birth_date">Data de Nascimento *</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label htmlFor="document_type">Tipo de Documento *</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(value) => handleInputChange('document_type', value)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="document_number">Número do Documento *</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) => handleInputChange('document_number', e.target.value)}
                  placeholder="Digite o número do documento"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {formData.document_type && (
          <Card>
            <CardHeader>
              <CardTitle>Upload de Documentos</CardTitle>
              <CardDescription>
                {needsBackside 
                  ? 'Faça o upload da frente e verso do seu documento'
                  : 'Faça o upload do seu documento'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Frente do documento */}
              <div>
                <Label>Frente do Documento *</Label>
                {verification?.document_front_url ? (
                  <div className="flex items-center gap-3 mt-2">
                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Documento enviado
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeDocument('front')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e, 'front')}
                      className="hidden"
                      id="front-upload"
                      disabled={isReadOnly || uploading}
                    />
                    <label
                      htmlFor="front-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Clique para enviar a frente do documento
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, PDF até 5MB</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              {/* Verso do documento (apenas para BI) */}
              {needsBackside && (
                <div>
                  <Label>Verso do Documento *</Label>
                  {verification?.document_back_url ? (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Documento enviado
                      </div>
                      {!isReadOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDocument('back')}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'back')}
                        className="hidden"
                        id="back-upload"
                        disabled={isReadOnly || uploading}
                      />
                      <label
                        htmlFor="back-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        {uploading ? (
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">
                              Clique para enviar o verso do documento
                            </p>
                            <p className="text-xs text-gray-400">PNG, JPG, PDF até 5MB</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isReadOnly && (
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={loading || uploading}
              size="lg"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {verification ? 'Atualizar Verificação' : 'Enviar para Verificação'}
            </Button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}