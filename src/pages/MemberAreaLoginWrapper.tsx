import { useParams } from "react-router-dom";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import MemberAreaLogin from "./MemberAreaLogin";

export default function MemberAreaLoginWrapper() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Area ID não encontrado</div>;
  }

  return (
    <MemberAreaAuthProvider memberAreaId={id}>
      <MemberAreaLogin />
    </MemberAreaAuthProvider>
  );
}