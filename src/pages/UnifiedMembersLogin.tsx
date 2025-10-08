import { UnifiedMembersAuthProvider } from '@/components/members/UnifiedMembersAuth';
import UnifiedMembersLogin from '@/components/members/UnifiedMembersLogin';

export default function UnifiedMembersLoginPage() {
  return (
    <UnifiedMembersAuthProvider>
      <UnifiedMembersLogin />
    </UnifiedMembersAuthProvider>
  );
}
