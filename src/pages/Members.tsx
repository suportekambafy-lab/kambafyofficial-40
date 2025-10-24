import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Video, FileText, Users, MoreHorizontal, Edit, Trash2, Eye, Clock, BookOpen, Upload, Minimize2, Search, ChevronDown, ArrowLeft, ExternalLink, EyeOff, GripVertical, Mail, Save, Image, Type, Settings, CalendarIcon, AlertTriangle, Timer, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import VideoUploader from "@/components/VideoUploader";
import StudentsManager from "@/components/StudentsManager";
import CohortsManager from "@/components/members/CohortsManager";
import { MemberAreaSettings } from '@/components/MemberAreaSettings';
import MemberAreaPreview from "@/components/MemberAreaPreview";
import { ImageUploader } from "@/components/ImageUploader";
import { MemberAreaCreationForm } from "@/components/MemberAreaCreationForm";
import { MemberAreaOffersManager } from "@/components/MemberAreaOffersManager";
import { useNavigate } from "react-router-dom";
import type { Lesson, Module, MemberArea, ComplementaryLink, LessonMaterial } from "@/types/memberArea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';
import { LessonLinksManager } from '@/components/LessonLinksManager';
import { LessonMaterialsManager } from '@/components/LessonMaterialsManager';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  status: string;
  type: string;
  member_area_id: string;
  created_at: string;
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
  
  // Botão Personalizado
  custom_button_enabled: boolean;
  custom_button_text: string;
  custom_button_url: string;
}
export default function Members() {
  const {
    user,
    session,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<MemberArea | null>(null);
  const [videoUploaderOpen, setVideoUploaderOpen] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [draggedLesson, setDraggedLesson] = useState<Lesson | null>(null);
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<string>('');

  // Estado para personalização da área de membros
  const [isUpdatingArea, setIsUpdatingArea] = useState(false);
  const [customizationTab, setCustomizationTab] = useState('basics');
  const [areaCustomizationData, setAreaCustomizationData] = useState<CustomizationData>({
    name: '',
    description: '',
    hero_image_url: '',
    hero_title: '',
    hero_description: '',
    logo_url: '',
    login_logo_url: '',
    custom_button_enabled: false,
    custom_button_text: '',
    custom_button_url: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    bunny_embed_url: '',
    hls_url: '',
    duration: 0,
    // Duração em segundos
    status: 'draft' as 'draft' | 'published' | 'archived',
    module_id: 'none',
    complementary_links: [] as ComplementaryLink[],
    lesson_materials: [] as LessonMaterial[],
    is_scheduled: false,
    scheduled_at: null as Date | null
  });
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    cover_image_url: '',
    cover_orientation: 'horizontal' as 'horizontal' | 'vertical',
    coming_soon: false,
    cohort_access: 'all' as 'all' | 'specific',
    cohort_ids: [] as string[],
    coming_soon_access: 'all' as 'all' | 'specific',
    coming_soon_cohort_ids: [] as string[],
    is_paid: false,
    paid_price: '',
    paid_product_id: null as string | null,
    paid_access: 'all' as 'all' | 'specific',
    paid_cohort_ids: [] as string[]
  });
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  useEffect(() => {
    if (!loading && user) {
      // Cache check para member areas
      const cached = sessionStorage.getItem(`member-areas-${user.id}`);
      if (cached) {
        const {
          data,
          timestamp
        } = JSON.parse(cached);
        if (Date.now() - timestamp < 3 * 60 * 1000) {
          // 3 minutos
          setMemberAreas(data);
          return;
        }
      }
      loadData();
    } else if (!loading && !user) {
      setLessons([]);
      setMemberAreas([]);
      setProducts([]);
    }
  }, [user, loading]);
  useEffect(() => {
    if (selectedArea && user) {
      console.log('Selected area changed, loading lessons, modules and products for:', selectedArea.id);
      loadLessons();
      loadModules();
      loadProducts();
      loadCohorts();
      loadUserProducts();
    }
  }, [selectedArea, user]);
  
  const loadCohorts = async () => {
    if (!selectedArea) return;
    
    try {
      const { data, error } = await supabase
        .from('member_area_cohorts')
        .select('*')
        .eq('member_area_id', selectedArea.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCohorts(data || []);
    } catch (error) {
      console.error('Error loading cohorts:', error);
    }
  };

  const loadUserProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, type')
        .eq('user_id', user.id)
        .eq('status', 'Ativo')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setUserProducts(data || []);
    } catch (error) {
      console.error('Error loading user products:', error);
    }
  };

  // Inicializar dados de personalização quando selectedArea mudar
  useEffect(() => {
    if (selectedArea) {
      setAreaCustomizationData({
        name: selectedArea.name || '',
        description: selectedArea.description || '',
        hero_image_url: selectedArea.hero_image_url || '',
        hero_title: selectedArea.hero_title || '',
        hero_description: selectedArea.hero_description || '',
        logo_url: selectedArea.logo_url || '',
        login_logo_url: (selectedArea as any).login_logo_url || '',
        custom_button_enabled: (selectedArea as any).custom_button_enabled || false,
        custom_button_text: (selectedArea as any).custom_button_text || '',
        custom_button_url: (selectedArea as any).custom_button_url || ''
      });
    }
  }, [selectedArea]);

  // Função para atualizar a área de membros
  const handleUpdateArea = async () => {
    if (!selectedArea || !user) return;
    setIsUpdatingArea(true);
    try {
      const updateData: any = {
        name: areaCustomizationData.name,
        description: areaCustomizationData.description,
        hero_image_url: areaCustomizationData.hero_image_url || null,
        hero_title: areaCustomizationData.hero_title || null,
        hero_description: areaCustomizationData.hero_description || null,
        logo_url: areaCustomizationData.logo_url || null,
        custom_button_enabled: areaCustomizationData.custom_button_enabled,
        custom_button_text: areaCustomizationData.custom_button_text || null,
        custom_button_url: areaCustomizationData.custom_button_url || null,
        updated_at: new Date().toISOString()
      };

      // Adicionar campos de personalização se existirem
      if (areaCustomizationData.login_logo_url) updateData.login_logo_url = areaCustomizationData.login_logo_url;
      const {
        error
      } = await supabase.from('member_areas').update(updateData).eq('id', selectedArea.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Personalização atualizada com sucesso!"
      });
      await loadData(); // Recarregar dados para atualizar a UI
    } catch (error: any) {
      console.error('Error updating member area:', error);
      toast({
        title: "Erro",
        description: `Não foi possível atualizar: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingArea(false);
    }
  };

  // Função para atualizar capa de módulo
  const handleUpdateModuleCover = async (moduleId: string, coverUrl: string) => {
    try {
      const {
        error
      } = await supabase.from('modules').update({
        cover_image_url: coverUrl
      }).eq('id', moduleId);
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

  // Função para atualizar orientação de módulo
  const handleUpdateModuleOrientation = async (moduleId: string, orientation: 'horizontal' | 'vertical') => {
    try {
      const {
        error
      } = await supabase.from('modules').update({
        cover_orientation: orientation
      }).eq('id', moduleId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Orientação da capa atualizada!"
      });

      // Recarregar módulos
      loadModules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Não foi possível atualizar a orientação: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  const loadData = async () => {
    if (!user) {
      console.error('loadData called but no user found');
      return;
    }
    console.log('=== LOADING DATA ===');
    console.log('User ID:', user.id);
    try {
      console.log('Fetching member areas...');
      const {
        data: areasData,
        error: areasError
      } = await supabase.from('member_areas').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      console.log('Areas query result:', {
        data: areasData,
        error: areasError
      });
      if (areasError) {
        console.error('Error fetching member areas:', areasError);
        throw areasError;
      }

      // Carregar contagem de estudantes para cada área
      const areasWithCounts = await Promise.all((areasData || []).map(async area => {
        const {
          count
        } = await supabase.from('member_area_students').select('*', {
          count: 'exact'
        }).eq('member_area_id', area.id);
        const {
          count: lessonsCount
        } = await supabase.from('lessons').select('*', {
          count: 'exact'
        }).eq('member_area_id', area.id).eq('status', 'published');
        return {
          ...area,
          students_count: count || 0,
          lessons_count: lessonsCount || 0
        };
      }));
      setMemberAreas(areasWithCounts);

      // Cache por 3 minutos
      sessionStorage.setItem(`member-areas-${user.id}`, JSON.stringify({
        data: areasWithCounts,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error in loadData:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os dados: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };
  const loadModules = async () => {
    if (!user || !selectedArea) {
      console.error('loadModules called but no user or selectedArea found');
      return;
    }
    console.log('=== LOADING MODULES ===');
    console.log('User ID:', user.id);
    console.log('Selected Area ID:', selectedArea.id);
    try {
      const {
        data: modulesData,
        error: modulesError
      } = await supabase.from('modules').select('*').eq('user_id', user.id).eq('member_area_id', selectedArea.id).order('order_number', {
        ascending: true
      });
      console.log('Modules query result:', {
        data: modulesData,
        error: modulesError
      });
      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
        throw modulesError;
      }

      // Carregar contagem de aulas para cada módulo
      const modulesWithCounts = await Promise.all((modulesData || []).map(async module => {
        const {
          count
        } = await supabase.from('lessons').select('*', {
          count: 'exact'
        }).eq('module_id', module.id);
        return {
          ...module,
          lessons_count: count || 0
        };
      }));
      console.log('Setting modules:', modulesWithCounts);
      setModules(modulesWithCounts as Module[]);
    } catch (error) {
      console.error('Error in loadModules:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os módulos: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };
  const loadLessons = async () => {
    if (!user || !selectedArea) {
      console.error('loadLessons called but no user or selectedArea found');
      return;
    }
    console.log('=== LOADING LESSONS ===');
    console.log('User ID:', user.id);
    console.log('Selected Area ID:', selectedArea.id);
    setLoadingLessons(true);
    try {
      const {
        data: lessonsData,
        error: lessonsError
      } = await supabase.from('lessons').select('*').eq('user_id', user.id).eq('member_area_id', selectedArea.id).order('order_number', {
        ascending: true
      });
      console.log('Lessons query result:', {
        data: lessonsData,
        error: lessonsError
      });
      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        throw lessonsError;
      }
      console.log('Setting lessons:', lessonsData);
      const processedLessons = (lessonsData || []).map((lesson: any) => ({
        ...lesson,
        complementary_links: lesson.complementary_links ? typeof lesson.complementary_links === 'string' ? JSON.parse(lesson.complementary_links) : lesson.complementary_links : [],
        lesson_materials: lesson.lesson_materials ? typeof lesson.lesson_materials === 'string' ? JSON.parse(lesson.lesson_materials) : lesson.lesson_materials : []
      })) as Lesson[];
      setLessons(processedLessons);
    } catch (error) {
      console.error('Error in loadLessons:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar as aulas: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setLoadingLessons(false);
    }
  };
  const loadProducts = async () => {
    if (!user || !selectedArea) {
      console.error('loadProducts called but no user or selectedArea found');
      return;
    }
    console.log('=== LOADING PRODUCTS ===');
    console.log('User ID:', user.id);
    console.log('Selected Area ID:', selectedArea.id);
    setLoadingProducts(true);
    try {
      const {
        data: productsData,
        error: productsError
      } = await supabase.from('products').select('*').eq('user_id', user.id).eq('member_area_id', selectedArea.id).eq('type', 'Curso').order('created_at', {
        ascending: false
      });
      console.log('Products query result:', {
        data: productsData,
        error: productsError
      });
      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }
      console.log('Setting products:', productsData);
      setProducts((productsData || []) as Product[]);
    } catch (error) {
      console.error('Error in loadProducts:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os cursos: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };
  const loadAllProducts = async () => {
    if (!user) {
      console.error('loadAllProducts called but no user found');
      return;
    }
    console.log('=== LOADING ALL PRODUCTS ===');
    console.log('User ID:', user.id);
    setLoadingProducts(true);
    try {
      const {
        data: productsData,
        error: productsError
      } = await supabase.from('products').select('*').eq('user_id', user.id).eq('type', 'Curso').order('created_at', {
        ascending: false
      });
      console.log('All products query result:', {
        data: productsData,
        error: productsError
      });
      if (productsError) {
        console.error('Error fetching all products:', productsError);
        throw productsError;
      }
      console.log('Setting all products:', productsData);
      setProducts((productsData || []) as Product[]);
    } catch (error) {
      console.error('Error in loadAllProducts:', error);
      toast({
        title: "Erro",
        description: `Não foi possível carregar os cursos: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };
  const handleSubmitModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const moduleData = {
        title: moduleFormData.title,
        description: moduleFormData.description,
        status: moduleFormData.status,
        cover_image_url: moduleFormData.cover_image_url || null,
        cover_orientation: moduleFormData.cover_orientation,
        coming_soon: moduleFormData.coming_soon,
        cohort_ids: moduleFormData.cohort_access === 'all' ? null : moduleFormData.cohort_ids,
        coming_soon_cohort_ids: moduleFormData.coming_soon_access === 'all' ? null : moduleFormData.coming_soon_cohort_ids,
        is_paid: moduleFormData.is_paid,
        paid_price: moduleFormData.is_paid ? moduleFormData.paid_price : null,
        paid_product_id: moduleFormData.is_paid ? moduleFormData.paid_product_id : null,
        paid_cohort_ids: moduleFormData.is_paid && moduleFormData.paid_access === 'specific' ? moduleFormData.paid_cohort_ids : null,
        user_id: user.id,
        member_area_id: selectedArea?.id,
        order_number: editingModule ? editingModule.order_number : modules.length + 1
      };
      if (editingModule) {
        const {
          error
        } = await supabase.from('modules').update(moduleData).eq('id', editingModule.id);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Módulo atualizado com sucesso"
        });
      } else {
        const {
          error
        } = await supabase.from('modules').insert([moduleData]);
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Módulo criado com sucesso"
        });
      }
      resetModuleForm();
      setModuleDialogOpen(false);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== CREATING LESSON ===');
    console.log('Form data:', formData);
    if (!user) {
      console.error('No user found');
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para criar aulas",
        variant: "destructive"
      });
      return;
    }
    if (!selectedArea) {
      console.error('No selected area');
      toast({
        title: "Erro",
        description: "Selecione uma área de membros primeiro",
        variant: "destructive"
      });
      return;
    }
    if (!formData.title.trim()) {
      console.error('No title provided');
      toast({
        title: "Erro",
        description: "Por favor, digite um título para a aula",
        variant: "destructive"
      });
      return;
    }
    try {
      // Validar e garantir que os arrays são seguros antes de stringify
      const safeLinks = Array.isArray(formData.complementary_links) ? formData.complementary_links : [];
      const safeMaterials = Array.isArray(formData.lesson_materials) ? formData.lesson_materials : [];

      // Validação adicional dos links para segurança
      const validatedLinks = safeLinks.filter(link => link && typeof link.title === 'string' && typeof link.url === 'string' && link.title.trim().length > 0 && link.url.trim().length > 0);
      const lessonData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        video_url: formData.video_url?.trim() || null,
        bunny_embed_url: formData.bunny_embed_url?.trim() || null,
        hls_url: formData.hls_url ? formData.hls_url.trim() : null,
        duration: formData.duration,
        // Already in seconds from form
        status: formData.status,
        user_id: user.id,
        member_area_id: selectedArea.id,
        module_id: formData.module_id && formData.module_id !== 'none' ? formData.module_id : selectedModuleForLesson || null,
        order_number: editingLesson ? editingLesson.order_number : lessons.length + 1,
        complementary_links: JSON.stringify(validatedLinks),
        lesson_materials: JSON.stringify(safeMaterials),
        is_scheduled: formData.is_scheduled,
        scheduled_at: formData.is_scheduled && formData.scheduled_at ? formData.scheduled_at.toISOString() : null
      };
      console.log('🔍 Form data before saving:', {
        form_complementary_links: formData.complementary_links,
        form_lesson_materials: formData.lesson_materials,
        form_complementary_links_length: formData.complementary_links?.length,
        form_lesson_materials_length: formData.lesson_materials?.length,
        validated_links: validatedLinks,
        validated_materials: safeMaterials,
        validated_links_length: validatedLinks.length,
        validated_materials_length: safeMaterials.length
      });
      console.log('🔍 Lesson data to insert/update:', lessonData);
      console.log('🔍 complementary_links JSON:', lessonData.complementary_links);
      console.log('🔍 Lesson data to insert/update:', lessonData);
      if (editingLesson) {
        console.log('Updating lesson:', editingLesson.id);
        console.log('🔄 Update data:', lessonData);
        const {
          data: updatedData,
          error
        } = await supabase.from('lessons').update(lessonData).eq('id', editingLesson.id).select().single();
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        console.log('✅ Updated lesson data:', updatedData);
        toast({
          title: "Sucesso",
          description: "Aula atualizada com sucesso"
        });
      } else {
        console.log('Creating new lesson');
        const {
          data,
          error
        } = await supabase.from('lessons').insert([lessonData]).select().single();
        console.log('Insert lesson result:', {
          data,
          error
        });
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Successfully saved lesson with video_url:', data?.video_url);
        toast({
          title: "Sucesso",
          description: "Aula criada com sucesso"
        });
      }

      // Reset form and close dialog
      resetForm();
      setDialogOpen(false);
      setSelectedModuleForLesson('');

      // Reload data
      await loadLessons();
      await loadModules();
      await loadData();
      console.log('Lesson created/updated successfully');
    } catch (error) {
      console.error('Erro ao salvar aula:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar a aula: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };
  const handleEdit = (lesson: Lesson) => {
    console.log('📝 Editing lesson:', lesson);
    console.log('📝 Lesson complementary_links:', lesson.complementary_links);
    console.log('📝 Lesson lesson_materials:', lesson.lesson_materials);

    // Processar os dados para garantir que sejam arrays válidos
    const processedLinks = lesson.complementary_links ? typeof lesson.complementary_links === 'string' ? JSON.parse(lesson.complementary_links) : lesson.complementary_links : [];
    const processedMaterials = lesson.lesson_materials ? typeof lesson.lesson_materials === 'string' ? JSON.parse(lesson.lesson_materials) : lesson.lesson_materials : [];
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      bunny_embed_url: (lesson as any).bunny_embed_url || '',
      hls_url: (lesson as any).hls_url || '',
      duration: lesson.duration || 0,
      status: lesson.status,
      module_id: lesson.module_id || '',
      complementary_links: processedLinks,
      lesson_materials: processedMaterials,
      is_scheduled: lesson.is_scheduled || false,
      scheduled_at: lesson.scheduled_at ? new Date(lesson.scheduled_at) : null
    });
    console.log('📝 Form data set to:', {
      complementary_links: processedLinks,
      lesson_materials: processedMaterials,
      complementary_links_length: processedLinks.length,
      lesson_materials_length: processedMaterials.length
    });
    setSelectedModuleForLesson(''); // Reset this when editing
    setDialogOpen(true);
  };
  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleFormData({
      title: module.title,
      description: module.description || '',
      status: module.status as 'draft' | 'published' | 'archived',
      cover_image_url: module.cover_image_url || '',
      cover_orientation: (module as any).cover_orientation || 'horizontal',
      coming_soon: module.coming_soon || false,
      cohort_access: (module as any).cohort_ids === null ? 'all' : 'specific',
      cohort_ids: (module as any).cohort_ids || [],
      coming_soon_access: (module as any).coming_soon_cohort_ids === null ? 'all' : 'specific',
      coming_soon_cohort_ids: (module as any).coming_soon_cohort_ids || [],
      is_paid: (module as any).is_paid || false,
      paid_price: (module as any).paid_price || '',
      paid_product_id: (module as any).paid_product_id || null,
      paid_access: (module as any).paid_cohort_ids === null ? 'all' : 'specific',
      paid_cohort_ids: (module as any).paid_cohort_ids || []
    });
    setModuleDialogOpen(true);
  };
  const handleDelete = async (lessonId: string) => {
    if (!confirm('Tem certeza que deseja remover esta aula?')) return;
    try {
      const {
        error
      } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Aula removida com sucesso"
      });
      await loadLessons();
      await loadModules(); // Recarregar para atualizar contadores
      await loadData(); // Recarregar para atualizar contadores
    } catch (error) {
      console.error('Erro ao deletar aula:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a aula",
        variant: "destructive"
      });
    }
  };
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja remover este módulo? Todas as aulas do módulo também serão removidas.')) return;
    try {
      const {
        error
      } = await supabase.from('modules').delete().eq('id', moduleId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Módulo removido com sucesso"
      });
      await loadModules();
      await loadLessons(); // Recarregar aulas também
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o módulo",
        variant: "destructive"
      });
    }
  };
  const handleToggleVisibility = async (lesson: Lesson) => {
    const newStatus = lesson.status === 'published' ? 'draft' : 'published';
    try {
      const {
        error
      } = await supabase.from('lessons').update({
        status: newStatus
      }).eq('id', lesson.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: `Aula ${newStatus === 'published' ? 'publicada' : 'ocultada'} com sucesso`
      });
      await loadLessons();
      await loadData(); // Recarregar para atualizar contadores
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a visibilidade da aula",
        variant: "destructive"
      });
    }
  };
  const handleToggleModuleVisibility = async (module: Module) => {
    const newStatus = module.status === 'published' ? 'draft' : 'published';
    try {
      const {
        error
      } = await supabase.from('modules').update({
        status: newStatus
      }).eq('id', module.id);
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
  const resetForm = () => {
    console.log('Resetting form');
    setFormData({
      title: '',
      description: '',
      video_url: '',
      bunny_embed_url: '',
      hls_url: '',
      duration: 0,
      status: 'draft',
      module_id: 'none',
      // Garantir que nunca seja string vazia
      complementary_links: [],
      lesson_materials: [],
      is_scheduled: false,
      scheduled_at: null
    });
    setEditingLesson(null);
    setSelectedModuleForLesson('');
    console.log('Form reset complete');
  };
  const resetModuleForm = () => {
      setModuleFormData({
        title: '',
        description: '',
        status: 'draft',
        cover_image_url: '',
        cover_orientation: 'horizontal',
        coming_soon: false,
        cohort_access: 'all',
        cohort_ids: [],
        coming_soon_access: 'all',
        coming_soon_cohort_ids: [],
        is_paid: false,
        paid_price: '',
        paid_product_id: null,
        paid_access: 'all',
        paid_cohort_ids: []
      });
      setEditingModule(null);
  };
  const handleVideoUploaded = (videoUrl: string, videoData?: any) => {
    console.log('Video uploaded callback received:', videoUrl, videoData);
    setFormData(prev => {
      const newFormData = {
        ...prev,
        video_url: videoData?.embedUrl || videoUrl,
        bunny_embed_url: videoData?.embedUrl || videoUrl,
        hls_url: videoData?.hlsUrl || null, // null para Vimeo
        duration: videoData?.duration || 0,
      };
      console.log('Updated formData with video:', newFormData);
      return newFormData;
    });
    setVideoUploaderOpen(false);
    
    const durationText = videoData?.duration > 0 
      ? `${Math.floor(videoData.duration / 60)}:${(videoData.duration % 60).toString().padStart(2, '0')}` 
      : 'processando...';
    
    toast({
      title: "Sucesso",
      description: `Vídeo enviado com sucesso! Duração: ${durationText}`
    });
  };
  const handlePreview = () => {
    if (selectedArea) {
      // Navegar para a área de membros real ao invés de abrir preview
      const memberAreaLinks = createMemberAreaLinks();
      const memberAreaUrl = memberAreaLinks.getMemberAreaUrl(selectedArea.id);
      window.open(memberAreaUrl, '_blank');
    }
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
  const getProductStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Inativo':
        return 'bg-red-100 text-red-800';
      case 'Rascunho':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getModuleTitle = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module ? module.title : 'Sem módulo';
  };
  const getLessonsByModule = (moduleId: string) => {
    return lessons.filter(lesson => lesson.module_id === moduleId).sort((a, b) => a.order_number - b.order_number);
  };
  const openLessonDialogForModule = (moduleId: string) => {
    console.log('openLessonDialogForModule called with moduleId:', moduleId);
    console.log('Current state - dialogOpen:', dialogOpen, 'selectedArea:', selectedArea?.id);
    console.log('Current modules:', modules.length);
    if (!selectedArea) {
      console.error('No selected area found!');
      toast({
        title: "Erro",
        description: "Selecione uma área de membros primeiro",
        variant: "destructive"
      });
      return;
    }

    // Resetar primeiro para evitar valores vazios problemáticos
    setFormData({
      title: '',
      description: '',
      video_url: '',
      bunny_embed_url: '',
      hls_url: '',
      duration: 0,
      status: 'draft',
      module_id: moduleId || 'none',
      // Garantir que nunca seja string vazia
      complementary_links: [],
      lesson_materials: [],
      is_scheduled: false,
      scheduled_at: null
    });
    setEditingLesson(null);
    setSelectedModuleForLesson(moduleId);
    setDialogOpen(true);
    console.log('Dialog should be open now');
  };
  const handleDeleteArea = async (areaId: string) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('member_areas').delete().eq('id', areaId).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Área excluída com sucesso"
      });
      setSelectedArea(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a área",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="p-3 md:p-6 flex items-center justify-center">
        <LoadingSpinner text="Carregando..." />
      </div>;
  }
  if (!user) {
    return <div className="p-3 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Acesso Negado</h2>
          <p className="text-muted-foreground mb-3 md:mb-4 text-sm md:text-base">Você precisa estar logado para acessar esta página.</p>
          <Button onClick={() => window.location.href = '/auth'} size="sm" className="text-xs md:text-sm">
            Fazer Login
          </Button>
        </div>
      </div>;
  }
  if (selectedArea) {
    return <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" onClick={() => setSelectedArea(null)} className="p-1 md:p-2">
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">{selectedArea.name}</h1>
              <Button variant="outline" size="sm" className="mt-2 text-xs md:text-sm" onClick={handlePreview}>
                <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Pré-visualizar
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setVideoUploaderOpen(true)} size="sm" className="text-xs md:text-sm">
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Upload de vídeos
            </Button>
            <Button onClick={() => setModuleDialogOpen(true)} size="sm" className="text-xs md:text-sm">
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Adicionar Módulo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs md:text-sm">
                  <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddStudentDialogOpen(true)}>
                  <Users className="h-3 w-3 mr-2" />
                  Adicionar Estudante
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteArea(selectedArea.id)} className="text-destructive">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Excluir Área
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="conteudo" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1">
            <TabsTrigger value="conteudo" className="text-xs md:text-sm py-2">Conteúdo</TabsTrigger>
            <TabsTrigger value="ofertas" className="text-xs md:text-sm py-2">Ofertas</TabsTrigger>
            <TabsTrigger value="turmas" className="text-xs md:text-sm py-2">Turmas</TabsTrigger>
            <TabsTrigger value="cursos" className="text-xs md:text-sm py-2">Cursos</TabsTrigger>
            <TabsTrigger value="alunos" className="text-xs md:text-sm py-2">Alunos</TabsTrigger>
            <TabsTrigger value="configuracoes" className="text-xs md:text-sm py-2">Config</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conteudo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm md:text-base">Conteúdo do Curso</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      {modules.length} módulos
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {lessons.length} aulas
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.length > 0 ? <div className="space-y-4">
                    {modules.sort((a, b) => a.order_number - b.order_number).map((module, index) => <div 
                      key={module.id} 
                      className="border rounded-lg p-3 md:p-4 space-y-3 transition-all hover:shadow-md"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('moduleId', module.id);
                        e.currentTarget.style.opacity = '0.5';
                        console.log('🎯 Drag started for module:', module.title);
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.borderWidth = '2px';
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.borderWidth = '';
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.borderWidth = '';
                        
                        const draggedId = e.dataTransfer.getData('moduleId');
                        console.log('🎯 Drop event - draggedId:', draggedId, 'targetId:', module.id);
                        
                        if (draggedId === module.id) return;

                        const draggedModule = modules.find(m => m.id === draggedId);
                        const targetModule = module;

                        if (!draggedModule) return;

                        console.log('🔄 Reordering:', draggedModule.title, '->', targetModule.title);

                        // Reordenar módulos
                        const reorderedModules = [...modules];
                        const draggedIndex = reorderedModules.findIndex(m => m.id === draggedId);
                        const targetIndex = reorderedModules.findIndex(m => m.id === targetModule.id);

                        reorderedModules.splice(draggedIndex, 1);
                        reorderedModules.splice(targetIndex, 0, draggedModule);

                        // Atualizar ordem no estado
                        const updatedModules = reorderedModules.map((m, idx) => ({
                          ...m,
                          order_number: idx + 1
                        }));

                        setModules(updatedModules);

                        // Atualizar no banco de dados
                        try {
                          for (const mod of updatedModules) {
                            const { error } = await supabase
                              .from('modules')
                              .update({ order_number: mod.order_number })
                              .eq('id', mod.id);

                            if (error) throw error;
                          }

                          toast({
                            title: "Ordem atualizada",
                            description: "A ordem dos módulos foi atualizada com sucesso."
                          });
                        } catch (error) {
                          console.error('Erro ao reordenar módulos:', error);
                          toast({
                            title: "Erro ao reordenar",
                            description: "Não foi possível atualizar a ordem dos módulos.",
                            variant: "destructive"
                          });
                          loadModules(); // Recarregar em caso de erro
                        }
                      }}
                    >
                        {/* Cabeçalho do Módulo */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="cursor-grab active:cursor-grabbing hidden md:block">
                              <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </div>
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-200 rounded"></div>
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2 text-sm md:text-base">
                                {module.title}
                                {module.status !== 'published' && <EyeOff className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />}
                              </div>
                              {module.description && <div className="text-xs md:text-sm text-gray-500 mt-1">
                                  {module.description}
                                </div>}
                              <div className="text-xs md:text-sm text-gray-400 mt-1">
                                {module.lessons_count || 0} aulas
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            <Badge className={getStatusColor(module.status) + " text-xs"}>
                              {getStatusText(module.status)}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={e => {
                        console.log('Button clicked! Event:', e);
                        console.log('Module ID:', module.id);
                        console.log('Module title:', module.title);
                        console.log('About to call openLessonDialogForModule');
                        e.preventDefault();
                        e.stopPropagation();
                        openLessonDialogForModule(module.id);
                      }} className="text-xs md:text-sm">
                              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                              <span className="hidden md:inline">Adicionar Aula</span>
                              <span className="md:hidden">Aula</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditModule(module)}>
                                  <Edit className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleModuleVisibility(module)}>
                                  {module.status === 'published' ? <>
                                      <EyeOff className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                      Ocultar
                                    </> : <>
                                      <Eye className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                      Publicar
                                    </>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteModule(module.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Aulas do Módulo */}
                        <div className="pl-4 md:pl-8 space-y-2">
                          {getLessonsByModule(module.id).map(lesson => <div key={lesson.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-2 md:p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-2 md:gap-3 flex-1">
                                <GripVertical className="w-3 h-3 md:w-4 md:h-4 text-gray-400 cursor-move hidden md:block" />
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-gray-200 rounded flex-shrink-0"></div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium flex items-center gap-2 text-xs md:text-sm">
                                    <span className="truncate">{lesson.title}</span>
                                    {lesson.status !== 'published' && <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                  </div>
                                  {lesson.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                      {lesson.description.substring(0, 60)}
                                      {lesson.description.length > 60 && '...'}
                                    </div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2 justify-end">
                                <Badge className={getStatusColor(lesson.status)} variant="outline">
                                  <span className="text-xs">{getStatusText(lesson.status)}</span>
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleEdit(lesson)}>
                                      <Edit className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleVisibility(lesson)}>
                                      {lesson.status === 'published' ? <>
                                          <EyeOff className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                          Ocultar
                                        </> : <>
                                          <Eye className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                          Publicar
                                        </>}
                                    </DropdownMenuItem>
                                    {lesson.video_url && <DropdownMenuItem onClick={() => window.open(lesson.video_url, '_blank')}>
                                        <Video className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                        Ver Vídeo
                                      </DropdownMenuItem>}
                                    <DropdownMenuItem onClick={() => handleDelete(lesson.id)} className="text-destructive">
                                      <Trash2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                      Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>)}
                          
                          {getLessonsByModule(module.id).length === 0 && <div className="text-center py-4 text-gray-500 text-xs md:text-sm">
                              <Video className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-2" />
                              <p>Nenhuma aula neste módulo ainda</p>
                            </div>}
                        </div>
                      </div>)}
                  </div> : <div className="text-center py-6 md:py-8 text-gray-500">
                    <BookOpen className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" />
                    <p className="text-sm md:text-base">Nenhum módulo criado ainda</p>
                    <Button onClick={() => setModuleDialogOpen(true)} className="mt-4" size="sm">
                      <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Criar primeiro módulo
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ofertas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm md:text-base">🎁 Ofertas na Área de Membros</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemberAreaOffersManager memberAreaId={selectedArea.id} userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turmas" className="space-y-6">
            <CohortsManager memberAreaId={selectedArea.id} memberAreaName={selectedArea.name} />
          </TabsContent>

          <TabsContent value="cursos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm md:text-base">📖 Cursos Conectados</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    {products.length} cursos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                {loadingProducts ? <div className="text-center py-6 md:py-8">
                    <LoadingSpinner size="sm" text="Carregando cursos..." />
                  </div> : products.length > 0 ? <div className="space-y-2 md:space-y-3">
                    {products.map(product => <div key={product.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-200 rounded flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm md:text-base truncate">{product.name}</div>
                            <div className="text-xs md:text-sm text-gray-500 line-clamp-2">
                              {product.description && product.description.substring(0, 80)}
                              {product.description && product.description.length > 80 && '...'}
                            </div>
                            <div className="text-xs md:text-sm text-gray-400">
                              Preço: KZ {product.price}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 justify-end">
                          <Badge className={getProductStatusColor(product.status) + " text-xs"}>
                            {product.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => navigate('/vendedor/produtos')}>
                                <Edit className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                Editar Curso
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate('/vendedor/produtos')}>
                                <ExternalLink className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                                Ver na Lista de Produtos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>)}
                  </div> : <div className="text-center py-6 md:py-8 text-gray-500">
                    <BookOpen className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" />
                    <p className="text-sm md:text-base">Nenhum curso conectado a esta área ainda</p>
                    <Button onClick={() => navigate('/vendedor/produtos')} className="mt-4" size="sm">
                      <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      Criar ou conectar curso
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alunos" className="space-y-6">
            <StudentsManager 
              memberAreaId={selectedArea.id} 
              memberAreaName={selectedArea.name}
              externalDialogOpen={addStudentDialogOpen}
              onExternalDialogChange={setAddStudentDialogOpen}
            />
          </TabsContent>

          <TabsContent value="configuracoes">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2">💎 Personalização Avançada da Área</h3>
                <p className="text-sm text-gray-600">Configure todos os aspectos visuais e funcionais da sua área de membros</p>
              </div>

              <Tabs value={customizationTab} onValueChange={setCustomizationTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                  <TabsTrigger value="basics" className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <span className="hidden sm:inline">Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="branding" className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">Marca</span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Comentários</span>
                  </TabsTrigger>
                  <TabsTrigger value="modules" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Módulos</span>
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
                          <Input id="area-name" value={areaCustomizationData.name} onChange={e => setAreaCustomizationData(prev => ({
                          ...prev,
                          name: e.target.value
                        }))} placeholder="Nome da sua área de membros" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="hero-title">Título da Capa</Label>
                          <Input id="hero-title" value={areaCustomizationData.hero_title} onChange={e => setAreaCustomizationData(prev => ({
                          ...prev,
                          hero_title: e.target.value
                        }))} placeholder="Título que aparece na capa" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="area-description">Descrição</Label>
                        <Textarea id="area-description" value={areaCustomizationData.description} onChange={e => setAreaCustomizationData(prev => ({
                        ...prev,
                        description: e.target.value
                      }))} placeholder="Descrição geral da área" rows={3} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="hero-description">Descrição da Capa</Label>
                        <Textarea id="hero-description" value={areaCustomizationData.hero_description} onChange={e => setAreaCustomizationData(prev => ({
                        ...prev,
                        hero_description: e.target.value
                      }))} placeholder="Texto que aparece na seção hero" rows={2} />
                      </div>
                      
                      {/* Seção do Botão Personalizado */}
                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="custom-button-enabled" className="text-base font-medium">Botão Personalizado</Label>
                            <p className="text-sm text-muted-foreground">Adicione um botão que aparecerá abaixo da descrição na área de membros</p>
                          </div>
                          <Checkbox
                            id="custom-button-enabled"
                            checked={areaCustomizationData.custom_button_enabled}
                            onCheckedChange={(checked) => setAreaCustomizationData(prev => ({
                              ...prev,
                              custom_button_enabled: checked === true
                            }))}
                          />
                        </div>
                        
                        {areaCustomizationData.custom_button_enabled && (
                          <div className="grid gap-4 md:grid-cols-2 bg-muted/50 p-4 rounded-lg">
                            <div className="space-y-2">
                              <Label htmlFor="custom-button-text">Texto do Botão *</Label>
                              <Input 
                                id="custom-button-text" 
                                value={areaCustomizationData.custom_button_text} 
                                onChange={e => setAreaCustomizationData(prev => ({
                                  ...prev,
                                  custom_button_text: e.target.value
                                }))} 
                                placeholder="Ex: Acesse nosso WhatsApp" 
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="custom-button-url">Link do Botão *</Label>
                              <Input 
                                id="custom-button-url" 
                                value={areaCustomizationData.custom_button_url} 
                                onChange={e => setAreaCustomizationData(prev => ({
                                  ...prev,
                                  custom_button_url: e.target.value
                                }))} 
                                placeholder="https://wa.me/244900000000" 
                              />
                            </div>
                          </div>
                        )}
                       </div>
                     </CardContent>
                     <div className="px-6 pb-6">
                       <Button 
                         onClick={handleUpdateArea} 
                         disabled={isUpdatingArea}
                         className="w-full"
                       >
                         {isUpdatingArea ? (
                           <>
                             <Save className="w-4 h-4 mr-2 animate-spin" />
                             Salvando...
                           </>
                         ) : (
                           <>
                             <Save className="w-4 h-4 mr-2" />
                             Salvar Configurações
                           </>
                         )}
                       </Button>
                     </div>
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
                            <ImageUploader label="Logo Principal" value={areaCustomizationData.logo_url} onChange={url => setAreaCustomizationData(prev => ({
                            ...prev,
                            logo_url: url || ''
                          }))} bucket="member-area-assets" folder={`${user?.id}/branding`} aspectRatio="1/1" />
                            <p className="text-xs text-muted-foreground">
                              Logo exibido no cabeçalho da área de membros
                            </p>
                          </div>

                          <div className="space-y-2">
                            <ImageUploader label="Logo de Login" value={areaCustomizationData.login_logo_url} onChange={url => setAreaCustomizationData(prev => ({
                            ...prev,
                            login_logo_url: url || ''
                          }))} bucket="member-area-assets" folder={`${user?.id}/branding`} aspectRatio="1/1" />
                            <p className="text-xs text-muted-foreground">
                              Logo específico para a página de login
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <ImageUploader label="Imagem de Capa Hero" value={areaCustomizationData.hero_image_url} onChange={url => setAreaCustomizationData(prev => ({
                          ...prev,
                          hero_image_url: url || ''
                        }))} bucket="member-area-assets" folder={`${user?.id}/hero`} aspectRatio="16/9" />
                          <p className="text-xs text-muted-foreground">
                            Grande imagem de destaque no topo da área
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comments" className="space-y-6">
                  <MemberAreaSettings memberAreaId={selectedArea.id} />
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
                      {modules.length > 0 ? <div className="grid gap-6 md:grid-cols-2">
                          {modules.map(module => <Card key={module.id} className="border-2">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-base">{module.title}</CardTitle>
                                {module.description && <p className="text-sm text-muted-foreground">{module.description}</p>}
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label>Orientação da Capa</Label>
                                     <Select value={(module as any).cover_orientation || 'horizontal'} onValueChange={(value: 'horizontal' | 'vertical') => handleUpdateModuleOrientation(module.id, value)}>
                                       <SelectTrigger className="w-48">
                                         <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent className="z-[102]" style={{
                                  zIndex: 102
                                }}>
                                         <SelectItem value="horizontal">Horizontal (16:9)</SelectItem>
                                         <SelectItem value="vertical">Vertical (9:16)</SelectItem>
                                       </SelectContent>
                                     </Select>
                                  </div>
                                  
                                  <ImageUploader label="Capa do Módulo" value={module.cover_image_url || ''} onChange={url => handleUpdateModuleCover(module.id, url || '')} bucket="member-area-assets" folder={`${user?.id}/modules`} aspectRatio={(module as any).cover_orientation === 'vertical' ? '9/16' : '16/9'} />
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Esta capa aparece na vitrine dos módulos com a orientação escolhida
                                  </p>
                                </div>
                              </CardContent>
                            </Card>)}
                        </div> : <div className="text-center py-8 text-muted-foreground">
                          <p>Nenhum módulo encontrado</p>
                          <p className="text-sm">Crie módulos primeiro para personalizar suas capas</p>
                        </div>}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">
                    URL de Acesso: {createMemberAreaLinks().getMemberAreaLoginUrl(selectedArea.id)}
                  </div>
                  <Button onClick={handleUpdateArea} disabled={isUpdatingArea} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {isUpdatingArea ? 'Salvando...' : 'Salvar Personalizações'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog para criar/editar módulo */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </DialogTitle>
              <DialogDescription>
                {editingModule ? 'Edite as informações do módulo' : 'Crie um novo módulo para organizar suas aulas'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitModule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="module-title">Título</Label>
                <Input id="module-title" value={moduleFormData.title} onChange={e => setModuleFormData(prev => ({
                ...prev,
                title: e.target.value
              }))} placeholder="Ex: Módulo 1 - Fundamentos" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="module-description">Descrição</Label>
                <Textarea id="module-description" value={moduleFormData.description} onChange={e => setModuleFormData(prev => ({
                ...prev,
                description: e.target.value
              }))} placeholder="Descreva o conteúdo do módulo..." rows={3} />
              </div>
              
              <div className="space-y-2">
                <ImageUploader label="Imagem de Capa do Módulo" value={moduleFormData.cover_image_url} onChange={url => setModuleFormData(prev => ({
                ...prev,
                cover_image_url: url || ''
              }))} bucket="member-area-assets" folder={user?.id || 'anonymous'} aspectRatio={moduleFormData.cover_orientation === 'vertical' ? '9/16' : '16/9'} />
                <p className="text-xs text-muted-foreground">
                  Esta imagem será exibida na vitrine dos módulos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-orientation">Orientação da Capa</Label>
                <Select value={moduleFormData.cover_orientation || 'horizontal'} onValueChange={(value: 'horizontal' | 'vertical') => setModuleFormData(prev => ({
                ...prev,
                cover_orientation: value
              }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a orientação" />
                  </SelectTrigger>
                  <SelectContent className="z-[102]" style={{
                  zIndex: 102
                }}>
                    <SelectItem value="horizontal">Horizontal (16:9) - Estilo Netflix</SelectItem>
                    <SelectItem value="vertical">Vertical (9:16) - Estilo Stories</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Horizontal é ideal para paisagens, vertical para retratos
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="module-status">Status</Label>
                <Select value={moduleFormData.status} onValueChange={(value: any) => setModuleFormData(prev => ({
                ...prev,
                status: value
              }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[102]" style={{
                  zIndex: 102
                }}>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Módulo Em Breve */}
              <div className="flex items-center space-x-3 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <Checkbox id="coming-soon" checked={moduleFormData.coming_soon} onCheckedChange={checked => setModuleFormData(prev => ({
                ...prev,
                coming_soon: checked === true
              }))} />
                <div className="flex-1">
                  <Label htmlFor="coming-soon" className="font-medium text-amber-900 dark:text-amber-100">
                    Módulo Em Breve
                  </Label>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Quando ativado, o módulo será exibido como "Em Breve" para os alunos
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>

              {/* Controle "Em Breve" por Turma */}
              {moduleFormData.coming_soon && (
                <div className="space-y-3 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/10 border-amber-200">
                  <Label>Mostrar "Em Breve" para:</Label>
                  <Select value={moduleFormData.coming_soon_access} onValueChange={(value: 'all' | 'specific') => setModuleFormData(prev => ({
                    ...prev,
                    coming_soon_access: value,
                    coming_soon_cohort_ids: value === 'all' ? [] : prev.coming_soon_cohort_ids
                  }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[102]">
                      <SelectItem value="all">Todas as turmas</SelectItem>
                      <SelectItem value="specific">Turmas específicas</SelectItem>
                    </SelectContent>
                  </Select>

                  {moduleFormData.coming_soon_access === 'specific' && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-sm text-muted-foreground">
                        Selecione as turmas que verão este módulo como "Em Breve":
                      </Label>
                      {cohorts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma turma criada ainda.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {cohorts.map((cohort) => (
                            <div key={cohort.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`coming-soon-cohort-${cohort.id}`}
                                checked={moduleFormData.coming_soon_cohort_ids.includes(cohort.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setModuleFormData(prev => ({
                                      ...prev,
                                      coming_soon_cohort_ids: [...prev.coming_soon_cohort_ids, cohort.id]
                                    }));
                                  } else {
                                    setModuleFormData(prev => ({
                                      ...prev,
                                      coming_soon_cohort_ids: prev.coming_soon_cohort_ids.filter(id => id !== cohort.id)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`coming-soon-cohort-${cohort.id}`} className="font-normal cursor-pointer">
                                {cohort.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {moduleFormData.coming_soon_cohort_ids.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {moduleFormData.coming_soon_cohort_ids.length} turma(s) selecionada(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Módulo Pago */}
              <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/10 border-green-200">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="is-paid" 
                    checked={moduleFormData.is_paid} 
                    onCheckedChange={checked => setModuleFormData(prev => ({
                      ...prev,
                      is_paid: checked === true,
                      paid_price: checked ? prev.paid_price : '',
                      paid_product_id: checked ? prev.paid_product_id : null
                    }))} 
                  />
                  <div className="flex-1">
                    <Label htmlFor="is-paid" className="font-medium text-green-900 dark:text-green-100">
                      Módulo Pago
                    </Label>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Exige pagamento adicional para acesso
                    </p>
                  </div>
                </div>

                {moduleFormData.is_paid && (
                  <div className="space-y-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="paid-price">Preço</Label>
                      <Input 
                        id="paid-price" 
                        value={moduleFormData.paid_price} 
                        onChange={e => setModuleFormData(prev => ({
                          ...prev,
                          paid_price: e.target.value
                        }))}
                        placeholder="Ex: 5000 KZ"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paid-product">Produto de Pagamento (Opcional)</Label>
                      <Select 
                        value={moduleFormData.paid_product_id || 'none'} 
                        onValueChange={(value) => setModuleFormData(prev => ({
                          ...prev,
                          paid_product_id: value === 'none' ? null : value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent className="z-[102]">
                          <SelectItem value="none">Nenhum produto</SelectItem>
                          {userProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.price} ({product.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Vincule este módulo a um produto existente para processar pagamentos
                      </p>
                    </div>

                    <div className="space-y-3 p-3 border rounded-lg bg-green-100 dark:bg-green-950/20">
                      <Label>Requer pagamento para:</Label>
                      <Select 
                        value={moduleFormData.paid_access} 
                        onValueChange={(value: 'all' | 'specific') => setModuleFormData(prev => ({
                          ...prev,
                          paid_access: value,
                          paid_cohort_ids: value === 'all' ? [] : prev.paid_cohort_ids
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[102]">
                          <SelectItem value="all">Todas as turmas</SelectItem>
                          <SelectItem value="specific">Turmas específicas</SelectItem>
                        </SelectContent>
                      </Select>

                      {moduleFormData.paid_access === 'specific' && (
                        <div className="space-y-2 mt-3">
                          <Label className="text-sm text-muted-foreground">
                            Selecione as turmas que precisarão pagar:
                          </Label>
                          {cohorts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma turma criada ainda.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {cohorts.map((cohort) => (
                                <div key={cohort.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`paid-cohort-${cohort.id}`}
                                    checked={moduleFormData.paid_cohort_ids.includes(cohort.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setModuleFormData(prev => ({
                                          ...prev,
                                          paid_cohort_ids: [...prev.paid_cohort_ids, cohort.id]
                                        }));
                                      } else {
                                        setModuleFormData(prev => ({
                                          ...prev,
                                          paid_cohort_ids: prev.paid_cohort_ids.filter(id => id !== cohort.id)
                                        }));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`paid-cohort-${cohort.id}`} className="font-normal cursor-pointer">
                                    {cohort.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {moduleFormData.paid_cohort_ids.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {moduleFormData.paid_cohort_ids.length} turma(s) selecionada(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Seleção de Turmas */}
              <div className="space-y-3 p-4 border rounded-lg">
                <Label>Disponibilidade por Turma</Label>
                <Select value={moduleFormData.cohort_access} onValueChange={(value: 'all' | 'specific') => setModuleFormData(prev => ({
                  ...prev,
                  cohort_access: value,
                  cohort_ids: value === 'all' ? [] : prev.cohort_ids
                }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[102]">
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    <SelectItem value="specific">Turmas específicas</SelectItem>
                  </SelectContent>
                </Select>

                {moduleFormData.cohort_access === 'specific' && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-sm text-muted-foreground">
                      Selecione as turmas que terão acesso a este módulo:
                    </Label>
                    {cohorts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma turma criada ainda. Crie turmas na aba "Turmas".
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {cohorts.map((cohort) => (
                          <div key={cohort.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cohort-${cohort.id}`}
                              checked={moduleFormData.cohort_ids.includes(cohort.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setModuleFormData(prev => ({
                                    ...prev,
                                    cohort_ids: [...prev.cohort_ids, cohort.id]
                                  }));
                                } else {
                                  setModuleFormData(prev => ({
                                    ...prev,
                                    cohort_ids: prev.cohort_ids.filter(id => id !== cohort.id)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`cohort-${cohort.id}`} className="font-normal cursor-pointer">
                              {cohort.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {moduleFormData.cohort_ids.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {moduleFormData.cohort_ids.length} turma(s) selecionada(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingModule ? 'Atualizar' : 'Criar'} Módulo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para criar/editar aula */}
        <Dialog open={dialogOpen} onOpenChange={open => {
        console.log('Dialog open change:', open, 'current dialogOpen state:', dialogOpen);
        console.log('Current selectedArea:', selectedArea?.id, selectedArea?.name);
        console.log('Current selectedModuleForLesson:', selectedModuleForLesson);
        setDialogOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? 'Editar Aula' : 'Nova Aula'}
              </DialogTitle>
              <DialogDescription>
                {editingLesson ? 'Edite as informações da aula' : 'Crie uma nova aula para seu curso'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={formData.title} onChange={e => {
                console.log('Title changed:', e.target.value);
                setFormData(prev => ({
                  ...prev,
                  title: e.target.value
                }));
              }} placeholder="Ex: Introdução ao React" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))} placeholder="Descreva o conteúdo da aula..." rows={3} />
              </div>

              {/* Só mostra o seletor de módulo se não estiver editando e não foi pré-selecionado */}
              {!editingLesson && !selectedModuleForLesson && <div className="space-y-2">
                  <Label htmlFor="module_id">Módulo (opcional)</Label>
                   <Select value={formData.module_id || "none"} onValueChange={value => {
                console.log('Module selected:', value);
                const moduleId = value === "none" ? "" : value;
                setFormData(prev => ({
                  ...prev,
                  module_id: moduleId
                }));
              }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um módulo" />
                    </SelectTrigger>
                     <SelectContent className="z-[102]" style={{
                  zIndex: 102
                }}>
                       <SelectItem value="none">Sem módulo</SelectItem>
                       {modules.filter(m => m.status === 'published').map(module => <SelectItem key={module.id} value={module.id}>
                           {module.title}
                         </SelectItem>)}
                     </SelectContent>
                  </Select>
                </div>}

              {/* Se está editando, mostra em qual módulo está */}
              {editingLesson && editingLesson.module_id && <div className="space-y-2">
                  <Label>Módulo atual</Label>
                  <Input value={getModuleTitle(editingLesson.module_id)} disabled className="bg-gray-100" />
                </div>}
              
              <div className="space-y-2">
                <Label>Vídeo da Aula</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setVideoUploaderOpen(true)} className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.video_url ? 'Alterar Vídeo' : 'Enviar Vídeo'}
                  </Button>
                  {formData.video_url && <Button type="button" variant="ghost" onClick={() => window.open(formData.video_url, '_blank')}>
                      <Video className="h-4 w-4" />
                    </Button>}
                </div>
                {formData.video_url && <p className="text-sm text-gray-500">Vídeo anexado ✓</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (em minutos)</Label>
                <Input 
                  id="duration" 
                  type="number" 
                  min="0" 
                  step="0.1" 
                  value={(formData.duration / 60).toFixed(1)} // Sempre 1 casa decimal
                  onChange={e => {
                    const minutes = parseFloat(e.target.value) || 0;
                    const seconds = Math.round(minutes * 60);
                    setFormData(prev => ({
                      ...prev,
                      duration: seconds
                    }));
                  }} 
                  placeholder="Ex: 15 (minutos)" 
                />
                <p className="text-sm text-muted-foreground">
                  Para vídeos Bunny.net, insira a duração manualmente. Para outros vídeos, será detectado automaticamente.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({
                ...prev,
                status: value
              }))}>
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
               
                 {/* Agendamento da Aula */}
                 <div className="space-y-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                   <div className="flex items-center space-x-3">
                     <Checkbox id="is-scheduled" checked={formData.is_scheduled} onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  is_scheduled: checked === true,
                  scheduled_at: checked === true ? prev.scheduled_at : null
                }))} />
                     <div className="flex-1">
                       <Label htmlFor="is-scheduled" className="font-medium text-blue-900 dark:text-blue-100">
                         Agendar Liberação da Aula
                       </Label>
                       <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                         Defina uma data para liberar automaticamente esta aula
                       </p>
                     </div>
                     <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                   </div>
                   
                   {formData.is_scheduled && <div className="space-y-2">
                       <Label>Data de Liberação</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !formData.scheduled_at && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.scheduled_at ? format(formData.scheduled_at, "dd/MM/yyyy HH:mm") : <span>Selecionar data e hora</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                           <CalendarComponent mode="single" selected={formData.scheduled_at || undefined} onSelect={date => {
                      if (date) {
                        // Manter a hora atual ou definir para meio-dia se não houver
                        const currentTime = formData.scheduled_at || new Date();
                        date.setHours(currentTime.getHours(), currentTime.getMinutes());
                      }
                      setFormData(prev => ({
                        ...prev,
                        scheduled_at: date || null
                      }));
                    }} disabled={date => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                           {formData.scheduled_at && <div className="p-3 border-t">
                               <Label className="text-sm font-medium">Horário</Label>
                               <div className="flex gap-2 mt-2">
                                 <Input type="time" value={formData.scheduled_at ? `${formData.scheduled_at.getHours().toString().padStart(2, '0')}:${formData.scheduled_at.getMinutes().toString().padStart(2, '0')}` : '12:00'} onChange={e => {
                          const [hours, minutes] = e.target.value.split(':');
                          if (formData.scheduled_at) {
                            const newDate = new Date(formData.scheduled_at);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setFormData(prev => ({
                              ...prev,
                              scheduled_at: newDate
                            }));
                          }
                        }} className="w-full" />
                               </div>
                             </div>}
                         </PopoverContent>
                       </Popover>
                       {formData.scheduled_at && <p className="text-xs text-blue-600 dark:text-blue-400">
                           A aula será liberada em: {format(formData.scheduled_at, "dd/MM/yyyy 'às' HH:mm")}
                         </p>}
                     </div>}
                 </div>
                
                 {/* Links Complementares */}
                 <div className="space-y-2">
                   <Label className="text-sm font-medium">Links Complementares da Aula</Label>
                   <LessonLinksManager links={formData.complementary_links || []} onChange={links => {
                console.log('🔗 Links onChange called with:', links);
                console.log('🔗 Links type:', typeof links, 'Array?', Array.isArray(links));

                // Garantir que sempre seja um array válido
                const safeLinks = Array.isArray(links) ? links : [];
                setFormData(prev => {
                  const updated = {
                    ...prev,
                    complementary_links: safeLinks
                  };
                  console.log('🔗 Updated form data complementary_links:', updated.complementary_links);
                  console.log('🔗 Updated form data keys:', Object.keys(updated));
                  return updated;
                });
              }} />
                 </div>
                
                {/* Materiais da Aula */}
                <LessonMaterialsManager materials={formData.lesson_materials || []} onChange={materials => {
              console.log('📁 Materials onChange called with:', materials);
              console.log('📁 Materials type:', typeof materials, 'Array?', Array.isArray(materials));
              setFormData(prev => {
                const updated = {
                  ...prev,
                  lesson_materials: materials
                };
                console.log('📁 Updated form data:', {
                  ...updated,
                  lesson_materials_length: updated.lesson_materials?.length
                });
                return updated;
              });
            }} />
               
               <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                console.log('Cancel clicked');
                setDialogOpen(false);
              }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingLesson ? 'Atualizar' : 'Criar'} Aula
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Componente de pré-visualização */}
        <MemberAreaPreview open={previewOpen} onOpenChange={setPreviewOpen} memberArea={selectedArea} lessons={lessons.filter(l => l.status === 'published')} modules={modules} />

        <VideoUploader open={videoUploaderOpen} onOpenChange={setVideoUploaderOpen} onVideoUploaded={handleVideoUploaded} />
      </div>;
  }
  return <OptimizedPageWrapper>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Área de Membros</h1>
          
          <Tabs defaultValue="areas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md h-auto">
              <TabsTrigger value="areas" className="text-blue-600 text-xs md:text-sm py-2">Áreas de membros</TabsTrigger>
              <TabsTrigger value="cursos" className="text-xs md:text-sm py-2">Cursos</TabsTrigger>
            </TabsList>
          
          <TabsContent value="areas" className="space-y-4 md:space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 md:h-4 md:w-4" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 md:pl-10 text-sm" />
              </div>
              <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full md:w-auto text-xs md:text-sm">
                    Criar área de membros
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <MemberAreaCreationForm open={areaDialogOpen} onOpenChange={setAreaDialogOpen} onSuccess={loadData} />
            </div>

            <Card>
              <CardContent className="p-0">
                {/* Versão móvel - Cards */}
                <div className="block md:hidden">
                  {memberAreas.length > 0 ? <div className="divide-y">
                      {memberAreas.map(area => <div key={area.id} className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setSelectedArea(area)}>
                            <div className="space-y-2">
                              <div className="font-medium text-sm">{area.name}</div>
                              <div className="text-xs text-blue-600 truncate">
                                /login/{area.url}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Alunos:</span>
                                <Badge variant="secondary" className="text-xs">{area.students_count}</Badge>
                              </div>
                            </div>
                        </div>)}
                    </div> : <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">Nenhuma área de membros criada ainda</p>
                    </div>}
                </div>

                {/* Versão desktop - Tabela */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NOME</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>ALUNOS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberAreas.map(area => <TableRow key={area.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedArea(area)}>
                          <TableCell className="font-medium">{area.name}</TableCell>
                          <TableCell className="text-blue-600 underline">/login/{area.url}</TableCell>
                          <TableCell>{area.students_count}</TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                  
                  {memberAreas.length === 0 && <div className="text-center py-8">
                      <p className="text-gray-500">Nenhuma área de membros criada ainda</p>
                    </div>}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex items-center justify-center gap-2 md:gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-blue-800 text-sm md:text-base">
                Aprenda mais sobre a{" "}
                <a href="#" className="underline">área de membros</a>
              </span>
            </div>
          </TabsContent>

          <TabsContent value="cursos" className="space-y-4 md:space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
              <h2 className="text-lg md:text-xl font-semibold text-foreground">Meus Cursos</h2>
              <Button onClick={() => navigate('/vendedor/produtos')} size="sm" className="text-xs md:text-sm">
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Criar Curso
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {loadingProducts ? <div className="text-center py-6 md:py-8">
                    <LoadingSpinner size="sm" text="Carregando cursos..." />
                  </div> : <>
                    {/* Versão móvel - Cards */}
                    <div className="block md:hidden">
                      {products.length > 0 ? <div className="divide-y">
                          {products.map(product => <div key={product.id} className="p-4 space-y-3">
                              <div>
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {product.description && product.description.substring(0, 50)}
                                  {product.description && product.description.length > 50 && '...'}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">KZ {product.price}</span>
                                  <Badge className={getProductStatusColor(product.status) + " text-xs"}>
                                    {product.status}
                                  </Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => navigate('/vendedor/produtos')} className="text-xs">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Editar
                                </Button>
                              </div>
                            </div>)}
                        </div> : <div className="text-center py-8">
                          <BookOpen className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-500 text-sm">Nenhum curso criado ainda</p>
                          <Button onClick={() => navigate('/vendedor/produtos')} className="mt-4" size="sm">
                            <Plus className="h-3 w-3 mr-2" />
                            Criar primeiro curso
                          </Button>
                        </div>}
                    </div>

                    {/* Versão desktop - Tabela */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>NOME</TableHead>
                            <TableHead>PREÇO</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>AÇÕES</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.length > 0 ? products.map(product => <TableRow key={product.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {product.description && product.description.substring(0, 50)}
                                      {product.description && product.description.length > 50 && '...'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>KZ {product.price}</TableCell>
                                <TableCell>
                                  <Badge className={getProductStatusColor(product.status)}>
                                    {product.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" onClick={() => navigate('/vendedor/produtos')}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </Button>
                                </TableCell>
                              </TableRow>) : <TableRow>
                              <TableCell colSpan={4} className="text-center py-8">
                                <BookOpen className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-500">Nenhum curso criado ainda</p>
                                <Button onClick={() => navigate('/vendedor/produtos')} className="mt-4">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Criar primeiro curso
                                </Button>
                              </TableCell>
                            </TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </>}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
            </div>
          </div>
        </OptimizedPageWrapper>;
}