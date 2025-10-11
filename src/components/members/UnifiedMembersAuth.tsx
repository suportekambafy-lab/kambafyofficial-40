import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface MemberAreaAccess {
  memberAreaId: string;
  memberAreaName: string;
  logoUrl?: string;
  heroImageUrl?: string;
  totalLessons: number;
  completedLessons: number;
  lastActivity?: string;
  lastLessonId?: string;
  productId: string;
  productName: string;
}

interface UnifiedMembersAuthContextType {
  studentEmail: string | null;
  studentName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  memberAreas: MemberAreaAccess[];
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const UnifiedMembersAuthContext = createContext<UnifiedMembersAuthContextType | undefined>(undefined);

export function useUnifiedMembersAuth() {
  const context = useContext(UnifiedMembersAuthContext);
  if (!context) {
    throw new Error('useUnifiedMembersAuth must be used within UnifiedMembersAuthProvider');
  }
  return context;
}

interface UnifiedMembersAuthProviderProps {
  children: ReactNode;
}

export function UnifiedMembersAuthProvider({ children }: UnifiedMembersAuthProviderProps) {
  const [studentEmail, setStudentEmail] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [memberAreas, setMemberAreas] = useState<MemberAreaAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('unified_members_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStudentEmail(parsed.email);
        setStudentName(parsed.name);
        loadMemberAreas(parsed.email);
      } catch (error) {
        console.error('Error parsing session:', error);
        localStorage.removeItem('unified_members_session');
      }
    }
    setIsLoading(false);
  }, []);

  const loadMemberAreas = async (email: string) => {
    try {
      console.log('📚 Loading member areas for:', email);
      
      const normalizedEmail = email.toLowerCase().trim();

      // Query para buscar todas as áreas de membros do cliente
      const { data: studentAreas, error } = await supabase
        .from('member_area_students')
        .select(`
          member_area_id,
          member_areas!inner (
            id,
            name,
            logo_url,
            hero_image_url,
            user_id
          )
        `)
        .eq('student_email', normalizedEmail);

      if (error) throw error;

      console.log('📋 Member areas data:', studentAreas);

      if (!studentAreas || studentAreas.length === 0) {
        console.log('❌ No member areas found');
        setMemberAreas([]);
        return;
      }

      // Buscar produtos das áreas (apenas Cursos)
      const memberAreaIds = studentAreas.map((s: any) => s.member_area_id);
      
      const { data: products } = await supabase
        .from('products')
        .select('id, name, type, member_area_id')
        .in('member_area_id', memberAreaIds)
        .eq('type', 'Curso');

      console.log('📦 Products found:', products);

      if (!products || products.length === 0) {
        console.log('❌ No course products found');
        setMemberAreas([]);
        return;
      }

      // Processar cada área para calcular progresso
      const areasWithProgress = await Promise.all(
        studentAreas
          .map(async (item: any) => {
            const memberArea = item.member_areas;
            const product = products.find((p: any) => p.member_area_id === memberArea.id);
            
            if (!product) return null;

            // Buscar aulas da área
            const { data: lessons } = await supabase
              .from('lessons')
              .select('id')
              .eq('member_area_id', memberArea.id)
              .eq('status', 'published');

            const totalLessons = lessons?.length || 0;

            // Buscar progresso do aluno
            const { data: progress } = await supabase
              .from('lesson_progress')
              .select('lesson_id, completed, last_watched_at')
              .eq('member_area_id', memberArea.id)
              .eq('user_email', normalizedEmail);

            const completedLessons = progress?.filter(p => p.completed).length || 0;
            const lastActivity = progress?.[0]?.last_watched_at;

            // Buscar última aula assistida
            const lastProgress = progress?.sort((a, b) => 
              new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()
            )[0];

            return {
              memberAreaId: memberArea.id,
              memberAreaName: memberArea.name,
              logoUrl: memberArea.logo_url,
              heroImageUrl: memberArea.hero_image_url,
              totalLessons,
              completedLessons,
              lastActivity,
              lastLessonId: lastProgress?.lesson_id,
              productId: product.id,
              productName: product.name
            } as MemberAreaAccess;
          })
      );

      // Filtrar nulls e ordenar por última atividade
      const validAreas = areasWithProgress
        .filter((area): area is MemberAreaAccess => area !== null && area !== undefined)
        .sort((a, b) => {
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });

      console.log('✅ Processed member areas:', validAreas);
      setMemberAreas(validAreas);
    } catch (error) {
      console.error('Error loading member areas:', error);
      toast({
        title: 'Erro ao carregar cursos',
        description: 'Não foi possível carregar seus cursos. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const login = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const normalizedEmail = email.toLowerCase().trim();

      console.log('🔐 Attempting unified login:', normalizedEmail);

      // Verificar se o email tem acesso a alguma área de membros (apenas Cursos)
      const { data: studentData, error } = await supabase
        .from('member_area_students')
        .select(`
          student_name,
          member_area_id
        `)
        .eq('student_email', normalizedEmail)
        .limit(1);

      if (error) throw error;

      if (!studentData || studentData.length === 0) {
        console.log('❌ No course access found');
        toast({
          title: 'Acesso negado',
          description: 'Você ainda não tem acesso a nenhum curso.',
          variant: 'destructive'
        });
        return false;
      }

      // Verificar se as áreas de membros têm produtos do tipo 'Curso'
      const memberAreaIds = studentData.map((s: any) => s.member_area_id);
      
      const { data: products } = await supabase
        .from('products')
        .select('member_area_id, type')
        .in('member_area_id', memberAreaIds)
        .eq('type', 'Curso');

      if (!products || products.length === 0) {
        console.log('❌ No course products found');
        toast({
          title: 'Acesso negado',
          description: 'Você ainda não tem acesso a nenhum curso.',
          variant: 'destructive'
        });
        return false;
      }

      const studentName = studentData[0]?.student_name || normalizedEmail;

      // Salvar sessão
      const session = {
        email: normalizedEmail,
        name: studentName,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem('unified_members_session', JSON.stringify(session));
      setStudentEmail(normalizedEmail);
      setStudentName(studentName);

      // Carregar áreas
      await loadMemberAreas(normalizedEmail);

      console.log('✅ Unified login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Erro no login',
        description: 'Não foi possível fazer login. Verifique seu email.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Starting logout...');
    
    // Ativar estado de logout IMEDIATAMENTE para esconder o conteúdo
    setIsLoggingOut(true);
    
    // Limpar sessão do localStorage
    localStorage.removeItem('unified_members_session');
    
    // Redirecionar IMEDIATAMENTE sem atualizar estados (evita flash de conteúdo)
    const loginUrl = window.location.hostname.includes('localhost')
      ? `${window.location.origin}/hub`
      : 'https://membros.kambafy.com/hub';
    
    // Usar replace para não deixar na história do navegador
    window.location.replace(loginUrl);
  };

  const value = {
    studentEmail,
    studentName,
    isAuthenticated: !!studentEmail,
    isLoading,
    isLoggingOut,
    memberAreas,
    login,
    logout
  };

  return (
    <UnifiedMembersAuthContext.Provider value={value}>
      {children}
    </UnifiedMembersAuthContext.Provider>
  );
}
