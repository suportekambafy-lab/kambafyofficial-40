import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useCloudflareUpload } from '@/hooks/useCloudflareUpload';
import { format } from 'date-fns';
import { Loader2, Upload, X, Shield, CheckCircle, AlertCircle, Clock, ArrowLeft, MapPin } from 'lucide-react';
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
  country?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
}

// Países suportados com seus tipos de documentos
const countriesWithDocuments = {
  AO: {
    name: 'Angola',
    flag: '🇦🇴',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'Carta_Conducao', label: 'Carta de Condução' },
      { value: 'Cartao_Residencia', label: 'Cartão de Residência' },
    ]
  },
  BR: {
    name: 'Brasil',
    flag: '🇧🇷',
    documents: [
      { value: 'RG', label: 'RG (Registro Geral)' },
      { value: 'CNH', label: 'CNH (Carteira Nacional de Habilitação)' },
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'RNE', label: 'RNE (Registro Nacional de Estrangeiros)' },
    ]
  },
  PT: {
    name: 'Portugal',
    flag: '🇵🇹',
    documents: [
      { value: 'CC', label: 'Cartão de Cidadão (CC)' },
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'Titulo_Residencia', label: 'Título de Residência' },
      { value: 'Carta_Conducao', label: 'Carta de Condução' },
    ]
  },
  MZ: {
    name: 'Moçambique',
    flag: '🇲🇿',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'DIRE', label: 'DIRE (Documento de Identificação de Residente Estrangeiro)' },
      { value: 'Carta_Conducao', label: 'Carta de Condução' },
    ]
  },
  CV: {
    name: 'Cabo Verde',
    flag: '🇨🇻',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'Carta_Conducao', label: 'Carta de Condução' },
    ]
  },
  ST: {
    name: 'São Tomé e Príncipe',
    flag: '🇸🇹',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
    ]
  },
  GW: {
    name: 'Guiné-Bissau',
    flag: '🇬🇼',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
    ]
  },
  TL: {
    name: 'Timor-Leste',
    flag: '🇹🇱',
    documents: [
      { value: 'BI', label: 'Bilhete de Identidade (BI)' },
      { value: 'Passaporte', label: 'Passaporte' },
    ]
  },
  OTHER: {
    name: 'Outro País',
    flag: '🌍',
    documents: [
      { value: 'Passaporte', label: 'Passaporte' },
      { value: 'Cartao_Residencia', label: 'Cartão/Título de Residência' },
      { value: 'Outro', label: 'Outro Documento' },
    ]
  }
};

type CountryCode = keyof typeof countriesWithDocuments;

