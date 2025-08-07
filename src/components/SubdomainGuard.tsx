
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubdomain } from '@/hooks/useSubdomain';

interface SubdomainGuardProps {
  children: React.ReactNode;
}

export function SubdomainGuard({ children }: SubdomainGuardProps) {
  const { currentSubdomain, getSubdomainUrl } = useSubdomain();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;
    
    // MOBILE É COMPLETAMENTE ISOLADO - sem redirecionamentos
    if (currentSubdomain === 'mobile') {
      return;
    }
    
    // Para desenvolvimento/preview, não fazer redirecionamentos
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app')) {
      return;
    }
    
    // Define quais rotas são RESTRITAS de cada subdomínio (não permitidas)
    const restrictedFromMain = ['/auth', '/vendedor', '/apps', '/minhas-compras', '/admin']; 
    const restrictedFromApp = ['/checkout', '/obrigado', '/admin']; 
    const restrictedFromPay = ['/auth', '/vendedor', '/apps', '/minhas-compras', '/admin']; 
    const restrictedFromAdmin = ['/checkout', '/obrigado', '/auth', '/vendedor', '/apps', '/minhas-compras']; 
    
    // Verifica se a rota atual é restrita do subdomínio atual
    let shouldRedirect = false;
    let targetSubdomain: 'main' | 'app' | 'pay' | 'admin' = 'main';
    
    if (currentSubdomain === 'main') {
      // kambafy.com: NÃO redirecionar página inicial (/) nem outras páginas públicas
      if (currentPath === '/' || currentPath === '' || 
          currentPath.startsWith('/como-funciona') || 
          currentPath.startsWith('/precos') || 
          currentPath.startsWith('/recursos') ||
          currentPath.startsWith('/ajuda') ||
          currentPath.startsWith('/contato') ||
          currentPath.startsWith('/status') ||
          currentPath.startsWith('/privacidade') ||
          currentPath.startsWith('/termos') ||
          currentPath.startsWith('/cookies')) {
        return; // Manter no domínio principal
      }
      
      // Apenas restringir rotas específicas de autenticação e dashboard
      if (restrictedFromMain.some(route => currentPath.startsWith(route))) {
        shouldRedirect = true;
        if (currentPath.startsWith('/admin')) {
          targetSubdomain = 'admin';
        } else {
          targetSubdomain = 'app';
        }
      }
    } else if (currentSubdomain === 'app') {
      // app.kambafy.com: redirecionar landing page principal para o domínio main
      if (currentPath === '/' || currentPath === '') {
        shouldRedirect = true;
        targetSubdomain = 'main';
      } else if (restrictedFromApp.some(route => currentPath.startsWith(route))) {
        shouldRedirect = true;
        if (currentPath.startsWith('/admin')) {
          targetSubdomain = 'admin';
        } else if (currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado')) {
          targetSubdomain = 'pay';
        }
      }
    } else if (currentSubdomain === 'pay') {
      // pay.kambafy.com: permitir apenas checkout e obrigado
      if (!(currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado'))) {
        shouldRedirect = true;
        if (restrictedFromPay.some(route => currentPath.startsWith(route))) {
          if (currentPath.startsWith('/admin')) {
            targetSubdomain = 'admin';
          } else if (currentPath.startsWith('/auth') || currentPath.startsWith('/vendedor') || 
              currentPath.startsWith('/apps') || currentPath.startsWith('/minhas-compras')) {
            targetSubdomain = 'app';
          } else {
            targetSubdomain = 'main';
          }
        } else {
          targetSubdomain = 'main';
        }
      }
    } else if (currentSubdomain === 'admin') {
      // admin.kambafy.com: FORÇAR apenas rotas /admin
      if (!currentPath.startsWith('/admin')) {
        console.log('Admin subdomain: redirecting non-admin route to /admin/login');
        shouldRedirect = true;
        window.location.href = window.location.protocol + '//' + window.location.host + '/admin/login';
        return;
      }
    }
    
    if (shouldRedirect) {
      const targetUrl = getSubdomainUrl(targetSubdomain, currentPath);
      console.log('SubdomainGuard: Redirecting to:', targetUrl);
      window.location.href = targetUrl;
    }
  }, [currentSubdomain, location, getSubdomainUrl]);

  return <>{children}</>;
}
