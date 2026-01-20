
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
    const hostname = window.location.hostname;
    
    // ✅ OTIMIZAÇÃO: Skip TOTAL para rotas admin em subdomínio admin
    if (currentSubdomain === 'admin' && currentPath.startsWith('/admin')) {
      return;
    }
    
    // 🔍 Debug logging
    console.log('🔍 SubdomainGuard: Analisando rota', {
      currentPath,
      currentSubdomain,
      hostname,
      fullLocation: window.location.href
    });
    
    // ⚠️ CRÍTICO: ROTA /app NUNCA PODE SER REDIRECIONADA
    if (currentPath.startsWith('/app')) {
      if (hostname.includes('kambafy.com') && !hostname.includes('localhost') && !hostname.includes('lovable.app')) {
        if (currentSubdomain !== 'mobile') {
          const mobileUrl = `${window.location.protocol}//mobile.kambafy.com${currentPath}`;
          console.log('🔄 SubdomainGuard: FORÇANDO /app para mobile.kambafy.com');
          window.location.href = mobileUrl;
          return;
        }
        return;
      }
      return;
    }
    
    // Pular guard para rotas de teste
    if (currentPath.includes('/teste')) {
      return;
    }
    
    // DESENVOLVIMENTO/PREVIEW: Para ambientes de desenvolvimento, NUNCA fazer redirecionamentos
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || 
        hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      console.log('🔧 SubdomainGuard: PRÉ-VISUALIZAÇÃO/DEV - NENHUM redirecionamento');
      return;
    }
    
    // Para domínios customizados (não kambafy.com), não fazer redirecionamentos
    if (!hostname.includes('kambafy.com')) {
      console.log('🔧 SubdomainGuard: DOMÍNIO CUSTOMIZADO - Sem redirecionamentos');
      return;
    }
    
    // MOBILE É COMPLETAMENTE ISOLADO
    if (currentSubdomain === 'mobile') {
      if (!(currentPath.startsWith('/app') || currentPath.startsWith('/mobile') || currentPath === '/' || currentPath === '')) {
        window.location.href = window.location.protocol + '//' + window.location.host + '/app';
        return;
      }
      return;
    }
    
    // ÁREA DE MEMBROS - SEMPRE redirecionar para membros.kambafy.com
    if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/') || 
        currentPath.startsWith('/members/login') || currentPath.startsWith('/members/area')) {
      if (currentSubdomain !== 'membros') {
        let cleanPath = currentPath;
        if (currentPath.startsWith('/members/login')) {
          cleanPath = currentPath.replace('/members/login', '/login');
        } else if (currentPath.startsWith('/members/area')) {
          cleanPath = currentPath.replace('/members/area', '/area');
        }
        const targetUrl = `${window.location.protocol}//membros.kambafy.com${cleanPath}`;
        console.log('🔄 SubdomainGuard: REDIRECIONANDO área de membros para membros.kambafy.com');
        window.location.href = targetUrl;
        return;
      }
    }
    
    // ========== DEFINIÇÃO DE ROTAS POR SUBDOMÍNIO ==========
    // kambafy.com = APENAS landing page pública
    // app.kambafy.com = Dashboard, auth, vendedor, etc (tudo após login)
    // pay.kambafy.com = Checkout
    // admin.kambafy.com = Admin
    // membros.kambafy.com = Área de membros
    // mobile.kambafy.com = App mobile
    
    const publicPages = ['/', '/como-funciona', '/precos', '/recursos', '/ajuda', '/contato', '/denuncie', '/status', '/privacidade', '/termos', '/cookies', '/features', '/pricing', '/how-it-works', '/contact', '/help-center', '/privacy', '/terms'];
    
    let shouldRedirect = false;
    let targetSubdomain: 'main' | 'app' | 'pay' | 'admin' | 'membros' = 'main';
    
    if (currentSubdomain === 'main') {
      // kambafy.com: APENAS páginas públicas (landing page)
      const isPublicPage = publicPages.some(page => currentPath === page || (page !== '/' && currentPath.startsWith(page)));
      
      if (isPublicPage) {
        console.log('✅ SubdomainGuard: Página pública em kambafy.com', { currentPath });
        return;
      }
      
      // TODAS as outras rotas vão para app.kambafy.com
      if (currentPath.startsWith('/admin')) {
        shouldRedirect = true;
        targetSubdomain = 'admin';
      } else if (currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado')) {
        shouldRedirect = true;
        targetSubdomain = 'pay';
      } else {
        // Qualquer outra rota (auth, vendedor, produtos, etc) vai para app.kambafy.com
        shouldRedirect = true;
        targetSubdomain = 'app';
      }
    } else if (currentSubdomain === 'app') {
      // app.kambafy.com: Dashboard e tudo relacionado ao vendedor
      
      // Redirecionar landing page para kambafy.com
      if (currentPath === '/' || currentPath === '') {
        shouldRedirect = true;
        targetSubdomain = 'main';
      }
      // Redirecionar páginas públicas para kambafy.com
      else if (publicPages.some(page => page !== '/' && currentPath.startsWith(page))) {
        shouldRedirect = true;
        targetSubdomain = 'main';
      }
      // Redirecionar checkout para pay.kambafy.com
      else if (currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado')) {
        shouldRedirect = true;
        targetSubdomain = 'pay';
      }
      // Redirecionar admin para admin.kambafy.com
      else if (currentPath.startsWith('/admin')) {
        shouldRedirect = true;
        targetSubdomain = 'admin';
      }
      // Todas as outras rotas são permitidas no app.kambafy.com
    } else if (currentSubdomain === 'membros') {
      // membros.kambafy.com: permitir APENAS rotas de área de membros
      const isSpecificArea = currentPath.match(/^\/(login|area)\/[^/]+/);
      
      if (isSpecificArea) {
        return; // Permitir acesso
      }
      
      // Se NÃO é área específica, redirecionar para kambafy.com
      window.location.href = 'https://kambafy.com';
      return;
    } else if (currentSubdomain === 'pay') {
      // pay.kambafy.com: permitir apenas checkout e obrigado
      if (!(currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado'))) {
        shouldRedirect = true;
        if (currentPath.startsWith('/admin')) {
          targetSubdomain = 'admin';
        } else if (currentPath.startsWith('/auth') || currentPath.startsWith('/vendedor')) {
          targetSubdomain = 'app';
        } else {
          targetSubdomain = 'main';
        }
      }
    } else if (currentSubdomain === 'admin') {
      // admin.kambafy.com: FORÇAR apenas rotas /admin
      // EXCEÇÃO: durante impersonation, permitir /vendedor
      const isImpersonating = !!localStorage.getItem('impersonation_data');

      if (currentPath.startsWith('/vendedor') || currentPath.startsWith('/meus-acessos')) {
        if (isImpersonating) {
          console.log('✅ SubdomainGuard: Admin impersonation ativa - permitindo rota no admin');
          return;
        }
        window.location.href = window.location.protocol + '//' + window.location.host + '/admin/login';
        return;
      }

      if (!currentPath.startsWith('/admin')) {
        window.location.href = window.location.protocol + '//' + window.location.host + '/admin/login';
        return;
      }
    }
    
    if (shouldRedirect) {
      const targetUrl = getSubdomainUrl(targetSubdomain, currentPath);
      console.log('🔄 SubdomainGuard: REDIRECIONANDO', {
        from: window.location.href,
        to: targetUrl,
        targetSubdomain
      });
      window.location.href = targetUrl;
    } else {
      console.log('✅ SubdomainGuard: Nenhum redirecionamento necessário');
    }
  }, [currentSubdomain, location, getSubdomainUrl]);

  return <>{children}</>;
}
