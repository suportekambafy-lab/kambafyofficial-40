import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, EyeOff, GripVertical, BookOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploader } from "@/components/ImageUploader";

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_number: number;
  status: string; // Changed from union type to string to match database
  created_at: string;
  lessons_count?: number;
  cover_image_url?: string | null;
  cohort_ids?: string[] | null;
}

interface Cohort {
  id: string;
  name: string;
  status: string;
}

interface ModulesManagerProps {
  memberAreaId: string;
}

export default function ModulesManager({ memberAreaId }: ModulesManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    cover_image_url: '',
    cohort_access: 'all' as 'all' | 'specific',
    cohort_ids: [] as string[]
  });

  useEffect(() => {
    if (user && memberAreaId) {
      loadModules();
      loadCohorts();
    }
  }, [user, memberAreaId]);

  const loadCohorts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('member_area_cohorts')
        .select('id, name, status')
        .eq('member_area_id', memberAreaId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCohorts(data || []);
    } catch (error) {
      console.error('Error loading cohorts:', error);
    }
  };

  const loadModules = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: modulesData, error } = await supabase
        .from('modules')
        .select('*')
        .eq('user_id', user.id)
        .eq('member_area_id', memberAreaId)
        .order('order_number', { ascending: true });

      if (error) throw error;

      // Carregar contagem de aulas para cada módulo
      const modulesWithCounts = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { count } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', module.id)
            .eq('status', 'published');

          return {
            ...module,
            lessons_count: count || 0
          };
        })
      );

      setModules(modulesWithCounts);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os módulos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
        const moduleData = {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          cover_image_url: formData.cover_image_url,
          cohort_ids: formData.cohort_access === 'all' ? null : formData.cohort_ids,
          user_id: user.id,
          member_area_id: memberAreaId,
          order_number: editingModule ? editingModule.order_number : modules.length + 1
        };

      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', editingModule.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Módulo atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('modules')
          .insert([moduleData]);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Módulo criado com sucesso"
        });
      }

      resetForm();
      setDialogOpen(false);
      await loadModules();
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o módulo",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      description: module.description || '',
      status: module.status as 'draft' | 'published' | 'archived',
      cover_image_url: module.cover_image_url || '',
      cohort_access: module.cohort_ids === null ? 'all' : 'specific',
      cohort_ids: module.cohort_ids || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja remover este módulo? Todas as aulas do módulo também serão removidas.')) return;
    
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Módulo removido com sucesso"
      });
      await loadModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o módulo",
        variant: "destructive"
      });
    }
  };

  const handleToggleVisibility = async (module: Module) => {
    const newStatus = module.status === 'published' ? 'draft' : 'published';
    
    try {
      const { error } = await supabase
        .from('modules')
        .update({ status: newStatus })
        .eq('id', module.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Módulo ${newStatus === 'published' ? 'publicado' : 'ocultado'} com sucesso`
      });
      
      await loadModules();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a visibilidade do módulo",
        variant: "destructive"
      });
    }
  };

  const handleReorderModules = async (draggedId: string, targetId: string) => {
    const draggedIndex = modules.findIndex(m => m.id === draggedId);
    const targetIndex = modules.findIndex(m => m.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newModules = [...modules];
    const [draggedModule] = newModules.splice(draggedIndex, 1);
    newModules.splice(targetIndex, 0, draggedModule);
    
    // Atualizar order_number para todos os módulos
    const updates = newModules.map((module, index) => ({
      id: module.id,
      order_number: index + 1
    }));
    
    try {
      for (const update of updates) {
        await supabase
          .from('modules')
          .update({ order_number: update.order_number })
          .eq('id', update.id);
      }
      
      toast({
        title: "Sucesso",
        description: "Ordem dos módulos atualizada com sucesso"
      });
      
      await loadModules();
    } catch (error) {
      console.error('Error reordering modules:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar os módulos",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'draft',
      cover_image_url: '',
      cohort_access: 'all',
      cohort_ids: []
    });
    setEditingModule(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Publicado';
      case 'draft':
        return 'Rascunho';
      case 'archived':
        return 'Arquivado';
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📚 Módulos do Curso</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {modules.length} módulos
            </Badge>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Módulo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingModule ? 'Edite as informações do módulo' : 'Crie um novo módulo para organizar suas aulas'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Módulo 1 - Fundamentos"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o conteúdo do módulo..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <ImageUploader
                      label="Imagem de Capa do Módulo"
                      value={formData.cover_image_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, cover_image_url: url || '' }))}
                      bucket="member-area-assets"
                      folder={user?.id || 'anonymous'}
                      aspectRatio="16/9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta imagem será exibida na vitrine dos módulos estilo Netflix
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Acesso por Turma</Label>
                    <Select 
                      value={formData.cohort_access} 
                      onValueChange={(value: 'all' | 'specific') => {
                        setFormData(prev => ({ 
                          ...prev, 
                          cohort_access: value,
                          cohort_ids: value === 'all' ? [] : prev.cohort_ids
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as Turmas</SelectItem>
                        <SelectItem value="specific">Turmas Específicas</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Defina quais turmas terão acesso a este módulo
                    </p>
                  </div>

                  {formData.cohort_access === 'specific' && (
                    <div className="space-y-2">
                      <Label>Selecione as Turmas</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                        {cohorts.length > 0 ? (
                          cohorts.map((cohort) => (
                            <div key={cohort.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`cohort-${cohort.id}`}
                                checked={formData.cohort_ids.includes(cohort.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      cohort_ids: [...prev.cohort_ids, cohort.id]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      cohort_ids: prev.cohort_ids.filter(id => id !== cohort.id)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                              <label 
                                htmlFor={`cohort-${cohort.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {cohort.name}
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhuma turma disponível. Crie turmas primeiro.
                          </p>
                        )}
                      </div>
                      {formData.cohort_ids.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formData.cohort_ids.length} turma(s) selecionada(s)
                        </p>
                      )}
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingModule ? 'Atualizar' : 'Criar'} Módulo
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando módulos...</p>
          </div>
        ) : modules.length > 0 ? (
          <div className="space-y-2">
            {modules
              .sort((a, b) => a.order_number - b.order_number)
              .map((module) => (
              <div 
                key={module.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-move"
                draggable
                onDragStart={() => setDraggedModule(module)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedModule && draggedModule.id !== module.id) {
                    handleReorderModules(draggedModule.id, module.id);
                  }
                  setDraggedModule(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <div className="w-4 h-4 bg-blue-200 rounded"></div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {module.title}
                      {module.status !== 'published' && (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {module.description && module.description.substring(0, 100)}
                      {module.description && module.description.length > 100 && '...'}
                    </div>
                    <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <span>{module.lessons_count || 0} aulas</span>
                      {module.cohort_ids === null ? (
                        <Badge variant="outline" className="text-xs">Todas as turmas</Badge>
                      ) : module.cohort_ids.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {module.cohort_ids.length} turma(s)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600">Nenhuma turma</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(module.status)}>
                    {getStatusText(module.status)}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEdit(module)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleVisibility(module)}>
                        {module.status === 'published' ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Publicar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(module.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-8 w-8 mx-auto mb-2" />
            <p>Nenhum módulo criado ainda</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro módulo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
