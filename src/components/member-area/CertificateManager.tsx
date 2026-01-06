import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award, Plus, Edit, Eye, Download, Trash2, Copy, Settings, FileText, Search, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCloudflareUpload } from '@/hooks/useCloudflareUpload';
import kambafyLogo from '@/assets/kambafy-logo-gray.svg';

interface CertificateTemplate {
  id: string;
  name: string;
  background_color: string;
  background_image_url: string | null;
  logo_url: string | null;
  signature_url: string | null;
  signature_name: string | null;
  signature_title: string | null;
  title_text: string;
  body_text: string;
  footer_text: string | null;
  show_date: boolean;
  show_hours: boolean;
  show_quiz_score: boolean;
  font_family: string;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
}

interface Certificate {
  id: string;
  certificate_number: string;
  student_email: string;
  student_name: string;
  course_name: string;
  completion_date: string;
  total_hours: number;
  quiz_average_score: number | null;
  status: string;
  issued_at: string;
  viewed_at: string | null;
  downloaded_at: string | null;
}

interface CertificateManagerProps {
  memberAreaId: string;
}

// Template padrão Kambafy - design profissional com cores da marca
const defaultTemplate: Partial<CertificateTemplate> = {
  name: 'Certificado Kambafy',
  background_color: '#f8fafc',
  title_text: 'CERTIFICADO DE CONCLUSÃO',
  body_text: 'Certificamos que {student_name} concluiu com êxito o curso {course_name} com carga horária de {hours} horas.',
  footer_text: 'Certificado emitido pela plataforma Kambafy',
  show_date: true,
  show_hours: true,
  show_quiz_score: false,
  font_family: 'Inter',
  primary_color: '#1a1a2e',
  secondary_color: '#64748b',
  is_active: true,
  logo_url: kambafyLogo,
};

