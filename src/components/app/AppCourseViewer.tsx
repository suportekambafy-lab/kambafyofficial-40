import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModernMembersAuthProvider } from '@/components/members/ModernMembersAuth';
import ModernMembersArea from '@/components/members/ModernMembersArea';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AppCourseViewerProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export function AppCourseViewer({ courseId, courseName, onClose }: AppCourseViewerProps) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  console.log('🎓 AppCourseViewer: Verificando acesso ao curso', { courseId, courseName, userEmail: user?.email });
  
  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.email) {
        setHasAccess(false);
        return;
      }

      try {
        const normalizedEmail = user.email.toLowerCase().trim();
        
        // Verificar se usuário é estudante da área de membros
        const { data: student } = await supabase
          .from('member_area_students')
          .select('*')
          .eq('member_area_id', courseId)
          .ilike('student_email', normalizedEmail)
          .maybeSingle();

        // Verificar se usuário é o criador da área de membros
        const { data: memberArea } = await supabase
          .from('member_areas')
          .select('user_id')
          .eq('id', courseId)
          .single();

        const isOwner = memberArea?.user_id === user.id;
        const isStudent = !!student;
        
        console.log('🔑 AppCourseViewer: Resultado da verificação:', { 
          isOwner, 
          isStudent, 
          hasAccess: isOwner || isStudent 
        });
        
        setHasAccess(isOwner || isStudent);
      } catch (error) {
        console.error('❌ AppCourseViewer: Erro ao verificar acesso:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [courseId, user]);

  // Criar sessão virtual para acesso
  useEffect(() => {
    if (hasAccess && user?.email) {
      const virtualSession = {
        user: user,
        session: {
          access_token: 'app-virtual-token',
          user: user
        },
        timestamp: Date.now()
      };
      localStorage.setItem('memberAreaSession', JSON.stringify(virtualSession));
      
      // Adicionar parâmetros à URL
      const url = new URL(window.location.href);
      url.searchParams.set('verified', 'true');
      url.searchParams.set('email', user.email);
      window.history.replaceState({}, '', url.toString());
    }
  }, [hasAccess, user]);
  
  if (hasAccess === null) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <LoadingSpinner text="Verificando acesso..." />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você não tem acesso a este curso</p>
          <Button onClick={onClose}>Voltar</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-hidden">
      {/* Header com botão de fechar */}
      <div className="absolute top-4 right-4 z-[110]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Área de membros embutida com scroll */}
      <div className="h-full w-full overflow-y-auto">
        <ModernMembersAuthProvider memberAreaId={courseId}>
          <ModernMembersArea memberAreaId={courseId} isEmbeddedInApp={true} />
        </ModernMembersAuthProvider>
      </div>
    </div>
  );
}
