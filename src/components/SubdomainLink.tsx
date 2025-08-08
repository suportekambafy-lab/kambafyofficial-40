
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useSubdomain } from '@/hooks/useSubdomain';
import { CHECKOUT_PRERENDER_BASE } from '@/utils/checkoutPrerender';

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
  
  // Caso contrário, criar link externo para subdomínio correto (com prerender no checkout)
  const isCheckout = to.startsWith('/checkout/');
  let targetUrl = getSubdomainUrl(targetSubdomain, to);
  if (targetSubdomain === 'pay' && isCheckout) {
    const pathOnly = to.split('?')[0];
    const productId = pathOnly.split('/').pop() || '';
    if (productId) {
      targetUrl = `${CHECKOUT_PRERENDER_BASE}/${productId}`;
    }
  }

  const handleMouseEnter = () => {
    if (targetSubdomain === 'pay' && isCheckout && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = targetUrl;
      link.as = 'document';
      document.head.appendChild(link);
    }
  };
  
  return (
    <a href={targetUrl} className={className} onClick={onClick} onMouseEnter={handleMouseEnter}>
      {children}
    </a>
  );
}
