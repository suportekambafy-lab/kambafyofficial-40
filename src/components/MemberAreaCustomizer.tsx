import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';  
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploader } from '@/components/ImageUploader';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Image, Type, Settings, Save, Eye } from 'lucide-react';
import type { MemberArea, Module } from '@/types/memberArea';

interface MemberAreaCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberArea: MemberArea | null;
  onSuccess: () => void;
}

interface CustomizationData {
  // Área Principal
  name: string;
  description: string;
  hero_image_url: string;
  hero_title: string;
  hero_description: string;
  logo_url: string;
  
  // Logo de Login (separado do logo principal)
  login_logo_url: string;
  
  // Configurações visuais
  primary_color: string;
  accent_color: string;
  background_style: 'dark' | 'light' | 'gradient';
}

export function MemberAreaCustomizer({ open, onOpenChange, memberArea, onSuccess }: MemberAreaCustomizerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentTab, setCurrentTab] = useState('basics');
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  
  console.log('MemberAreaCustomizer render:', { open, memberArea: memberArea?.name, memberId: memberArea?.id });
  
  const [formData, setFormData] = useState<CustomizationData>({
    name: '',
    description: '',
    hero_image_url: '',
    hero_title: '',
    hero_description: '',
    logo_url: '',
    login_logo_url: '',
    primary_color: '#3b82f6',
    accent_color: '#8b5cf6',
    background_style: 'dark'
  });

  useEffect(() => {
    console.log('MemberAreaCustomizer useEffect - props changed:', { 
      open, 
      memberAreaId: memberArea?.id, 
      memberAreaName: memberArea?.name 
    });
  }, [open, memberArea]);

  useEffect(() => {
    if (memberArea && open) {
      setFormData({
        name: memberArea.name || '',
        description: memberArea.description || '',
        hero_image_url: memberArea.hero_image_url || '',
        hero_title: memberArea.hero_title || '',
        hero_description: memberArea.hero_description || '',
        logo_url: memberArea.logo_url || '',
        login_logo_url: (memberArea as any).login_logo_url || '',
        primary_color: (memberArea as any).primary_color || '#3b82f6',
        accent_color: (memberArea as any).accent_color || '#8b5cf6',
        background_style: (memberArea as any).background_style || 'dark'
      });
      loadModules();
    }
  }, [memberArea, open]);

  const loadModules = async () => {
    if (!memberArea) return;
    
    setLoadingModules(true);
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .order('order_number', { ascending: true });

      if (error) throw error;
      setModules((data || []).map(module => ({
        ...module,
        status: module.status as 'draft' | 'published' | 'archived'
      })));
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleUpdateArea = async () => {
    if (!memberArea || !user) return;

    setIsUpdating(true);
    try {
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        hero_image_url: formData.hero_image_url || null,
        hero_title: formData.hero_title || null,
        hero_description: formData.hero_description || null,
        logo_url: formData.logo_url || null,
        updated_at: new Date().toISOString()
      };

      // Adicionar campos de personalização se existirem
      if (formData.login_logo_url) updateData.login_logo_url = formData.login_logo_url;
      if (formData.primary_color) updateData.primary_color = formData.primary_color;
      if (formData.accent_color) updateData.accent_color = formData.accent_color;
      if (formData.background_style) updateData.background_style = formData.background_style;

      const { error } = await supabase
        .from('member_areas')
        .update(updateData)
        .eq('id', memberArea.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Personalização atualizada com sucesso!"
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating member area:', error);
      toast({
        title: "Erro",
        description: `Não foi possível atualizar: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateModuleCover = async (moduleId: string, coverUrl: string) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ cover_image_url: coverUrl })
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Capa do módulo atualizada!"
      });

      loadModules(); // Recarregar módulos
    } catch (error) {
      console.error('Error updating module cover:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a capa do módulo",
        variant: "destructive"
      });
    }
  };

  if (!memberArea) {
    console.log('MemberAreaCustomizer: memberArea is null, not rendering');
    return null;
  }

  console.log('MemberAreaCustomizer: Rendering dialog with open =', open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Personalizar Área de Membros
          </DialogTitle>
          <DialogDescription>
            Configure todos os aspectos visuais da sua área de membros: "{memberArea.name}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Básico</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Marca</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Módulos</span>
            </TabsTrigger>
            <TabsTrigger value="style" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Estilo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="area-name">Nome da Área *</Label>
                    <Input
                      id="area-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da sua área de membros"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="hero-title">Título da Capa</Label>
                    <Input
                      id="hero-title"
                      value={formData.hero_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                      placeholder="Título que aparece na capa"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="area-description">Descrição</Label>
                  <Textarea
                    id="area-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição geral da área"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hero-description">Descrição da Capa</Label>
                  <Textarea
                    id="hero-description"
                    value={formData.hero_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="Texto que aparece na seção hero"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure logos e imagem de capa da sua área
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <ImageUploader
                        label="Logo Principal"
                        value={formData.logo_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url || '' }))}
                        bucket="member-area-assets"
                        folder={`${user?.id}/branding`}
                        aspectRatio="1/1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Logo exibido no cabeçalho da área de membros
                      </p>
                    </div>

                    <div className="space-y-2">
                      <ImageUploader
                        label="Logo de Login"
                        value={formData.login_logo_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, login_logo_url: url || '' }))}
                        bucket="member-area-assets"
                        folder={`${user?.id}/branding`}
                        aspectRatio="1/1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Logo específico para a página de login
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ImageUploader
                      label="Imagem de Capa Hero"
                      value={formData.hero_image_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, hero_image_url: url || '' }))}
                      bucket="member-area-assets"
                      folder={`${user?.id}/hero`}
                      aspectRatio="16/9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Grande imagem de destaque no topo da área
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Capas dos Módulos
                  <Badge variant="secondary">
                    {modules.length} módulos
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Personalize as capas de cada módulo individualmente
                </p>
              </CardHeader>
              <CardContent>
                {loadingModules ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando módulos...</p>
                  </div>
                ) : modules.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {modules.map((module) => (
                      <Card key={module.id} className="border-2">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-base">{module.title}</CardTitle>
                          {module.description && (
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <ImageUploader
                            label="Capa do Módulo"
                            value={module.cover_image_url || ''}
                            onChange={(url) => handleUpdateModuleCover(module.id, url || '')}
                            bucket="member-area-assets"
                            folder={`${user?.id}/modules`}
                            aspectRatio="16/9"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Esta capa aparece na vitrine estilo Netflix
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum módulo encontrado</p>
                    <p className="text-sm">Crie módulos primeiro para personalizar suas capas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="style" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalização Visual</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure cores e estilo visual da área
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                        className="w-12 h-10 p-1 border rounded"
                      />
                      <Input
                        value={formData.accent_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                        placeholder="#8b5cf6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estilo de Fundo</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.background_style === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, background_style: 'dark' }))}
                        className="flex-1"
                      >
                        Escuro
                      </Button>
                      <Button
                        type="button"
                        variant={formData.background_style === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, background_style: 'light' }))}
                        className="flex-1"
                      >
                        Claro
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Preview de Cores</h4>
                  <div className="flex gap-4">
                    <div 
                      className="w-16 h-16 rounded-lg shadow-inner flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      Primária
                    </div>
                    <div 
                      className="w-16 h-16 rounded-lg shadow-inner flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: formData.accent_color }}
                    >
                      Destaque
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implementar preview
                  toast({
                    title: "Preview",
                    description: "Funcionalidade de preview em desenvolvimento"
                  });
                }}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                onClick={handleUpdateArea}
                disabled={isUpdating}
                className="flex items-center gap-2 min-w-[120px]"
              >
                <Save className="w-4 h-4" />
                {isUpdating ? 'Salvando...' : 'Salvar Tudo'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}