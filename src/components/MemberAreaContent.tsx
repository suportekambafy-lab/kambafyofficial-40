import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MemberAreaFullPage from '@/components/MemberAreaFullPage';
import type { Lesson, Module, MemberArea } from '@/types/memberArea';

interface MemberAreaContentProps {
  memberArea: MemberArea;
}

export default function MemberAreaContent({ memberArea }: MemberAreaContentProps) {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useMemberAreaAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login/${memberArea.id}`);
    }
  }, [authLoading, isAuthenticated, navigate, memberArea.id]);

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', memberArea.id],
    queryFn: async () => {
      console.log('Fetching lessons for member area:', memberArea.id);
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching lessons:', error);
        return [];
      }
      
      console.log('Fetched lessons:', data);
      return data as Lesson[];
    },
    enabled: !!memberArea.id && isAuthenticated
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', memberArea.id],
    queryFn: async () => {
      console.log('Fetching modules for member area:', memberArea.id);
      
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching modules:', error);
        return [];
      }
      
      console.log('Fetched modules:', data);
      return data as Module[];
    },
    enabled: !!memberArea.id && isAuthenticated
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Verificando autenticação..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Will be redirected by useEffect
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Redirecionando..." />
      </div>
    );
  }

  if (lessonsLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Carregando conteúdo..." />
      </div>
    );
  }

  return (
    <MemberAreaFullPage
      memberArea={memberArea}
      lessons={lessons}
      modules={modules}
    />
  );
}