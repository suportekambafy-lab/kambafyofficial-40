import { ReactNode } from 'react';
import { getProductPrerenderUrl } from '@/utils/checkoutPrerender';

interface ProductLinkProps {
  productId: string;
  children: ReactNode;
  className?: string;
  context?: 'checkout' | 'product';
  onClick?: () => void;
  prefetch?: boolean;
}

/**
 * Component para criar links de produtos que usam prerender para SEO otimizado.
 * Gera automaticamente a URL correta com prerender para crawlers de redes sociais.
 */
export function ProductLink({ 
  productId, 
  children, 
  className, 
  context = 'product', 
  onClick,
  prefetch = true 
}: ProductLinkProps) {
  const prerenderUrl = getProductPrerenderUrl(productId, context);
  const appUrl = context === 'checkout' 
    ? `https://pay.kambafy.com/checkout/${productId}`
    : `https://pay.kambafy.com/checkout/${productId}`; // Por enquanto, ambos levam ao checkout

  const handleMouseEnter = () => {
    if (prefetch && typeof document !== 'undefined') {
      // Prefetch do prerender para melhor performance
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = prerenderUrl;
      link.as = 'document';
      document.head.appendChild(link);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    onClick?.();
    
    // Para navegadores normais, redirecionar para a aplicação
    if (typeof window !== 'undefined') {
      e.preventDefault();
      window.open(appUrl, '_blank');
    }
  };

  return (
    <a
      href={prerenderUrl} // Link SEO-friendly para crawlers
      className={className}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}