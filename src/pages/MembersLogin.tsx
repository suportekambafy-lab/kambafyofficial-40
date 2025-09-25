import { MembersAuthProvider } from '@/components/members/MembersAuth';
import MembersLogin from '@/components/members/MembersLogin';

export default function MembersLoginPage() {
  return (
    <MembersAuthProvider>
      <MembersLogin />
    </MembersAuthProvider>
  );
}