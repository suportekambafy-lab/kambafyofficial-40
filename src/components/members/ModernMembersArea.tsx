import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Play, BookOpen, LogOut, Clock, Users, Star, Search, Filter, GraduationCap, Trophy, Target, CheckCircle2, PlayCircle, MoreVertical, ArrowLeft, Menu, X, Lock, AlertCircle, ExternalLink, Download, FileText, Timer } from 'lucide-react';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModernMembersAuth } from './ModernMembersAuth';
import { ModernLessonViewer } from './ModernLessonViewer';
import { ContinueWatching } from './ContinueWatching';
import { MemberAreaSlideMenu } from '../MemberAreaSlideMenu';
import { LessonComments } from './LessonComments';
import { MemberAreaOffers } from './MemberAreaOffers';
import { ModulePaymentModal } from './ModulePaymentModal';
import { ModernErrorBoundary } from '@/components/modern/ModernErrorBoundary';
import { MemberNotificationBell } from './MemberNotificationBell';
import { Lesson, Module } from '@/types/memberArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemberLessonProgress } from '@/hooks/useMemberLessonProgress';
import { NetflixMembersHome, NetflixLessonViewer } from './netflix';

// Função para detectar e atualizar duração do vídeo automaticamente
const detectAndUpdateVideoDuration = async (lesson: Lesson) => {
  return new Promise<void>(resolve => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = async () => {
      const durationInSeconds = Math.round(video.duration);
      console.log(`🎬 Duração detectada para "${lesson.title}": ${durationInSeconds}s`);
      if (durationInSeconds > 0) {
        try {
          const {
            error
          } = await supabase.from('lessons').update({
            duration: durationInSeconds
          }).eq('id', lesson.id);
          if (error) {
            console.error('❌ Erro ao atualizar duração:', error);
          } else {
            console.log(`✅ Duração atualizada no banco: ${lesson.title}`);
          }
        } catch (err) {
          console.error('❌ Erro na atualização:', err);
        }
      }
      resolve();
    };
    video.onerror = () => {
      console.log(`❌ Erro ao carregar vídeo: ${lesson.title}`);
      resolve();
    };

    // Pular vídeos do Vimeo e Bunny.net embed (não podem ser carregados como <video>)
    if (lesson.video_url && 
        !lesson.video_url.includes('mediadelivery.net/embed') &&
        !lesson.video_url.includes('player.vimeo.com') &&
        !lesson.video_url.includes('vimeo.com')) {
      video.src = lesson.video_url;
    } else {
      console.log(`⚠️ Vídeo embed detectado (${lesson.title}) - duração já deve estar salva`);
      resolve();
    }
  });
};
interface ModernMembersAreaProps {
  memberAreaId?: string;
  isEmbeddedInApp?: boolean;
}

