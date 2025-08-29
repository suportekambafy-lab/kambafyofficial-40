import { useParams } from "react-router-dom";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import MemberAreaLogin from "./MemberAreaLogin";

export default function MemberAreaLoginWrapper() {
  const { areaId } = useParams<{ areaId: string }>();

  if (!areaId) {
    return <div>Area ID não encontrado</div>;
  }

  return (
    <MemberAreaAuthProvider memberAreaId={areaId}>
      <MemberAreaLogin />
    </MemberAreaAuthProvider>
  );
}