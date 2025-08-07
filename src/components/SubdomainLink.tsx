
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSubdomain } from '@/hooks/useSubdomain';

interface SubdomainLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SubdomainLink({ to, children, className, onClick }: SubdomainLinkProps) {
  const { currentSubdomain, getSubdomainUrl } = useSubdomain();
  
  // Determine qual subdomínio esta rota deveria usar
  const getTargetSubdomain = (path: string): 'main' | 'app' | 'pay' | 'mobile' => {
    if (path.startsWith('/mobile')) {
      return 'mobile';
    } else if (path.startsWith('/auth') || path.startsWith('/vendedor') || path.startsWith('/apps') || path.startsWith('/minhas-compras')) {
      return 'app';
    } else if (path.startsWith('/checkout') || path.startsWith('/obrigado')) {
      return 'pay';
    } else {
      return 'main';
    }
  };
  
  const targetSubdomain = getTargetSubdomain(to);
  
  // Se estivermos no mobile, SEMPRE usar Link regular (sem redirecionamentos)
  if (currentSubdomain === 'mobile') {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  
  // Se já estamos no subdomínio correto, usar Link regular
  if (currentSubdomain === targetSubdomain) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  
  // NUNCA criar link externo PARA mobile (mobile é isolado)
  if (targetSubdomain === 'mobile') {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  
  // Caso contrário, criar link externo para subdomínio correto
  const targetUrl = getSubdomainUrl(targetSubdomain, to);
  
  return (
    <a href={targetUrl} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