export default function ModernMembersArea({ memberAreaId: propMemberAreaId, isEmbeddedInApp = false }: ModernMembersAreaProps = {}) {
  const navigate = useNavigate();
  const {
    id: urlMemberAreaId
  } = useParams();
  
  // Usar prop se fornecido, senão usar da URL
  const memberAreaId = propMemberAreaId || urlMemberAreaId;
  const {
    user,
    session,
    memberArea,
    isAuthenticated,
    logout,
    checkMemberAccess,
    isLoading: authLoading
  } = useModernMembersAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [studentCohortId, setStudentCohortId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [modulesWithAccess, setModulesWithAccess] = useState<Set<string>>(new Set());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [moduleForPayment, setModuleForPayment] = useState<Module | null>(null);
  // Estado para dados da área quando acesso é verificado
  const [verifiedMemberArea, setVerifiedMemberArea] = useState<any>(null);
  const [userProfileAvatar, setUserProfileAvatar] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Obter dados da área de membros (autenticada ou verificada)
  const currentMemberArea = memberArea || verifiedMemberArea;

  // Hook de progresso das aulas
  const {
    lessonProgress,
    updateVideoProgress,
    getCourseProgress,
    getModuleProgress,
    getModuleStats,
    isLoadingProgress
  } = useMemberLessonProgress(memberAreaId || '', user?.email);

  console.log('🎬 ModernMembersArea - Progress Hook State:', {
    memberAreaId,
    userEmail: user?.email,
    hasUser: !!user,
    hasUserEmail: !!user?.email,
    lessonProgressCount: Object.keys(lessonProgress).length,
    isLoadingProgress,
    lessonProgress: Object.keys(lessonProgress).length > 0 ? lessonProgress : 'EMPTY'
  });
  console.log('🎬 ModernMembersArea render:', {
    memberAreaId,
    isAuthenticated,
    userExists: !!user,
    memberAreaExists: !!memberArea,
    verifiedMemberAreaExists: !!verifiedMemberArea,
    currentMemberAreaExists: !!currentMemberArea,
    authLoading,
    lessonsCount: lessons.length,
    modulesCount: modules.length
  });

  // Buscar avatar do perfil do usuário e email do dono
  useEffect(() => {
    const fetchUserAvatarAndOwner = async () => {
      const userEmail = user?.email;
      
      // Buscar email do dono da área
      if (memberAreaId && !ownerEmail) {
        const { data: memberAreaData } = await supabase
          .from('member_areas')
          .select('user_id')
          .eq('id', memberAreaId)
          .single();
        
        if (memberAreaData?.user_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', memberAreaData.user_id)
            .single();
          
          if (ownerProfile?.email) {
            setOwnerEmail(ownerProfile.email.toLowerCase().trim());
          }
        }
      }
      
      if (!userEmail) return;
      
      // Se já tem avatar do OAuth, não precisa buscar
      if (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) return;
      
      // Tentar buscar avatar usando ilike para ser case-insensitive
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .ilike('email', userEmail.toLowerCase().trim())
        .maybeSingle();
      
      console.log('👤 Avatar fetch result:', { email: userEmail, profile });
      
      if (profile?.avatar_url) {
        setUserProfileAvatar(profile.avatar_url);
      }
    };
    
    fetchUserAvatarAndOwner();
  }, [user?.email, user?.user_metadata?.avatar_url, user?.user_metadata?.picture, memberAreaId, ownerEmail]);

  // REMOVER verificação de acesso automática - apenas carregar se há dados necessários
  // useEffect(() => {
  //   const urlParams = new URLSearchParams(window.location.search);
  //   const isVerified = urlParams.get('verified') === 'true';
  //   
  //   // Só verificar acesso se for autenticação normal (não verificada)
  //   if (!authLoading && isAuthenticated && user && memberAreaId && !memberArea && !isVerified) {
  //     console.log('🔑 Verificando acesso à área de membros...');
  //     checkMemberAccess(memberAreaId).then(hasAccess => {
  //       if (!hasAccess) {
  //         toast.error('Acesso negado', {
  //           description: 'Você não tem acesso a esta área de membros.'
  //         });
  //         window.location.href = '/';
  //       }
  //     });
  //   }
  // }, [authLoading, isAuthenticated, user, memberAreaId, memberArea, checkMemberAccess]);

  // Verificar query params para acesso direto verificado ou redirecionar para login se necessário
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get('verified') === 'true';
    const emailParam = urlParams.get('email');
    
    // ✅ CRÍTICO: Se tem verified=true na URL OU está embutido no app, NUNCA redirecionar
    // Esperar o ModernMembersAuth processar e criar a sessão virtual
    if ((isVerified && emailParam) || isEmbeddedInApp) {
      console.log('🔑 Acesso verificado via query params ou app embutido - aguardando criação de sessão');
      return; // Não fazer NADA, deixar o auth processar
    }
    
    // Só redirecionar se NÃO for acesso verificado E não estiver autenticado E não estiver embutido no app
    if (!authLoading && !isAuthenticated) {
      console.log('🔄 ModernMembersArea: Navegando para login - não autenticado e sem verificação', {
        authLoading,
        isAuthenticated,
        isVerified,
        emailParam,
        hasSession: !!session
      });
      
      // Só navegar se não estiver embutido no app
      if (!isEmbeddedInApp) {
        navigate(`/login/${memberAreaId}`);
      }
      return;
    }
    
    console.log('ℹ️ ModernMembersArea: Usuário autenticado, carregando área');
  }, [authLoading, isAuthenticated, memberAreaId, isEmbeddedInApp, navigate]);

  // Carregar conteúdo da área independente de loading - sempre mostrar o que tem
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get('verified') === 'true';
    const emailParam = urlParams.get('email');
    
    // Permitir carregamento sempre que tiver memberAreaId
    if (!memberAreaId) {
      console.log('ℹ️ ModernMembersArea: Sem memberAreaId...');
      return;
    }
    
    console.log('📥 ModernMembersArea: Carregando conteúdo...');
    const loadContent = async () => {
      try {
        // NÃO usar setIsLoading - nunca mostrar loading

        // Buscar turma do aluno se estiver autenticado
        console.log('🔍 INÍCIO - Buscando turma do aluno:', {
          hasSession: !!session,
          hasEmail: !!session?.user?.email,
          email: session?.user?.email,
          memberAreaId
        });
        
        if (session?.user?.email) {
          const normalizedEmail = session.user.email.toLowerCase().trim();
          console.log('📧 Email normalizado:', normalizedEmail);
          
          const { data: studentData, error } = await supabase
            .from('member_area_students')
            .select('cohort_id')
            .eq('member_area_id', memberAreaId)
            .ilike('student_email', normalizedEmail)
            .maybeSingle();
          
          console.log('👥 RESULTADO - Dados do aluno:', {
            studentData,
            error,
            cohortId: studentData?.cohort_id
          });
          
          if (studentData?.cohort_id) {
            console.log('✅ TURMA ENCONTRADA:', studentData.cohort_id);
            setStudentCohortId(studentData.cohort_id);
          } else {
            console.log('⚠️ ALUNO SEM TURMA ESPECÍFICA');
            setStudentCohortId(null);
          }
        } else {
          console.log('❌ SEM SESSION/EMAIL - não buscar turma');
        }

        // Carregar lessons usando função que bypassa RLS de forma segura
        // Usar email do session, da URL ou um email genérico para carregar as aulas
        const studentEmail = session?.user?.email || emailParam || '';
        console.log('📚 Buscando aulas para:', { studentEmail, memberAreaId });
        
        // ✅ Se não tem email ainda, usar query direta ao invés de RPC
        // Isso permite carregar as aulas mesmo sem autenticação completa
        let lessonsData = null;
        let lessonsError = null;
        
        if (studentEmail && studentEmail.trim() !== '') {
          // Com email, usar RPC normal
          const result = await supabase
            .rpc('get_lessons_for_student', {
              p_student_email: studentEmail.toLowerCase().trim(),
              p_member_area_id: memberAreaId
            });
          lessonsData = result.data;
          lessonsError = result.error;
        } else {
          // Sem email ainda, buscar aulas diretamente (vai funcionar se RLS permitir)
          console.log('⚠️ Email vazio - tentando buscar aulas diretamente');
          const result = await supabase
            .from('lessons')
            .select('*')
            .eq('member_area_id', memberAreaId)
            .eq('status', 'published')
            .order('order_number');
          lessonsData = result.data;
          lessonsError = result.error;
        }
          
        if (!lessonsError && lessonsData) {
          console.log('✅ ModernMembersArea: Lessons carregadas:', lessonsData.length);

          // Processar dados das lessons para converter JSON para os tipos corretos
          const processedLessons = lessonsData.map((lesson: any) => ({
            ...lesson,
            complementary_links: lesson.complementary_links ? 
              typeof lesson.complementary_links === 'string' ? 
                JSON.parse(lesson.complementary_links) : lesson.complementary_links : [],
            lesson_materials: lesson.lesson_materials ? 
              typeof lesson.lesson_materials === 'string' ? 
                JSON.parse(lesson.lesson_materials) : lesson.lesson_materials : []
          }));

          // Auto-detectar duração de vídeos que têm duration = 0
          processedLessons.forEach(async lesson => {
            if (lesson.duration === 0 && (lesson.video_url || lesson.bunny_embed_url)) {
              console.log('🔍 Detectando duração para:', lesson.title);
              await detectAndUpdateVideoDuration(lesson as Lesson);
            }
          });
          setLessons(processedLessons as Lesson[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar lessons:', lessonsError);
        }

        // Carregar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');
          
        if (!modulesError && modulesData) {
          console.log('✅ ModernMembersArea: Módulos carregados:', modulesData.length);
          setModules(modulesData as Module[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar módulos:', modulesError);
        }

        // ✅ Carregar acessos individuais de módulos
        await loadModulesWithAccess();

        // Sempre carregar dados da área de membros
        const { data: memberAreaData, error: memberAreaError } = await supabase
          .from('member_areas')
          .select('*')
          .eq('id', memberAreaId)
          .single();
          
        if (!memberAreaError && memberAreaData) {
          console.log('✅ ModernMembersArea: Dados da área carregados');
          setVerifiedMemberArea(memberAreaData);
        }
        
      } catch (error) {
        console.error('❌ ModernMembersArea: Erro inesperado:', error);
      }
      // NÃO fazer setIsLoading(false) - nunca usar loading
    };
    loadContent();
  }, [memberAreaId, session]); // Adicionar session como dependência

  // Esconder sidebar automaticamente no mobile quando aula for selecionada
  useEffect(() => {
    if (selectedLesson && isMobile) {
      setSidebarVisible(false);
    } else if (!selectedLesson) {
      setSidebarVisible(true);
    }
  }, [selectedLesson, isMobile]);
  const handleLogout = () => {
    logout();
    
    // Se está embutido no app, não navegar - o app vai lidar com isso
    if (!isEmbeddedInApp) {
      // Navegar para login da área de membros
      console.log('🔄 Logout: Navegando para login da área:', memberAreaId);
      navigate(`/login/${memberAreaId}`);
    } else {
      console.log('🔄 Logout: Modo app - não navegar');
    }
  };
  const handleLessonClick = async (lesson: Lesson) => {
    if (!isLessonAccessible(lesson)) {
      if (lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date()) {
        toast.error("Aula agendada", {
          description: `Esta aula será liberada em ${new Date(lesson.scheduled_at).toLocaleString()}`
        });
      } else {
        toast.error("Aula não disponível", {
          description: "Esta aula ainda não está liberada"
        });
      }
      return;
    }
    
    // ✅ Verificar se a aula pertence a um módulo pago
    if (lesson.module_id) {
      const module = modules.find(m => m.id === lesson.module_id);
      if (module) {
        const { hasAccess } = await checkModuleAccessibility(module);
        const isPaid = isModulePaidForStudent(module);
        
        // Se é pago e não tem acesso, abrir modal de pagamento
        if (isPaid && !hasAccess) {
          console.log('💰 [handleLessonClick] Aula pertence a módulo pago - abrindo modal');
          setModuleForPayment(module);
          setPaymentModalOpen(true);
          return;
        }
      }
    }
    
    setSelectedLesson(lesson);
    // Expandir o módulo da aula automaticamente
    if (lesson.module_id) {
      setExpandedModules(prev => new Set(prev).add(lesson.module_id));
    }
  };
  const handleModuleToggle = (moduleId: string) => {
    // Se o módulo clicado já está expandido, fechar ele
    if (expandedModules.has(moduleId)) {
      setExpandedModules(new Set());
    } else {
      // Caso contrário, fechar todos e abrir apenas este
      setExpandedModules(new Set([moduleId]));
    }
  };
  
  const handleModuleClick = async (module: Module) => {
    console.log('👆 [handleModuleClick] CLIQUE DETECTADO!', {
      moduleId: module.id,
      moduleTitle: module.title,
      coming_soon: module.coming_soon,
      is_paid: (module as any).is_paid
    });
    
    // Verificação completa com acesso individual
    const { isComingSoon, hasAccess } = await checkModuleAccessibility(module);
    const isPaid = isModulePaidForStudent(module);
    const isAccessible = module.status === 'published' && hasAccess;
    
    console.log('🎯 [handleModuleClick] Verificações:', {
      isComingSoon,
      isPaid,
      isAccessible,
      hasAccess,
      shouldOpenPayment: isPaid && !hasAccess
    });
    
    // Se é pago e não tem acesso, abrir modal de pagamento
    if (isPaid && !hasAccess) {
      console.log('💰 [handleModuleClick] ABRINDO MODAL DE PAGAMENTO', {
        module: module.title,
        paid_price: (module as any).paid_price
      });
      setModuleForPayment(module);
      setPaymentModalOpen(true);
      console.log('✅ Estados atualizados - Modal deve abrir agora');
      return;
    }

    // Verificar se está em breve (mas não é pago ou já tem acesso)
    if (isComingSoon && !hasAccess) {
      console.log('🚫 [handleModuleClick] Bloqueado: Em breve');
      toast.info("Módulo em breve", {
        description: "Este módulo estará disponível em breve"
      });
      return;
    }

    // Módulo acessível
    if (!isAccessible) {
      console.log('🚫 [handleModuleClick] Módulo não acessível');
      toast.error("Módulo indisponível", {
        description: "Este módulo não está disponível no momento"
      });
      return;
    }

    console.log('✅ [handleModuleClick] Módulo acessível - selecionando:', module.title);
    setSelectedModule(module);
  };

  const handlePaymentSuccess = () => {
    console.log('✅ [handlePaymentSuccess] Pagamento bem-sucedido - atualizando dados');
    // ✅ Recarregar dados via WebSocket (sem reload da página)
    setSelectedModule(null);
    // Os dados serão atualizados automaticamente via realtime subscription
  };
  const handleBackToModules = () => {
    setSelectedModule(null);
  };
  const handleNavigateLesson = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
    }
  };

  // Funções para verificar acessibilidade
  const isLessonAccessible = (lesson: Lesson) => {
    if (lesson.status !== 'published') return false;
    // Para aulas agendadas, consideramos "acessível" para permitir abertura mas não reprodução
    return true;
  };

  // Função para verificar se o conteúdo da aula pode ser reproduzido
  const isLessonContentAccessible = (lesson: Lesson) => {
    if (lesson.status !== 'published') return false;
    if (lesson.is_scheduled && lesson.scheduled_at) {
      return new Date(lesson.scheduled_at) <= new Date();
    }
    return true;
  };
  const isModuleAccessible = (module: Module) => {
    return module.status === 'published' && !isModuleComingSoonForStudent(module);
  };

  // ✅ Verificar se aluno tem acesso individual ao módulo (async)
  const hasIndividualModuleAccess = async (moduleId: string, studentEmail: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('module_student_access')
      .select('id')
      .eq('module_id', moduleId)
      .ilike('student_email', studentEmail.toLowerCase().trim())
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erro ao verificar acesso individual:', error);
      return false;
    }
    
    return !!data;
  };

  // ✅ Carregar módulos com acesso individual do aluno
  const loadModulesWithAccess = async () => {
    const studentEmail = (session as any)?.student_email || user?.email;
    console.log('🔍 [loadModulesWithAccess] Carregando acessos para:', studentEmail);
    
    if (!studentEmail) {
      console.log('⚠️ [loadModulesWithAccess] Sem email de aluno');
      return;
    }

    const { data, error } = await supabase
      .from('module_student_access')
      .select('module_id')
      .ilike('student_email', studentEmail.toLowerCase().trim());
    
    if (error) {
      console.error('❌ [loadModulesWithAccess] Erro ao carregar acessos:', error);
      return;
    }

    const moduleIds = new Set(data?.map(d => d.module_id) || []);
    console.log('✅ [loadModulesWithAccess] Módulos com acesso individual:', {
      studentEmail,
      totalAcessos: moduleIds.size,
      moduleIds: Array.from(moduleIds)
    });
    setModulesWithAccess(moduleIds);
  };

  // Verifica se o módulo está "em breve" para a turma do aluno (versão síncrona para render)
  const isModuleComingSoonForStudent = (module: Module): boolean => {
    console.log('🔍 [isModuleComingSoonForStudent] INICIANDO VERIFICAÇÃO:', {
      moduleId: module.id,
      moduleTitle: module.title,
      coming_soon: module.coming_soon,
      coming_soon_cohort_ids: (module as any).coming_soon_cohort_ids,
      is_paid: (module as any).is_paid,
      studentCohortId,
      sessionCohortId: (session as any)?.cohort_id
    });
    
    // Se módulo não é pago, aplicar lógica normal de coming_soon
    if (!(module as any).is_paid) {
      if (!module.coming_soon) {
        console.log('✅ [isModuleComingSoonForStudent] Módulo não está marcado como em breve');
        return false;
      }
      
      const comingSoonCohortIds = (module as any).coming_soon_cohort_ids;
      
      // ✅ CORREÇÃO: null = todas turmas, array vazio = nenhuma turma
      if (comingSoonCohortIds === null) {
        console.log('✅ [isModuleComingSoonForStudent] Em breve para TODAS as turmas (null)');
        return true;
      }
      
      if (comingSoonCohortIds.length === 0) {
        console.log('✅ [isModuleComingSoonForStudent] NÃO está em breve para ninguém (array vazio)');
        return false;
      }
      
      // Se o aluno não tem turma, não está em breve
      if (!studentCohortId) {
        console.log('⚠️ [isModuleComingSoonForStudent] Aluno sem turma - módulo NÃO está em breve');
        return false;
      }
      
      // Está em breve apenas se a turma do aluno está na lista
      const isComingSoon = comingSoonCohortIds.includes(studentCohortId);
      console.log('🎯 [isModuleComingSoonForStudent] Verificação por turma:', {
        isComingSoon,
        studentCohortId,
        coming_soon_cohort_ids: comingSoonCohortIds
      });
      return isComingSoon;
    }
    
    // ✅ Para módulos pagos, verificar se está marcado como coming_soon PARA A TURMA DO ALUNO
    if (!module.coming_soon) {
      console.log('✅ [isModuleComingSoonForStudent] Módulo pago NÃO está em breve (coming_soon: false)');
      return false;
    }
    
    const comingSoonCohortIds = (module as any).coming_soon_cohort_ids;
    
    console.log('🔍 [isModuleComingSoonForStudent] MÓDULO PAGO - Verificando cohorts:', {
      comingSoonCohortIds,
      studentCohortId,
      isNull: comingSoonCohortIds === null,
      isEmpty: comingSoonCohortIds?.length === 0,
      includes: studentCohortId ? comingSoonCohortIds?.includes(studentCohortId) : 'sem turma'
    });
    
    // ✅ CORREÇÃO: null = todas turmas, array vazio = nenhuma turma
    if (comingSoonCohortIds === null) {
      console.log('✅ [isModuleComingSoonForStudent] Módulo pago em breve para TODAS as turmas (null)');
      return true;
    }
    
    if (comingSoonCohortIds.length === 0) {
      console.log('✅ [isModuleComingSoonForStudent] Módulo pago NÃO está em breve para ninguém (array vazio)');
      return false;
    }
    
    // Se o aluno não tem turma, não está em breve
    if (!studentCohortId) {
      console.log('⚠️ [isModuleComingSoonForStudent] Módulo pago - Aluno sem turma - NÃO está em breve');
      return false;
    }
    
    // Está em breve apenas se a turma do aluno está na lista
    const isComingSoon = comingSoonCohortIds.includes(studentCohortId);
    console.log('🎯 [isModuleComingSoonForStudent] MÓDULO PAGO - RESULTADO FINAL:', {
      isComingSoon,
      studentCohortId,
      coming_soon_cohort_ids: comingSoonCohortIds,
      explicacao: isComingSoon 
        ? '🔴 MÓDULO EM BREVE para esta turma' 
        : '✅ MÓDULO DISPONÍVEL (não está em breve para esta turma)'
    });
    return isComingSoon;
  };

  // Verificação completa com acesso individual (async, usada no click)
  const checkModuleAccessibility = async (module: Module): Promise<{ isComingSoon: boolean; hasAccess: boolean }> => {
    const studentEmail = (session as any)?.student_email || user?.email;
    
    if (!studentEmail) {
      return { isComingSoon: module.coming_soon || false, hasAccess: false };
    }
    
    // ✅ Verificar acesso individual PRIMEIRO
    const hasIndividualAccess = await hasIndividualModuleAccess(module.id, studentEmail);
    if (hasIndividualAccess) {
      console.log('✅ [checkModuleAccessibility] Acesso individual encontrado!');
      return { isComingSoon: false, hasAccess: true };
    }
    
    // ✅ Verificar se o módulo é pago PARA ESTA TURMA
    const isPaidForThisStudent = isModulePaidForStudent(module);
    
    console.log('🔍 [checkModuleAccessibility] Verificação completa:', {
      moduleId: module.id,
      moduleTitle: module.title,
      is_paid: (module as any).is_paid,
      isPaidForThisStudent,
      hasIndividualAccess
    });
    
    // ✅ Se módulo NÃO é pago para esta turma, liberar acesso
    if (!isPaidForThisStudent) {
      console.log('✅ [checkModuleAccessibility] Módulo GRATUITO para esta turma - liberando acesso');
      // Aplicar lógica de coming_soon se necessário
      if (module.coming_soon) {
        const comingSoonCohortIds = (module as any).coming_soon_cohort_ids;
        
        if (comingSoonCohortIds === null) {
          return { isComingSoon: true, hasAccess: false };
        }
        
        if (comingSoonCohortIds && comingSoonCohortIds.length > 0 && studentCohortId) {
          const isComingSoon = comingSoonCohortIds.includes(studentCohortId);
          return { isComingSoon, hasAccess: !isComingSoon };
        }
      }
      
      return { isComingSoon: false, hasAccess: true };
    }
    
    // ✅ Módulo É PAGO para esta turma e NÃO tem acesso individual - bloquear
    console.log('🔒 [checkModuleAccessibility] Módulo PAGO para esta turma sem acesso individual - bloqueando');
    return { isComingSoon: false, hasAccess: false }; // Não é "em breve", é "pago"
  };

  // Verifica se o módulo é pago para a turma do aluno
  const isModulePaidForStudent = (module: Module): boolean => {
    const hasAccess = modulesWithAccess.has(module.id);
    console.log('💰 [isModulePaidForStudent]', {
      moduleId: module.id,
      moduleTitle: module.title,
      is_paid: (module as any).is_paid,
      paid_cohort_ids: (module as any).paid_cohort_ids,
      studentCohortId,
      hasIndividualAccess: hasAccess,
      modulesWithAccessSize: modulesWithAccess.size
    });
    
    const isPaid = (module as any).is_paid;
    if (!isPaid) {
      console.log('✅ [isModulePaidForStudent] Módulo não é pago');
      return false;
    }
    
    const paidCohortIds = (module as any).paid_cohort_ids;
    
    // ✅ CORREÇÃO: Se paid_cohort_ids é null ou vazio, módulo é GRATUITO para todos
    if (!paidCohortIds || paidCohortIds.length === 0) {
      console.log('✅ [isModulePaidForStudent] GRATUITO para TODOS (paid_cohort_ids vazio)');
      return false; // Não é pago para ninguém
    }
    
    // Se o aluno não tem turma, módulo é gratuito para ele
    if (!studentCohortId) {
      console.log('⚠️ [isModulePaidForStudent] Aluno sem turma - módulo GRATUITO');
      return false; // Não é pago para este aluno
    }
    
    // É pago APENAS se a turma do aluno está na lista de turmas pagas
    const isPaidForCohort = paidCohortIds.includes(studentCohortId);
    console.log('🎯 [isModulePaidForStudent] Verificação por turma:', {
      isPaidForCohort,
      studentCohortId,
      paid_cohort_ids: paidCohortIds,
      resultado: isPaidForCohort ? '💰 PAGO para esta turma' : '✅ GRATUITO para esta turma'
    });
    return isPaidForCohort;
  };
  const filteredLessons = lessons.filter(lesson => {
    // Filtrar por módulo se um estiver selecionado
    const matchesModule = !selectedModule || lesson.module_id === selectedModule.id;
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) || lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || filterStatus === 'completed' && lessonProgress[lesson.id]?.completed || filterStatus === 'pending' && !lessonProgress[lesson.id]?.completed;
    return matchesModule && matchesSearch && matchesFilter;
  });

  // Calcular duração total em minutos e progresso real SEMPRE
  const totalDuration = Math.round(lessons.reduce((sum, lesson) => sum + lesson.duration, 0) / 60);
  const completedLessons = lessons.filter(lesson => lessonProgress[lesson.id]?.completed).length;
  const courseProgress = getCourseProgress(lessons.length);
  console.log('⏱️ Estatísticas do curso:', {
    totalDuration: totalDuration + ' minutos',
    totalLessons: lessons.length,
    completedLessons,
    courseProgress: courseProgress + '%'
  });

  console.log('🎨 ModernMembersArea - Renderizando conteúdo:', {
    hasCurrentMemberArea: !!currentMemberArea,
    hasLessons: lessons.length > 0,
    hasModules: modules.length > 0,
    selectedLesson: !!selectedLesson
  });

  // Obter email verificado dos query params
  const urlParams = new URLSearchParams(window.location.search);
  const verifiedEmail = urlParams.get('email');
  
  // Determinar se o usuário atual é o dono da área
  const currentUserEmail = user?.email || (verifiedEmail ? decodeURIComponent(verifiedEmail).toLowerCase().trim() : null);
  const isOwner = currentUserEmail && ownerEmail && currentUserEmail.toLowerCase().trim() === ownerEmail;

  // Se não há aula selecionada, mostrar o layout Netflix
  if (!selectedLesson) {
    return (
      <>
        <NetflixMembersHome
          memberArea={{
            id: memberAreaId || '',
            name: currentMemberArea?.name || '',
            description: currentMemberArea?.description,
            hero_image_url: currentMemberArea?.hero_image_url,
            hero_video_url: (currentMemberArea as any)?.hero_video_url,
            hero_title: (currentMemberArea as any)?.hero_title,
            hero_description: (currentMemberArea as any)?.hero_description,
            logo_url: currentMemberArea?.logo_url,
            primary_color: currentMemberArea?.primary_color,
          }}
          modules={modules}
          lessons={lessons}
          lessonProgress={lessonProgress}
          user={{
            name: user?.user_metadata?.full_name || user?.user_metadata?.name,
            email: user?.email,
            avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || userProfileAvatar || undefined,
          }}
          onLessonSelect={handleLessonClick}
          onLogout={handleLogout}
        />
        
        {/* Ofertas na Área de Membros */}
        {memberAreaId && (
          <div className="bg-[hsl(30_20%_12%)]">
            <MemberAreaOffers memberAreaId={memberAreaId} />
          </div>
        )}
        
        {/* Modal de Pagamento de Módulo */}
        <ModulePaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          module={moduleForPayment}
          memberAreaId={memberAreaId || ''}
          studentEmail={user?.email || verifiedEmail || ''}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </>
    );
  }

  // Layout com aula selecionada - Netflix Style
  return (
    <div className="min-h-screen" style={{ background: 'hsl(30 20% 12%)' }}>
      <NetflixLessonViewer
        lesson={selectedLesson}
        lessons={lessons || []}
        modules={modules || []}
        lessonProgress={lessonProgress || {}}
        memberArea={{
          logo_url: currentMemberArea?.logo_url,
          name: currentMemberArea?.name || '',
        }}
        onNavigateLesson={handleNavigateLesson}
        onClose={() => setSelectedLesson(null)}
        onUpdateProgress={updateVideoProgress || ((lessonId, time, duration) => {
          console.log('🎬 Progress update (fallback):', { lessonId, time, duration });
        })}
      />
      
      {/* Comentários da aula */}
      <div className="px-4 md:px-8 lg:px-16 pb-20">
        <div className="max-w-5xl mx-auto">
          <LessonComments 
            lessonId={selectedLesson.id} 
            studentEmail={user?.email} 
            studentName={user?.email?.split('@')[0]} 
            memberAreaId={memberAreaId}
          />
        </div>
      </div>
      
      {/* Modal de Pagamento de Módulo */}
      <ModulePaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        module={moduleForPayment}
        memberAreaId={memberAreaId || ''}
        studentEmail={user?.email || verifiedEmail || ''}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}