export function CertificateManager({ memberAreaId }: CertificateManagerProps) {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Partial<CertificateTemplate> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const { uploadFile, uploading } = useCloudflareUpload();

  // Helper para upload de imagem
  const handleImageUpload = async (file: File, field: 'logo_url' | 'background_image_url' | 'signature_url') => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 10MB');
      return;
    }
    
    const url = await uploadFile(file);
    if (url && editingTemplate) {
      setEditingTemplate({ ...editingTemplate, [field]: url });
      toast.success('Imagem enviada com sucesso!');
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberAreaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, certificatesRes] = await Promise.all([
        supabase
          .from('certificate_templates')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('certificates')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .order('issued_at', { ascending: false })
          .range(0, 99)
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (certificatesRes.data) setCertificates(certificatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate?.name || !editingTemplate?.title_text) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (editingTemplate.id) {
        const { error } = await supabase
          .from('certificate_templates')
          .update({
            name: editingTemplate.name,
            background_color: editingTemplate.background_color,
            background_image_url: editingTemplate.background_image_url,
            logo_url: editingTemplate.logo_url,
            signature_url: editingTemplate.signature_url,
            signature_name: editingTemplate.signature_name,
            signature_title: editingTemplate.signature_title,
            title_text: editingTemplate.title_text,
            body_text: editingTemplate.body_text,
            footer_text: editingTemplate.footer_text,
            show_date: editingTemplate.show_date,
            show_hours: editingTemplate.show_hours,
            show_quiz_score: editingTemplate.show_quiz_score,
            font_family: editingTemplate.font_family,
            primary_color: editingTemplate.primary_color,
            secondary_color: editingTemplate.secondary_color,
            is_active: editingTemplate.is_active,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template atualizado');
      } else {
        const { error } = await supabase
          .from('certificate_templates')
          .insert({
            member_area_id: memberAreaId,
            user_id: user.id,
            ...editingTemplate,
          });

        if (error) throw error;
        toast.success('Template criado');
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Erro ao salvar template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('certificate_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template excluído');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Erro ao excluir template');
    }
  };

  const copyVerificationLink = (certificateNumber: string) => {
    const url = `${window.location.origin}/certificado/${certificateNumber}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="templates" className="space-y-4">
      <TabsList>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="certificates" className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          Certificados Emitidos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Templates de Certificado</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTemplate(defaultTemplate)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate?.id ? 'Editar Template' : 'Novo Template'}
                </DialogTitle>
              </DialogHeader>
              {editingTemplate && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Template</Label>
                      <Input
                        value={editingTemplate.name || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        placeholder="Ex: Certificado Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Título do Certificado</Label>
                      <Input
                        value={editingTemplate.title_text || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, title_text: e.target.value })}
                        placeholder="CERTIFICADO DE CONCLUSÃO"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Texto do Certificado</Label>
                    <Textarea
                      value={editingTemplate.body_text || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body_text: e.target.value })}
                      placeholder="Use {student_name}, {course_name}, {hours}, {date}, {quiz_score}"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {'{student_name}'}, {'{course_name}'}, {'{hours}'}, {'{date}'}, {'{quiz_score}'}
                    </p>
                  </div>

                  {/* Upload de Logo */}
                  <div className="space-y-2">
                    <Label>Logo do Certificado</Label>
                    {editingTemplate.logo_url ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-32 h-20 bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={editingTemplate.logo_url}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate({ ...editingTemplate, logo_url: null })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'logo_url');
                          }}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer">
                          {uploading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-muted-foreground">Enviando...</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Clique para fazer upload do logo</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Recomendado: PNG transparente, 400x100px</p>
                  </div>

                  {/* Upload de Imagem de Fundo */}
                  <div className="space-y-2">
                    <Label>Imagem de Fundo (opcional)</Label>
                    {editingTemplate.background_image_url ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-48 h-32 bg-muted rounded-lg overflow-hidden border">
                          <img
                            src={editingTemplate.background_image_url}
                            alt="Fundo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate({ ...editingTemplate, background_image_url: null })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'background_image_url');
                          }}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer">
                          {uploading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-muted-foreground">Enviando...</span>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Clique para upload da imagem de fundo</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Recomendado: 1920x1080px ou proporção A4 horizontal</p>
                  </div>

                  {/* Upload de Assinatura */}
                  <div className="space-y-2">
                    <Label>Imagem da Assinatura (opcional)</Label>
                    {editingTemplate.signature_url ? (
                      <div className="flex items-center gap-4">
                        <div className="relative w-40 h-16 bg-white rounded-lg overflow-hidden border">
                          <img
                            src={editingTemplate.signature_url}
                            alt="Assinatura"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate({ ...editingTemplate, signature_url: null })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, 'signature_url');
                          }}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer">
                          {uploading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <span className="text-sm text-muted-foreground">Enviando...</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Upload da assinatura</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Recomendado: PNG transparente com a assinatura</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da Assinatura</Label>
                      <Input
                        value={editingTemplate.signature_name || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, signature_name: e.target.value })}
                        placeholder="João Silva"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo/Título</Label>
                      <Input
                        value={editingTemplate.signature_title || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, signature_title: e.target.value })}
                        placeholder="Instrutor Principal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cor de Fundo</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editingTemplate.background_color || '#ffffff'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={editingTemplate.background_color || '#ffffff'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, background_color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editingTemplate.primary_color || '#000000'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, primary_color: e.target.value })}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={editingTemplate.primary_color || '#000000'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, primary_color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cor Secundária</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editingTemplate.secondary_color || '#666666'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, secondary_color: e.target.value })}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={editingTemplate.secondary_color || '#666666'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, secondary_color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Data de Conclusão</Label>
                      <Switch
                        checked={editingTemplate.show_date ?? true}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, show_date: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Carga Horária</Label>
                      <Switch
                        checked={editingTemplate.show_hours ?? true}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, show_hours: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Nota dos Quizzes</Label>
                      <Switch
                        checked={editingTemplate.show_quiz_score ?? false}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, show_quiz_score: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Template Ativo</Label>
                      <Switch
                        checked={editingTemplate.is_active ?? true}
                        onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
                      />
                    </div>
                  </div>

                  {/* Preview inline do certificado */}
                  <div className="space-y-2">
                    <Label>Pré-visualização</Label>
                    <div
                      className="aspect-[1.414/1] w-full rounded-lg border-2 flex flex-col items-center justify-center text-center relative overflow-hidden"
                      style={{
                        backgroundColor: editingTemplate.background_color || '#f8fafc',
                        backgroundImage: editingTemplate.background_image_url
                          ? `url(${editingTemplate.background_image_url})`
                          : `linear-gradient(135deg, ${editingTemplate.background_color || '#f8fafc'} 0%, ${editingTemplate.background_color || '#f8fafc'}ee 100%)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        fontFamily: editingTemplate.font_family || 'Inter',
                      }}
                    >
                      {/* Moldura decorativa externa */}
                      <div 
                        className="absolute inset-2 border-2 rounded pointer-events-none"
                        style={{ borderColor: `${editingTemplate.primary_color || '#1a1a2e'}30` }}
                      />
                      <div 
                        className="absolute inset-3 border rounded pointer-events-none"
                        style={{ borderColor: `${editingTemplate.primary_color || '#1a1a2e'}20` }}
                      />
                      
                      {/* Cantos decorativos */}
                      <svg className="absolute top-4 left-4 w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12V2h10M2 2l10 10" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="1" strokeOpacity="0.3"/>
                      </svg>
                      <svg className="absolute top-4 right-4 w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12V2H12M22 2L12 12" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="1" strokeOpacity="0.3"/>
                      </svg>
                      <svg className="absolute bottom-4 left-4 w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12v10h10M2 22l10-10" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="1" strokeOpacity="0.3"/>
                      </svg>
                      <svg className="absolute bottom-4 right-4 w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12v10H12M22 22L12 12" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="1" strokeOpacity="0.3"/>
                      </svg>

                      {/* Ornamento superior */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2">
                        <svg width="60" height="12" viewBox="0 0 60 12" fill="none">
                          <path d="M0 6h20M40 6h20M25 6a5 5 0 1010 0 5 5 0 10-10 0" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="1" strokeOpacity="0.4"/>
                          <circle cx="30" cy="6" r="2" fill={editingTemplate.primary_color || '#1a1a2e'} fillOpacity="0.3"/>
                        </svg>
                      </div>

                      <div className="relative z-10 flex flex-col items-center px-6 py-4">
                        {/* Ícone de troféu/medalha */}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                          style={{ 
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            border: '1px solid #15803d'
                          }}
                        >
                          <Award className="w-5 h-5 text-white" />
                        </div>

                        {editingTemplate.logo_url && (
                          <img
                            src={editingTemplate.logo_url}
                            alt="Logo"
                            className="h-6 mb-2 object-contain"
                          />
                        )}
                        
                        {/* Linha decorativa acima do título */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-px" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}40` }} />
                          <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}40` }} />
                          <div className="w-8 h-px" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}40` }} />
                        </div>

                        <h1
                          className="text-sm font-bold tracking-wider mb-1"
                          style={{ color: editingTemplate.primary_color || '#1a1a2e' }}
                        >
                          {editingTemplate.title_text || 'CERTIFICADO DE CONCLUSÃO'}
                        </h1>
                        
                        {/* Linha decorativa abaixo do título */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-12 h-px" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}30` }} />
                          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}50` }} />
                          <div className="w-12 h-px" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}30` }} />
                        </div>

                        <p
                          className="text-[9px] max-w-[85%] mb-2 leading-relaxed"
                          style={{ color: editingTemplate.secondary_color || '#64748b' }}
                        >
                          {(editingTemplate.body_text || 'Certificamos que {student_name} concluiu com êxito o curso {course_name}...')
                            .replace('{student_name}', 'Nome do Aluno')
                            .replace('{course_name}', 'Nome do Curso')
                            .replace('{hours}', '40')
                            .replace('{date}', format(new Date(), 'dd/MM/yyyy'))
                            .replace('{quiz_score}', '95%')
                            .substring(0, 100)}...
                        </p>
                        
                        {editingTemplate.show_date && (
                          <p className="text-[8px] mb-2" style={{ color: editingTemplate.secondary_color || '#64748b' }}>
                            Data de Conclusão: {format(new Date(), "dd/MM/yyyy")}
                          </p>
                        )}
                        
                        {(editingTemplate.signature_url || editingTemplate.signature_name) && (
                          <div className="mt-1 pt-2 w-32">
                            {editingTemplate.signature_url && (
                              <img
                                src={editingTemplate.signature_url}
                                alt="Assinatura"
                                className="h-4 mx-auto mb-1 object-contain"
                              />
                            )}
                            <div className="w-full h-px mb-1" style={{ backgroundColor: `${editingTemplate.primary_color || '#1a1a2e'}50` }} />
                            {editingTemplate.signature_name && (
                              <p className="text-[8px] font-semibold" style={{ color: editingTemplate.primary_color || '#1a1a2e' }}>
                                {editingTemplate.signature_name}
                              </p>
                            )}
                            {editingTemplate.signature_title && (
                              <p className="text-[7px]" style={{ color: editingTemplate.secondary_color || '#64748b' }}>
                                {editingTemplate.signature_title}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ornamento inferior */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                        <svg width="40" height="8" viewBox="0 0 40 8" fill="none">
                          <path d="M0 4h15M25 4h15M17 4a3 3 0 106 0 3 3 0 10-6 0" stroke={editingTemplate.primary_color || '#1a1a2e'} strokeWidth="0.5" strokeOpacity="0.3"/>
                        </svg>
                      </div>
                      
                      {editingTemplate.footer_text && (
                        <p className="absolute bottom-2 text-[6px]" style={{ color: editingTemplate.secondary_color || '#64748b' }}>
                          {editingTemplate.footer_text}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveTemplate}>
                      Salvar Template
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum template criado ainda.<br />
                Crie um template para começar a emitir certificados automaticamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.title_text}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Preview do Certificado</DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div
                className="aspect-[1.414/1] w-full rounded-lg border-2 flex flex-col items-center justify-center text-center relative overflow-hidden"
                style={{
                  backgroundColor: previewTemplate.background_color,
                  backgroundImage: previewTemplate.background_image_url
                    ? `url(${previewTemplate.background_image_url})`
                    : `linear-gradient(135deg, ${previewTemplate.background_color} 0%, ${previewTemplate.background_color}ee 100%)`,
                  backgroundSize: 'cover',
                  fontFamily: previewTemplate.font_family,
                }}
              >
                {/* Moldura decorativa externa */}
                <div 
                  className="absolute inset-4 border-2 rounded pointer-events-none"
                  style={{ borderColor: `${previewTemplate.primary_color}30` }}
                />
                <div 
                  className="absolute inset-6 border rounded pointer-events-none"
                  style={{ borderColor: `${previewTemplate.primary_color}20` }}
                />
                
                {/* Cantos decorativos */}
                <svg className="absolute top-8 left-8 w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12V2h10M2 2l10 10" stroke={previewTemplate.primary_color} strokeWidth="1.5" strokeOpacity="0.3"/>
                </svg>
                <svg className="absolute top-8 right-8 w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M22 12V2H12M22 2L12 12" stroke={previewTemplate.primary_color} strokeWidth="1.5" strokeOpacity="0.3"/>
                </svg>
                <svg className="absolute bottom-8 left-8 w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M2 12v10h10M2 22l10-10" stroke={previewTemplate.primary_color} strokeWidth="1.5" strokeOpacity="0.3"/>
                </svg>
                <svg className="absolute bottom-8 right-8 w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M22 12v10H12M22 22L12 12" stroke={previewTemplate.primary_color} strokeWidth="1.5" strokeOpacity="0.3"/>
                </svg>

                {/* Ornamento superior */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2">
                  <svg width="120" height="20" viewBox="0 0 120 20" fill="none">
                    <path d="M0 10h40M80 10h40M50 10a10 10 0 1020 0 10 10 0 10-20 0" stroke={previewTemplate.primary_color} strokeWidth="1" strokeOpacity="0.4"/>
                    <circle cx="60" cy="10" r="4" fill={previewTemplate.primary_color} fillOpacity="0.3"/>
                  </svg>
                </div>

                <div className="relative z-10 flex flex-col items-center px-12 py-8">
                  {/* Ícone de troféu/medalha */}
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ 
                      background: `linear-gradient(135deg, ${previewTemplate.primary_color}20, ${previewTemplate.primary_color}10)`,
                      border: `2px solid ${previewTemplate.primary_color}30`
                    }}
                  >
                    <Award className="w-10 h-10" style={{ color: previewTemplate.primary_color }} />
                  </div>

                  {previewTemplate.logo_url && (
                    <img
                      src={previewTemplate.logo_url}
                      alt="Logo"
                      className="h-12 mb-4 object-contain"
                    />
                  )}
                  
                  {/* Linha decorativa acima do título */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-16 h-px" style={{ backgroundColor: `${previewTemplate.primary_color}40` }} />
                    <div className="w-3 h-3 rotate-45" style={{ backgroundColor: `${previewTemplate.primary_color}40` }} />
                    <div className="w-16 h-px" style={{ backgroundColor: `${previewTemplate.primary_color}40` }} />
                  </div>

                  <h1
                    className="text-3xl font-bold tracking-wider mb-2"
                    style={{ color: previewTemplate.primary_color }}
                  >
                    {previewTemplate.title_text}
                  </h1>
                  
                  {/* Linha decorativa abaixo do título */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-24 h-px" style={{ backgroundColor: `${previewTemplate.primary_color}30` }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `${previewTemplate.primary_color}50` }} />
                    <div className="w-24 h-px" style={{ backgroundColor: `${previewTemplate.primary_color}30` }} />
                  </div>

                  <p
                    className="text-lg max-w-2xl mb-6 leading-relaxed"
                    style={{ color: previewTemplate.secondary_color }}
                  >
                    {previewTemplate.body_text
                      .replace('{student_name}', 'Nome do Aluno')
                      .replace('{course_name}', 'Nome do Curso')
                      .replace('{hours}', '40')
                      .replace('{date}', format(new Date(), 'dd/MM/yyyy'))
                      .replace('{quiz_score}', '95%')}
                  </p>
                  
                  {previewTemplate.show_date && (
                    <p className="text-sm mb-6" style={{ color: previewTemplate.secondary_color }}>
                      Data de Conclusão: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                  
                  {(previewTemplate.signature_url || previewTemplate.signature_name) && (
                    <div className="mt-4 pt-4 w-48">
                      {previewTemplate.signature_url && (
                        <img
                          src={previewTemplate.signature_url}
                          alt="Assinatura"
                          className="h-10 mx-auto mb-2 object-contain"
                        />
                      )}
                      <div className="w-full h-px mb-2" style={{ backgroundColor: `${previewTemplate.primary_color}50` }} />
                      {previewTemplate.signature_name && (
                        <p className="font-semibold" style={{ color: previewTemplate.primary_color }}>
                          {previewTemplate.signature_name}
                        </p>
                      )}
                      {previewTemplate.signature_title && (
                        <p className="text-sm" style={{ color: previewTemplate.secondary_color }}>
                          {previewTemplate.signature_title}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Ornamento inferior */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                  <svg width="80" height="16" viewBox="0 0 80 16" fill="none">
                    <path d="M0 8h30M50 8h30M34 8a6 6 0 1012 0 6 6 0 10-12 0" stroke={previewTemplate.primary_color} strokeWidth="1" strokeOpacity="0.3"/>
                  </svg>
                </div>
                
                {previewTemplate.footer_text && (
                  <p className="absolute bottom-4 text-xs" style={{ color: previewTemplate.secondary_color }}>
                    {previewTemplate.footer_text}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="certificates" className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {certificates.length} certificados emitidos
          </Badge>
        </div>

        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Data de Emissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum certificado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.student_name}</p>
                          <p className="text-sm text-muted-foreground">{cert.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {cert.certificate_number}
                        </code>
                      </TableCell>
                      <TableCell>
                        {format(new Date(cert.issued_at), "dd/MM/yyyy 'às' HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="default" className="w-fit">
                            {cert.status === 'issued' ? 'Emitido' : cert.status}
                          </Badge>
                          {cert.downloaded_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              Baixado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyVerificationLink(cert.certificate_number)}
                            title="Copiar link de verificação"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/certificado/${cert.certificate_number}`, '_blank')}
                            title="Visualizar certificado"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
