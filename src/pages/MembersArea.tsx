import { MembersAuthProvider } from '@/components/members/MembersAuth';
import MembersArea from '@/components/members/MembersArea';

export default function MembersAreaPage() {
  return (
    <MembersAuthProvider>
      <MembersArea />
    </MembersAuthProvider>
  );
}