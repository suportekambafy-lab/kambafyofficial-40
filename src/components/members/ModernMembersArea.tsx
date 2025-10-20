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
import { Lesson, Module } from '@/types/memberArea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemberLessonProgress } from '@/hooks/useMemberLessonProgress';

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
export default function ModernMembersArea() {
  const navigate = useNavigate();
  const {
    id: memberAreaId
  } = useParams();
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
    
    // ✅ CRÍTICO: Se tem verified=true na URL, NUNCA redirecionar
    // Esperar o ModernMembersAuth processar e criar a sessão virtual
    if (isVerified && emailParam) {
      console.log('🔑 Acesso verificado via query params - aguardando criação de sessão');
      return; // Não fazer NADA, deixar o auth processar
    }
    
    // Só redirecionar se NÃO for acesso verificado E não estiver autenticado
    if (!authLoading && !isAuthenticated) {
      console.log('🔄 ModernMembersArea: Navegando para login - não autenticado e sem verificação', {
        authLoading,
        isAuthenticated,
        isVerified,
        emailParam,
        hasSession: !!session
      });
      navigate(`/login/${memberAreaId}`);
      return;
    }
    
    console.log('ℹ️ ModernMembersArea: Usuário autenticado, carregando área');
  }, [authLoading, isAuthenticated, memberAreaId]);

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
      console.log('🚀 ModernMembersArea: loadContent chamado', {
        memberAreaId,
        isAuthenticated,
        hasSession: !!session,
        sessionEmail: session?.user?.email
      });
      
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

        // Carregar lessons
        console.log('🔍 ModernMembersArea: Buscando aulas...');
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');
          
        console.log('📦 ModernMembersArea: Resposta de aulas:', { 
          count: lessonsData?.length, 
          error: lessonsError,
          lessons: lessonsData
        });
        
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
        console.log('🔍 ModernMembersArea: Buscando módulos...');
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');
          
        console.log('📦 ModernMembersArea: Resposta de módulos:', { 
          count: modulesData?.length, 
          error: modulesError,
          modules: modulesData
        });
        
        if (!modulesError && modulesData) {
          console.log('✅ ModernMembersArea: Módulos carregados:', modulesData.length);
          setModules(modulesData as Module[]);
        } else {
          console.error('❌ ModernMembersArea: Erro ao carregar módulos:', modulesError);
        }

        // ✅ Carregar acessos individuais de módulos - passar email da sessão
        const sessionEmail = session?.user?.email || (session as any)?.student_email || user?.email;
        console.log('🔍 [loadContent] Extraindo email para loadModulesWithAccess:', {
          sessionUserEmail: session?.user?.email,
          sessionStudentEmail: (session as any)?.student_email,
          userEmail: user?.email,
          finalEmail: sessionEmail,
          hasSession: !!session,
          hasUser: !!user
        });
        
        if (sessionEmail) {
          await loadModulesWithAccess(sessionEmail);
        } else {
          console.warn('⚠️ [loadContent] SEM EMAIL - não carregar acessos de módulos');
        }

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
    
    // ✅ Listener para recarregar quando sessão for criada
    console.log('🎧 ModernMembersArea: Configurando listener para member-session-created');
    
    const handleSessionCreated = (event: any) => {
      console.log('🔔 ModernMembersArea: Evento member-session-created recebido:', event.detail);
      console.log('📊 ModernMembersArea: Estado atual:', {
        memberAreaId,
        hasSession: !!session,
        sessionEmail: session?.user?.email,
        eventEmail: event.detail?.email
      });
      
      // Aguardar 500ms para garantir que a sessão foi salva no banco
      setTimeout(() => {
        console.log('🔄 ModernMembersArea: Recarregando conteúdo após criação de sessão');
        loadContent();
      }, 500);
    };
    
    window.addEventListener('member-session-created', handleSessionCreated);
    console.log('✅ ModernMembersArea: Listener registrado');
    
    return () => {
      console.log('🧹 ModernMembersArea: Removendo listener');
      window.removeEventListener('member-session-created', handleSessionCreated);
    };
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
    // Navegar para login da área de membros
    console.log('🔄 Logout: Navegando para login da área:', memberAreaId);
    navigate(`/login/${memberAreaId}`);
  };
  const handleLessonClick = (lesson: Lesson) => {
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
      moduleStatus: module.status,
      isComingSoon,
      isPaid,
      isAccessible,
      hasAccess,
      shouldOpenPayment: isPaid && !hasAccess,
      willBlock: !isAccessible && (isComingSoon || isPaid)
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
  const loadModulesWithAccess = async (studentEmail?: string) => {
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
    
    console.log('🔍 [checkModuleAccessibility] INÍCIO:', {
      moduleId: module.id,
      moduleTitle: module.title,
      sessionStudentEmail: (session as any)?.student_email,
      userEmail: user?.email,
      finalStudentEmail: studentEmail,
      hasSession: !!session,
      hasUser: !!user
    });
    
    if (!studentEmail) {
      console.warn('⚠️ [checkModuleAccessibility] SEM EMAIL - bloqueando acesso');
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

  return <div className="min-h-screen bg-gray-950 dark text-white">
      {/* Menu Slide Lateral */}
      <MemberAreaSlideMenu 
        lessons={lessons} 
        modules={modules} 
        lessonProgress={lessonProgress} 
        getCourseProgress={getCourseProgress} 
        getModuleProgress={getModuleProgress} 
        getModuleStats={getModuleStats} 
        totalDuration={totalDuration} 
        completedLessons={completedLessons} 
        onLessonSelect={setSelectedLesson} 
        onLogout={handleLogout}
        userEmail={user?.email || (verifiedEmail ? decodeURIComponent(verifiedEmail) : undefined)}
        userName={user?.user_metadata?.full_name || user?.user_metadata?.name || (verifiedEmail ? decodeURIComponent(verifiedEmail).split('@')[0] : undefined)}
        userAvatar={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
      />
      
      {/* Hero Section - Ocultar quando aula selecionada */}
      {!selectedLesson && <motion.section className="relative bg-gradient-to-br from-black via-gray-950 to-gray-900 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
          
          {/* Hero Image Background */}
          {currentMemberArea?.hero_image_url && <div className="absolute inset-0 opacity-40">
              <img src={currentMemberArea.hero_image_url} alt={currentMemberArea.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            </div>}
          
          <div className="relative container mx-auto px-4 py-20">
            {/* Header */}
            <motion.div className="flex justify-between items-center mb-8 absolute top-4 left-4 right-4 z-10">
              <div className="flex items-center gap-3">
                
                {currentMemberArea?.logo_url ? <Avatar className="h-12 w-12 ring-2 ring-emerald-400/50">
                    <AvatarImage src={currentMemberArea.logo_url} alt={currentMemberArea.name} />
                    <AvatarFallback className="bg-emerald-600">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </AvatarFallback>
                  </Avatar> : <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>}
                <div className="text-white">
                  <p className="text-sm text-emerald-400">Área de Membros</p>
                  <p className="text-sm text-gray-300">
                    Olá, {(() => {
                      console.log('🎯 ModernMembersArea - Debug name:', {
                        user: user,
                        session: session,
                        userMetadata: user?.user_metadata,
                        sessionUserMetadata: session?.user?.user_metadata,
                        userEmail: user?.email
                      });
                      return user?.user_metadata?.full_name || session?.user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Estudante';
                    })()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Course Hero */}
            <motion.div className="text-center mb-12 mt-20 sm:mt-8">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4">
                <Trophy className="h-3 w-3 mr-1" />
                Curso Premium
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {currentMemberArea?.hero_title || currentMemberArea?.name}
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                {currentMemberArea?.hero_description || currentMemberArea?.description}
              </p>
            </motion.div>
          </div>
        </motion.section>}

      {/* Header fixo quando aula selecionada */}
      {selectedLesson && <motion.header className="bg-black/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 bg-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedLesson(null)} className="text-white hover:text-emerald-400">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                  Aula {lessons.indexOf(selectedLesson) + 1}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-gray-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedLesson.duration > 0 ? `${Math.round(selectedLesson.duration / 60)} min` : 'Duração não definida'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setSidebarVisible(!sidebarVisible)} className="text-white hover:text-emerald-400">
                  {sidebarVisible ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.header>}

      {/* Main Content Area */}
      <div className="bg-black min-h-screen">
        <div className={selectedLesson ? "" : "container mx-auto px-4 py-12"}>
          
          {/* Layout quando aula selecionada */}
          {selectedLesson ? <div className="flex min-h-screen relative w-full max-w-full overflow-x-hidden">
              {/* Overlay para mobile */}
              {isMobile && sidebarVisible && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarVisible(false)} />}
              
              {/* Área do vídeo */}
              <div className="flex-1 p-3 sm:p-6 px-0 py-0 w-full max-w-full min-w-0">
                <motion.div className="w-full max-w-full overflow-x-hidden">
                  <Card className="overflow-hidden mb-4 sm:mb-6 bg-zinc-950 rounded-none border-0 w-full max-w-full">
                    {selectedLesson ? (
                      <ModernErrorBoundary>
                        <ModernLessonViewer 
                          lesson={selectedLesson} 
                          lessons={lessons || []} 
                          lessonProgress={lessonProgress || {}} 
                          onNavigateLesson={handleNavigateLesson} 
                          onClose={() => setSelectedLesson(null)} 
                          onUpdateProgress={updateVideoProgress || ((lessonId, time, duration) => {
                            console.log('🎬 Progress update (fallback):', { lessonId, time, duration });
                          })} 
                        />
                      </ModernErrorBoundary>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        Selecione uma aula para começar
                      </div>
                    )}
                  </Card>
                  
                  {/* Info da aula */}
                  
                  
                  {/* Seção de comentários */}
                  <div className="w-full max-w-full overflow-x-hidden">
                    <LessonComments 
                      lessonId={selectedLesson.id} 
                      studentEmail={user?.email} 
                      studentName={user?.email?.split('@')[0]} 
                      memberAreaId={memberAreaId}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Sidebar com módulos e aulas - condicional */}
              {sidebarVisible && <div className={`bg-gray-950 border-l border-gray-800 p-4 sm:p-6 overflow-y-auto ${isMobile ? 'fixed top-0 right-0 h-full w-80 z-50 shadow-2xl' : 'w-96'}`}>
                  {isMobile && <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                      <h3 className="text-lg font-semibold text-white">Lista de Aulas</h3>
                      <Button variant="ghost" size="sm" onClick={() => setSidebarVisible(false)} className="text-white hover:text-emerald-400">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>}
                  <motion.div initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} transition={{
              delay: 0.2
            }} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Conteúdo do Curso
                    </h3>
                  </div>

                  {(() => {
                    console.log('🎯 FILTRO SIDEBAR - Estado atual:', {
                      totalModules: modules.length,
                      studentCohortId,
                      modulesWithCohorts: modules.filter(m => m.cohort_ids && m.cohort_ids.length > 0).length
                    });
                    
                    return modules.filter(module => {
                      const isForAll = !module.cohort_ids || module.cohort_ids.length === 0;
                      const hasStudentCohort = !!studentCohortId;
                      const moduleIncludesStudent = hasStudentCohort && module.cohort_ids?.includes(studentCohortId);
                      
                      console.log(`📦 ${module.title}:`, {
                        cohort_ids: module.cohort_ids,
                        isForAll,
                        hasStudentCohort,
                        studentCohortId,
                        moduleIncludesStudent,
                        WILL_SHOW: isForAll || moduleIncludesStudent
                      });
                      
                      return isForAll || moduleIncludesStudent;
                    });
                  })().map(module => {
                const moduleLessons = lessons.filter(l => l.module_id === module.id);
                const isExpanded = expandedModules.has(module.id);
                return <div key={`${module.id}-${selectedLesson?.id || 'none'}`} className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${isExpanded ? 'bg-emerald-500/20 border border-emerald-500/30 shadow-emerald-500/20 shadow-lg' : 'bg-gray-800 hover:bg-gray-700 hover:border-emerald-500/30 border border-transparent'}`} onClick={() => handleModuleToggle(module.id)}>
                          {module.cover_image_url ? <img src={module.cover_image_url} alt={module.title} className="w-12 h-12 object-cover rounded" /> : <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-emerald-400" />
                            </div>}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white text-sm">{module.title}</h4>
                              {isModuleComingSoonForStudent(module) && (
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500 text-[10px] px-1 py-0">
                                  Em Breve
                                </Badge>
                              )}
                              {isModulePaidForStudent(module) && !isModuleComingSoonForStudent(module) && !modulesWithAccess.has(module.id) && (
                                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500 text-[10px] px-1 py-0">
                                  <Lock className="h-2 w-2 mr-0.5" />
                                  Pago
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{moduleLessons.length} aulas</p>
                          </div>
                        </div>

                        {/* Lista de aulas quando expandido */}
                        <AnimatePresence>
                          {isExpanded && <motion.div initial={{
                      opacity: 0,
                      height: 0
                    }} animate={{
                      opacity: 1,
                      height: 'auto'
                    }} exit={{
                      opacity: 0,
                      height: 0
                    }} className="pl-4 space-y-2">
                              {moduleLessons.map(lesson => <motion.div key={`lesson-${lesson.id}`} whileHover={{
                        scale: 1.02
                      }} className={`p-3 rounded cursor-pointer transition-colors ${lesson.id === selectedLesson.id ? 'bg-emerald-500/20 border-l-4 border-l-emerald-400' : 'bg-gray-800/50 hover:bg-gray-800'}`} onClick={(e) => {
                        e.stopPropagation();
                        handleLessonClick(lesson);
                      }}>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-white line-clamp-1">
                                        {lesson.title}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Clock className="h-3 w-3 text-gray-400" />
                                        <span className="text-xs text-gray-400">
                                          {Math.round(lesson.duration / 60)} min
                                        </span>
                                        {lesson.id === selectedLesson.id && <PlayCircle className="h-3 w-3 text-emerald-400" />}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>)}
                            </motion.div>}
                        </AnimatePresence>
                      </div>;
              })}
                 </motion.div>
                </div>}
            </div> : (/* Layout normal - módulos */
        <div className="grid grid-cols-1 gap-8">
              <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.2
          }}>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-3">
                    {selectedModule ? selectedModule.title : 'Módulos do Curso'}
                  </h2>
                  <p className="text-gray-400 text-lg">
                    {selectedModule ? selectedModule.description : 'Escolha um módulo para começar a aprender'}
                  </p>
                </div>

                {/* Continue Watching Section */}
                {!selectedModule && user?.email && memberAreaId && (
                  <div className="mb-8">
                    <ContinueWatching 
                      memberAreaId={memberAreaId} 
                      studentEmail={user.email}
                      onLessonSelect={handleLessonClick}
                    />
                  </div>
                )}

                {modules.length > 0 ? <div className="relative">
                    {selectedModule ? (/* Aulas do Módulo Selecionado */
              <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                          <Button variant="outline" onClick={handleBackToModules} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border-gray-600 text-white">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar aos Módulos
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {filteredLessons.map((lesson, index) => {
                    const currentProgress = lessonProgress[lesson.id];
                    return <motion.div key={lesson.id} initial={{
                      opacity: 0,
                      y: 20
                    }} animate={{
                      opacity: 1,
                      y: 0
                    }} transition={{
                      delay: 0.1 * index
                    }} className={`group transition-all duration-200 cursor-pointer`} onClick={() => handleLessonClick(lesson)}>
                                <Card className={`bg-gray-900 transition-all duration-300 border border-gray-800 hover:bg-gray-800 ${isLessonContentAccessible(lesson) ? 'hover:border-emerald-500/50' : 'hover:border-amber-500/50'}`}>
                                  <div className="p-6 flex items-center gap-4">
                                    <div className={`flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center ${isLessonContentAccessible(lesson) ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20' : 'bg-gradient-to-br from-amber-500/20 to-amber-600/20'}`}>
                                      {!isLessonContentAccessible(lesson) && lesson.is_scheduled ? <Timer className="h-8 w-8 text-amber-400" /> : currentProgress?.completed ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <Play className="h-8 w-8 text-emerald-400" />}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge className={`${isLessonContentAccessible(lesson) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                          Aula {index + 1}
                                        </Badge>
                                        <Badge variant="outline" className="text-gray-400 border-gray-600">
                                          <Clock className="h-3 w-3 mr-1" />
                                          {Math.round(lesson.duration / 60)} min
                                        </Badge>
                                        {lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date() && <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-400/10">
                                            <Timer className="h-3 w-3 mr-1" />
                                            Agendada
                                          </Badge>}
                                      </div>
                                      <h4 className={`text-lg font-semibold transition-colors ${isLessonContentAccessible(lesson) ? 'text-white group-hover:text-emerald-400' : 'text-white group-hover:text-amber-400'}`}>
                                        {lesson.title}
                                      </h4>
                                      {lesson.description && <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                          {lesson.description}
                                        </p>}

                                      {/* Countdown para aulas agendadas */}
                                      {lesson.is_scheduled && lesson.scheduled_at && new Date(lesson.scheduled_at) > new Date() && <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
                                          <div className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                                            <Timer className="h-4 w-4" />
                                            Aula será liberada em:
                                          </div>
                                          <CountdownTimer targetDate={lesson.scheduled_at} className="justify-start" onComplete={() => {
                                toast.success("Aula liberada!", {
                                  description: `A aula "${lesson.title}" está agora disponível!`
                                });
                              }} />
                                        </div>}

                                       {/* Barra de progresso real baseada em aulas assistidas */}
                                       {isLessonContentAccessible(lesson) && currentProgress && currentProgress.progress_percentage > 0 && (
                                         <div className="mt-3">
                                           <div className="flex justify-between text-xs text-gray-400 mb-1">
                                             <span>Progresso</span>
                                             <span>{currentProgress.progress_percentage}%</span>
                                           </div>
                                           <Progress 
                                             value={currentProgress.progress_percentage} 
                                             className="h-2" 
                                             style={{
                                               '--progress-background': currentProgress.completed ? '#10b981' : '#eab308'
                                             } as React.CSSProperties}
                                           />
                                         </div>
                                       )}
                                    </div>
                                    <div className={`flex-shrink-0 transition-opacity opacity-0 group-hover:opacity-100`}>
                                      {!isLessonContentAccessible(lesson) && lesson.is_scheduled ? <Timer className="h-6 w-6 text-amber-400" /> : <Play className="h-6 w-6 text-emerald-400" />}
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>;
                  })}

                          {filteredLessons.length === 0 && <div className="text-center py-12">
                              <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-400 mb-2">
                                Nenhuma aula neste módulo ainda
                              </h3>
                              <p className="text-gray-500">
                                Novas aulas serão adicionadas em breve
                              </p>
                            </div>}
                        </div>
                      </div>) : (/* Netflix Style Horizontal Scroll */
              <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide scroll-smooth">
                        <div className="flex gap-6 min-w-max">
                          {(() => {
                            console.log('🎯 FILTRO NETFLIX - Estado atual:', {
                              totalModules: modules.length,
                              studentCohortId,
                              modulesWithCohorts: modules.filter(m => m.cohort_ids && m.cohort_ids.length > 0).length
                            });
                            
                            return modules.filter(module => {
                              const isForAll = !module.cohort_ids || module.cohort_ids.length === 0;
                              const hasStudentCohort = !!studentCohortId;
                              const moduleIncludesStudent = hasStudentCohort && module.cohort_ids?.includes(studentCohortId);
                              
                              console.log(`📦 NETFLIX ${module.title}:`, {
                                cohort_ids: module.cohort_ids,
                                isForAll,
                                hasStudentCohort,
                                studentCohortId,
                                moduleIncludesStudent,
                                WILL_SHOW: isForAll || moduleIncludesStudent
                              });
                              
                              return isForAll || moduleIncludesStudent;
                            });
                          })().map((module, index) => <motion.div key={module.id} initial={{
                    opacity: 0,
                    scale: 0.95
                  }} animate={{
                    opacity: 1,
                    scale: 1
                  }} transition={{
                    delay: 0.1 * index
                  }} whileHover={{
                    scale: 1.05,
                    y: -8
                  }} className={`group cursor-pointer flex-shrink-0 w-80 ${isModuleComingSoonForStudent(module) ? 'opacity-75' : ''}`} onClick={() => handleModuleClick(module)}>
                              <Card className={`overflow-hidden bg-gray-900 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 border border-gray-800 ${isModuleComingSoonForStudent(module) ? 'hover:border-amber-500/50' : 'hover:border-emerald-500/50'} transform-gpu`}>
                                <div className="relative">
                                  {/* Module Cover - Netflix Style com orientação dinâmica */}
                                  <div className={`${(module as any).cover_orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-gradient-to-br from-gray-900 to-black relative overflow-hidden`}>
                                    {module.cover_image_url ? <>
                                        <img src={module.cover_image_url} alt={module.title} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isModuleComingSoonForStudent(module) ? 'grayscale' : ''}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                      </> : <div className="w-full h-full flex items-center justify-center">
                                        {isModuleComingSoonForStudent(module) ? <AlertCircle className="h-20 w-20 text-amber-500 group-hover:text-amber-400 transition-colors duration-300" /> : <BookOpen className="h-20 w-20 text-gray-600 group-hover:text-emerald-500 transition-colors duration-300" />}
                                      </div>}
                                    
                                    {/* Module Number Badge */}
                                    <div className="absolute top-4 left-4">
                                      <Badge className={`backdrop-blur-sm font-bold px-3 py-1 ${isModuleComingSoonForStudent(module) ? 'bg-amber-500/90 hover:bg-amber-600 text-white' : 'bg-emerald-500/90 hover:bg-emerald-600 text-white'}`}>
                                        {module.order_number}
                                      </Badge>
                                    </div>

                                    {/* Coming Soon Badge */}
                                    {isModuleComingSoonForStudent(module) && <div className="absolute top-4 right-4">
                                        <Badge variant="outline" className="bg-amber-500/90 text-white border-amber-400">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Em Breve
                                        </Badge>
                                      </div>}

                                    {/* Paid Badge */}
                                    {isModulePaidForStudent(module) && !isModuleComingSoonForStudent(module) && !modulesWithAccess.has(module.id) && <div className="absolute top-4 right-4">
                                        <Badge variant="outline" className="bg-green-500/90 text-white border-green-400">
                                          <Lock className="h-3 w-3 mr-1" />
                                          Pago
                                        </Badge>
                                      </div>}

                                    {/* Progress Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                                       <h3 className={`font-bold text-lg mb-1 leading-tight transition-colors ${isModuleComingSoonForStudent(module) ? 'group-hover:text-amber-300' : 'group-hover:text-emerald-300'}`}>
                                         {module.title}
                                       </h3>
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="text-sm text-gray-300">
                                            {lessons.filter(l => l.module_id === module.id).length} aulas
                                          </span>
                                          {isModulePaidForStudent(module) && !isModuleComingSoonForStudent(module) && !modulesWithAccess.has(module.id) && (
                                            <span className="text-xs font-medium text-green-400">
                                              {(module as any).paid_price || 'Pago'}
                                            </span>
                                          )}
                                        </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </motion.div>)}
                        </div>
                      </div>)}
                  </div> : (/* Sem módulos disponíveis */
            <motion.div initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} className="text-center py-20">
                    <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800">
                      <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-6" />
                      <h3 className="text-2xl font-bold text-white mb-4">
                        Nenhum módulo disponível ainda
                      </h3>
                      <p className="text-gray-400 text-lg max-w-md mx-auto">
                        Novos módulos serão adicionados em breve. Fique atento!
                      </p>
                    </div>
                  </motion.div>)}
              </motion.div>
            </div>)}
        </div>

        {/* Ofertas na Área de Membros - Abaixo dos Módulos */}
        {!selectedLesson && memberAreaId && (
          <MemberAreaOffers memberAreaId={memberAreaId} />
        )}
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
    </div>;
}