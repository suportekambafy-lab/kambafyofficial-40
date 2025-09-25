import { useParams, useNavigate } from "react-router-dom";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import MemberAreaContent from "@/components/MemberAreaContent";
import { useMemberAreaAuth } from "@/contexts/MemberAreaAuthContext";
import { useEffect } from "react";
import { useSubdomain } from "@/hooks/useSubdomain";

export default function MemberAreaPage() {
  const { id: areaId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  console.log('🔍 MemberAreaPage - Iniciando:', {
    areaId,
    currentPath: window.location.pathname,
    hostname: window.location.hostname,
    fullUrl: window.location.href
  });

  if (!areaId) {
    console.log('❌ MemberAreaPage - Sem areaId, redirecionando para /');
    navigate('/');
    return null;
  }

  console.log('✅ MemberAreaPage - areaId encontrado, renderizando MemberAreaAuthProvider');

  return (
    <MemberAreaAuthProvider memberAreaId={areaId}>
      <MemberAreaContentWrapper />
    </MemberAreaAuthProvider>
  );
}

function MemberAreaContentWrapper() {
  const { student, memberArea, loading, isAuthenticated } = useMemberAreaAuth();
  const { id: areaId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSubdomain } = useSubdomain();

  console.log('🔍 MemberAreaContentWrapper - Estado atual:', { 
    areaId,
    student, 
    memberArea, 
    loading, 
    isAuthenticated,
    currentPath: window.location.pathname,
    hostname: window.location.hostname
  });

  // Redirect to login if not authenticated (after loading is complete)
  useEffect(() => {
    console.log('🔍 MemberAreaContentWrapper - useEffect disparado:', {
      loading,
      student: !!student,
      memberArea: !!memberArea,
      isAuthenticated,
      areaId,
      shouldRedirect: !loading && (!student || !memberArea || !isAuthenticated) && areaId
    });

    if (!loading && (!student || !memberArea || !isAuthenticated) && areaId) {
      // Para desenvolvimento/localhost/lovable, usar navigate do React Router
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
        console.log('🔄 Development: Navigating to login:', `/login/${areaId}`);
        navigate(`/login/${areaId}`, { replace: true });
      } else {
        // Para produção, manter na mesma aplicação se não for kambafy.com
        if (hostname.includes('kambafy.com')) {
          const loginUrl = `https://membros.kambafy.com/login/${areaId}`;
          console.log('🔄 Production kambafy.com: Redirecting to login:', loginUrl);
          window.location.href = loginUrl;
        } else {
          // Para outros domínios, usar navigate local
          console.log('🔄 Production other domain: Navigating to login:', `/login/${areaId}`);
          navigate(`/login/${areaId}`, { replace: true });
        }
      }
    }
  }, [loading, student, memberArea, isAuthenticated, areaId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando área de membros...</p>
        </div>
      </div>
    );
  }

  if (!student || !memberArea || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Criar objeto MemberArea com propriedades mínimas necessárias
  const memberAreaData = {
    id: memberArea.id,
    name: memberArea.name,
    url: memberArea.id, // usar ID como URL fallback
    description: '', // descrição vazia por padrão
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: memberArea.userId || ''
  };

  return <MemberAreaContent memberArea={memberAreaData} />;
}