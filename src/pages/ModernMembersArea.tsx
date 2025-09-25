import { ModernMembersAuthProvider } from '@/components/members/ModernMembersAuth';
import ModernMembersArea from '@/components/members/ModernMembersArea';

export default function ModernMembersAreaPage() {
  return (
    <ModernMembersAuthProvider>
      <ModernMembersArea />
    </ModernMembersAuthProvider>
  );
}