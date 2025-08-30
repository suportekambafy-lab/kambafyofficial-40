import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Image, Type, Palette } from 'lucide-react';

interface MemberAreaCreationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AreaFormData {
  name: string;
  description: string;
  hero_image_url: string;
  hero_title: string;
  hero_description: string;
  logo_url: string;
}

export function MemberAreaCreationForm({ open, onOpenChange, onSuccess }: MemberAreaCreationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState('basics');
  
  const [formData, setFormData] = useState<AreaFormData>({
    name: '',
    description: '',
    hero_image_url: '',
    hero_title: '',
    hero_description: '',
    logo_url: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hero_image_url: '',
      hero_title: '',
      hero_description: '',
      logo_url: ''
    });
    setCurrentStep('basics');
  };

  const handleCreateArea = async () => {
    if (!user) {
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para criar uma área de membros.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Erro", 
        description: "Por favor, digite um nome para a área de membros",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      const cleanName = formData.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const timestamp = Date.now();
      const uniqueSlug = `${cleanName}-${timestamp}`;
      const areaUrl = uniqueSlug;
      
      const insertData = {
        name: formData.name,
        url: areaUrl,
        description: formData.description || null,
        hero_image_url: formData.hero_image_url || null,
        hero_title: formData.hero_title || null,
        hero_description: formData.hero_description || null,
        logo_url: formData.logo_url || null,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('member_areas')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Área de membros criada com sucesso!"
      });

      resetForm();
      onOpenChange(false);
      onSuccess();

    } catch (error) {
      console.error('Erro ao criar área:', error);
      toast({
        title: "Erro",
        description: `Não foi possível criar a área de membros: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Criar Nova Área de Membros</DialogTitle>
          <DialogDescription>
            Configure sua área exclusiva para membros em alguns passos simples
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basics" className="flex items-center gap-2 text-xs">
              <Type className="w-3 h-3" />
              <span className="hidden sm:inline">Informações</span>
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2 text-xs">
              <Image className="w-3 h-3" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 text-xs">
              <Palette className="w-3 h-3" />
              <span className="hidden sm:inline">Conteúdo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area-name">Nome da Área de Membros *</Label>
                  <Input
                    id="area-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Master Drop, Curso Premium..."
                    disabled={isCreating}
                    className="text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="area-description">Descrição (opcional)</Label>
                  <Textarea
                    id="area-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva brevemente o que os membros encontrarão nesta área..."
                    rows={3}
                    disabled={isCreating}
                    className="text-base"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => setCurrentStep('design')} 
                    disabled={!formData.name.trim()}
                    className="flex items-center gap-2"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Design & Identidade Visual</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Personalize a aparência da sua área (opcional)
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <ImageUploader
                      label="Logo da Área"
                      value={formData.logo_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url || '' }))}
                      bucket="member-area-assets"
                      folder={user?.id || 'anonymous'}
                      aspectRatio="1/1"
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Logo que aparecerá na página de login
                    </p>
                  </div>

                  <div className="space-y-2">
                    <ImageUploader
                      label="Imagem de Capa"
                      value={formData.hero_image_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, hero_image_url: url || '' }))}
                      bucket="member-area-assets"
                      folder={user?.id || 'anonymous'}
                      aspectRatio="16/9"
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Grande imagem de capa no topo da área
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('basics')}
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep('content')}
                    className="flex items-center gap-2"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conteúdo da Capa</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Personalize os textos da seção principal (opcional)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-title">Título Principal</Label>
                  <Input
                    id="hero-title"
                    value={formData.hero_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                    placeholder="Ex: Bem-vindo ao Master Drop"
                    disabled={isCreating}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se vazio, será usado o nome da área
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hero-description">Descrição da Capa</Label>
                  <Textarea
                    id="hero-description"
                    value={formData.hero_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, hero_description: e.target.value }))}
                    placeholder="A melhor estratégia para atingir seus objetivos..."
                    rows={3}
                    disabled={isCreating}
                    className="text-base"
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('design')}
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleCreateArea}
                    disabled={isCreating || !formData.name.trim()}
                    className="min-w-[120px]"
                  >
                    {isCreating ? 'Criando...' : 'Criar Área'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:hidden">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}