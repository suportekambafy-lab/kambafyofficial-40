import { ModernMembersAuthProvider } from '@/components/members/ModernMembersAuth';
import ModernMembersLogin from '@/components/members/ModernMembersLogin';

export default function ModernMembersLoginPage() {
  return (
    <ModernMembersAuthProvider>
      <ModernMembersLogin />
    </ModernMembersAuthProvider>
  );
}