import { UnifiedMembersAuthProvider } from '@/components/members/UnifiedMembersAuth';
import UnifiedMembersHub from '@/components/members/UnifiedMembersHub';

export default function UnifiedMembersHubPage() {
  return (
    <UnifiedMembersAuthProvider>
      <UnifiedMembersHub />
    </UnifiedMembersAuthProvider>
  );
}
