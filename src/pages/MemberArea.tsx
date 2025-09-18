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
  const { student, memberArea, loading } = useMemberAreaAuth();

  if (loading || !student || !memberArea) {
    return null; // ProtectedMemberAreaRoute vai lidar com redirecionamento
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