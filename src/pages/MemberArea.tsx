import { useParams, useNavigate } from "react-router-dom";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import MemberAreaContent from "@/components/MemberAreaContent";
import { useMemberAreaAuth } from "@/contexts/MemberAreaAuthContext";

export default function MemberAreaPage() {
  const { id: areaId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  console.log('MemberAreaPage - areaId:', areaId);

  if (!areaId) {
    navigate('/');
    return null;
  }

  return (
    <MemberAreaAuthProvider memberAreaId={areaId}>
      <MemberAreaContentWrapper />
    </MemberAreaAuthProvider>
  );
}

function MemberAreaContentWrapper() {
  const { student, memberArea, loading, isAuthenticated } = useMemberAreaAuth();

  console.log('MemberAreaContentWrapper state:', { 
    student, 
    memberArea, 
    loading, 
    isAuthenticated 
  });

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