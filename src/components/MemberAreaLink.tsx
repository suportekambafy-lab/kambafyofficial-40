import { ReactNode } from 'react';
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';

interface MemberAreaLinkProps {
  memberAreaId: string;
  path?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Componente para criar links para área de membros
 * Automaticamente usa o subdomínio correto (membros.kambafy.com)
 */
export function MemberAreaLink({ memberAreaId, path = '', children, className, onClick }: MemberAreaLinkProps) {
  const memberAreaLinks = createMemberAreaLinks();
  const url = memberAreaLinks.getMemberAreaUrl(memberAreaId, path);
  
  return (
    <a 
      href={url} 
      className={className} 
      onClick={onClick}
      target="_self"
    >
      {children}
    </a>
  );
}

/**
 * Componente para criar links de login da área de membros
 */
export function MemberAreaLoginLink({ memberAreaId, children, className, onClick }: Omit<MemberAreaLinkProps, 'path'>) {
  const memberAreaLinks = createMemberAreaLinks();
  const url = memberAreaLinks.getMemberAreaLoginUrl(memberAreaId);
  
  return (
    <a 
      href={url} 
      className={className} 
      onClick={onClick}
      target="_self"
    >
      {children}
    </a>
  );
}