export default function UserIdentity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  const { uploadFile: cloudflareUpload } = useCloudflareUpload();
  const [loading, setLoading] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [formData, setFormData] = useState({
    country: '' as CountryCode | '',
    full_name: '',
    birth_date: '',
    document_type: '',
    document_number: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_postal_code: ''
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
          country: (data.country as CountryCode) || '',
          full_name: data.full_name,
          birth_date: data.birth_date,
          document_type: data.document_type,
          document_number: data.document_number,
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_complement: data.address_complement || '',
          address_neighborhood: data.address_neighborhood || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          address_postal_code: data.address_postal_code || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar verificação:', error);
      toast({
        title: 'Erro',
        message: 'Erro ao carregar dados de verificação',
        variant: 'error'
      });
    }
  };

  useEffect(() => {
    loadVerification();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Limpar tipo de documento se o país mudar
      if (field === 'country') {
        newData.document_type = '';
      }
      return newData;
    });
  };

  // Verificar se o tipo de documento precisa de verso
  const documentNeedsBackside = (docType: string) => {
    return docType !== 'Passaporte' && docType !== '';
  };

  // Obter documentos disponíveis para o país selecionado
  const getAvailableDocuments = () => {
    if (!formData.country) return [];
    return countriesWithDocuments[formData.country]?.documents || [];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    console.log('📤 Iniciando upload de documento:', { type, hasFile: !!event.target.files?.[0] });
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ Nenhum arquivo selecionado');
      return;
    }

    console.log('📄 Arquivo selecionado:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });

    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Arquivo muito grande:', file.size);
      toast({
        title: 'Arquivo muito grande',
        message: 'O arquivo deve ter no máximo 5MB',
        variant: 'error'
      });
      return;
    }

    // Usar estados de upload separados para frente e verso
    if (type === 'front') {
      setUploadingFront(true);
    } else {
      setUploadingBack(true);
    }

    console.log('🔄 Fazendo upload via Cloudflare R2...');
    const url = await cloudflareUpload(file);
    
    // Reset o input para permitir re-upload do mesmo arquivo
    event.target.value = '';
    
    // Resetar estado de upload
    if (type === 'front') {
      setUploadingFront(false);
    } else {
      setUploadingBack(false);
    }
    
    console.log('📥 URL retornada do Cloudflare:', url);
    
    if (url && user) {
      console.log('✅ Upload bem-sucedido, atualizando estado local');
      
      const newVerification = verification ? {
        ...verification,
        [`document_${type}_url`]: url
      } : {
        id: '',
        full_name: formData.full_name,
        birth_date: formData.birth_date,
        document_type: formData.document_type,
        document_number: formData.document_number,
        status: 'pendente' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        [`document_${type}_url`]: url
      } as IdentityVerification;
      
      setVerification(newVerification);

      try {
        if (verification?.id) {
          const { data, error } = await supabase
            .from('identity_verification')
            .update({ [`document_${type}_url`]: url })
            .eq('id', verification.id)
            .eq('user_id', user.id)
            .select();

          if (error) throw error;
          
          if (data && data[0]) {
            setVerification(data[0] as IdentityVerification);
          }
          
          toast({
            title: 'Sucesso',
            message: 'Documento enviado com sucesso',
            variant: 'success'
          });
        } else {
          const requiresBackside = documentNeedsBackside(formData.document_type);
          
          if (type === 'front' && requiresBackside) {
            toast({
              title: 'Frente do documento carregada',
              message: 'Agora envie o verso do documento para continuar',
              variant: 'warning'
            });
          } else if (type === 'back' || !requiresBackside) {
            toast({
              title: 'Documento carregado',
              message: 'Clique em "Enviar para Verificação" para finalizar',
              variant: 'success'
            });
          }
        }
      } catch (error: any) {
        console.error('❌ Erro ao salvar documento no banco:', error);
        toast({
          title: 'Erro',
          message: error?.message || 'Erro ao salvar documento',
          variant: 'error'
        });
      }
    }
  };

  const removeDocument = async (type: 'front' | 'back') => {
    setVerification(prev => prev ? {
      ...prev,
      [`document_${type}_url`]: undefined
    } : null);

    if (verification?.id && user) {
      try {
        await supabase
          .from('identity_verification')
          .update({ [`document_${type}_url`]: null })
          .eq('id', verification.id)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Erro ao remover documento do banco:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.country || !formData.full_name || !formData.birth_date || !formData.document_type || !formData.document_number) {
      toast({
        title: 'Campos obrigatórios',
        message: 'Preencha todos os campos obrigatórios (País, Nome, Data de Nascimento, Tipo e Número do Documento)',
        variant: 'error'
      });
      return;
    }

    // Validar morada obrigatória
    if (!formData.address_street || !formData.address_city || !formData.address_state) {
      toast({
        title: 'Morada obrigatória',
        message: 'Preencha pelo menos a rua, cidade e estado/província',
        variant: 'error'
      });
      return;
    }

    if (!verification?.document_front_url) {
      toast({
        title: 'Documento obrigatório',
        message: 'É obrigatório anexar a frente do documento',
        variant: 'error'
      });
      return;
    }

    if (needsBackside && !verification?.document_back_url) {
      toast({
        title: 'Documento obrigatório',
        message: 'É obrigatório anexar o verso do documento',
        variant: 'error'
      });
      return;
    }

    try {
      setLoading(true);

      const verificationData = {
        user_id: user.id,
        country: formData.country,
        full_name: formData.full_name,
        birth_date: formData.birth_date,
        document_type: formData.document_type,
        document_number: formData.document_number,
        document_front_url: verification?.document_front_url,
        document_back_url: verification?.document_back_url || null,
        address_street: formData.address_street,
        address_number: formData.address_number,
        address_complement: formData.address_complement,
        address_neighborhood: formData.address_neighborhood,
        address_city: formData.address_city,
        address_state: formData.address_state,
        address_postal_code: formData.address_postal_code,
        status: 'pendente'
      };

      if (verification) {
        const { user_id, ...updateData } = verificationData;
        
        const { error } = await supabase
          .from('identity_verification')
          .update(updateData)
          .eq('id', verification.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('identity_verification')
          .insert([verificationData]);

        if (error) throw error;
      }

      toast({
        title: 'Verificação enviada',
        message: 'Seus dados foram enviados para verificação com sucesso',
        variant: 'success'
      });
      await loadVerification();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        message: error?.message || 'Erro ao salvar dados de verificação',
        variant: 'error'
      });
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

  const needsBackside = formData.document_type !== 'Passaporte' && formData.document_type !== '';
  const isReadOnly = verification?.status === 'aprovado';
  
  const getButtonText = () => {
    if (!verification) {
      return 'Enviar para Verificação';
    }
    if (verification.status === 'pendente') {
      return 'Enviada para Verificação';
    }
    if (verification.status === 'rejeitado') {
      return 'Atualizar Verificação';
    }
    return 'Atualizar Verificação';
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Verificação de Identidade</h1>
              <p className="text-muted-foreground">
                Complete sua verificação de identidade para habilitar funcionalidades adicionais
              </p>
            </div>
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
              {verification.status === 'pendente' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-medium mb-2">Verificação em Análise</p>
                  <p className="text-yellow-700">Sua verificação de identidade foi enviada e está sendo analisada pela nossa equipe. Você será notificado quando o processo for concluído.</p>
                </div>
              )}
              {verification.status === 'rejeitado' && verification.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium mb-2">Motivo da rejeição:</p>
                  <p className="text-red-700">{verification.rejection_reason}</p>
                  <p className="text-red-700 mt-2 text-sm">Por favor, atualize as informações e envie novamente.</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Última atualização: {format(new Date(verification.updated_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* País */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione o País</CardTitle>
            <CardDescription>
              Escolha o país emissor do seu documento de identificação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="country">País *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleInputChange('country', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(countriesWithDocuments).map(([code, country]) => (
                    <SelectItem key={code} value={code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Informações Pessoais - só aparece após selecionar país */}
        {formData.country && (
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
                      {getAvailableDocuments().map((type) => (
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
        )}

        {/* Morada - só aparece após selecionar país */}
        {formData.country && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle>Morada</CardTitle>
              </div>
              <CardDescription>
                Preencha seu endereço de residência atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address_street">Rua/Avenida *</Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => handleInputChange('address_street', e.target.value)}
                    placeholder="Nome da rua ou avenida"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => handleInputChange('address_number', e.target.value)}
                    placeholder="Nº"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => handleInputChange('address_complement', e.target.value)}
                    placeholder="Apartamento, bloco, etc."
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="address_neighborhood">Bairro</Label>
                  <Input
                    id="address_neighborhood"
                    value={formData.address_neighborhood}
                    onChange={(e) => handleInputChange('address_neighborhood', e.target.value)}
                    placeholder="Nome do bairro"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="address_city">Cidade *</Label>
                  <Input
                    id="address_city"
                    value={formData.address_city}
                    onChange={(e) => handleInputChange('address_city', e.target.value)}
                    placeholder="Nome da cidade"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="address_state">Estado/Província *</Label>
                  <Input
                    id="address_state"
                    value={formData.address_state}
                    onChange={(e) => handleInputChange('address_state', e.target.value)}
                    placeholder="Estado ou província"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="address_postal_code">Código Postal</Label>
                  <Input
                    id="address_postal_code"
                    value={formData.address_postal_code}
                    onChange={(e) => handleInputChange('address_postal_code', e.target.value)}
                    placeholder="CEP / Código Postal"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload de Documentos */}
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
                      onChange={(e) => {
                        console.log('📤 Frente input onChange triggered');
                        handleFileUpload(e, 'front');
                      }}
                      onClick={(e) => {
                        console.log('📤 Frente input onClick triggered');
                        // Reset value to allow same file re-upload
                        (e.target as HTMLInputElement).value = '';
                      }}
                      className="hidden"
                      id="document-front-upload"
                      disabled={isReadOnly || uploadingFront}
                    />
                    <label
                      htmlFor="document-front-upload"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${uploadingFront ? 'opacity-50' : ''}`}
                    >
                      {uploadingFront ? (
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

              {/* Verso do documento */}
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
                        onChange={(e) => {
                          console.log('📤 Verso input onChange triggered');
                          handleFileUpload(e, 'back');
                        }}
                        onClick={(e) => {
                          console.log('📤 Verso input onClick triggered');
                          // Reset value to allow same file re-upload
                          (e.target as HTMLInputElement).value = '';
                        }}
                        className="hidden"
                        id="document-back-upload"
                        disabled={isReadOnly || uploadingBack}
                      />
                      <label
                        htmlFor="document-back-upload"
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${uploadingBack ? 'opacity-50' : ''}`}
                      >
                        {uploadingBack ? (
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

        {verification?.status !== 'aprovado' && (
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={loading || uploadingFront || uploadingBack || verification?.status === 'pendente'}
              size="lg"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {getButtonText()}
            </Button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
