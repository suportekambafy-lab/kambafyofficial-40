
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
    
    // 🔍 Debug logging - Informações básicas
    console.log('🔍 SubdomainGuard: Analisando rota', {
      currentPath,
      currentSubdomain,
      hostname,
      fullLocation: window.location.href
    });
    
    // MOBILE É COMPLETAMENTE ISOLADO - sem redirecionamentos
    if (currentSubdomain === 'mobile') {
      console.log('📱 SubdomainGuard: Subdomínio MOBILE - sem redirecionamentos');
      return;
    }
    
    // Para ambiente Lovable/desenvolvimento, permitir rotas de membros no domínio principal
    const isLovableEnvironment = hostname.includes('localhost') || 
                                 hostname.includes('127.0.0.1') || 
                                 hostname.includes('lovable.app') ||
                                 (hostname.includes('kambafy.com') && !hostname.includes('app.') && !hostname.includes('admin.') && !hostname.includes('pay.'));
    
    if (isLovableEnvironment) {
      console.log('🔧 SubdomainGuard: Ambiente Lovable/desenvolvimento detectado', {
        currentSubdomain,
        currentPath,
        hostname,
        isLovableEnvironment,
        message: 'Permitindo rotas de membros no domínio principal'
      });
      
      // Em ambiente Lovable, permitir rotas de área de membros no domínio principal
      if (currentPath.startsWith('/login/') || currentPath.startsWith('/area/')) {
        console.log('✅ SubdomainGuard LOVABLE: Rota de área de membros permitida no domínio principal', {
          currentPath,
          currentSubdomain,
          hostname
        });
      }
      return;
    }
    
    // Define quais rotas são RESTRITAS de cada subdomínio (não permitidas)
    const restrictedFromMain = ['/auth', '/vendedor', '/apps', '/minhas-compras', '/admin', '/login/', '/area/']; 
    const restrictedFromApp = ['/checkout', '/obrigado', '/admin', '/area/', '/login/']; 
    const restrictedFromPay = ['/auth', '/vendedor', '/apps', '/minhas-compras', '/admin', '/area/', '/login/']; 
    const restrictedFromAdmin = ['/checkout', '/obrigado', '/auth', '/vendedor', '/apps', '/minhas-compras', '/area/', '/login/']; 
    
    // Verifica se a rota atual é restrita do subdomínio atual
    let shouldRedirect = false;
    let targetSubdomain: 'main' | 'app' | 'pay' | 'admin' | 'membros' = 'main';
    
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
        } else if (currentPath.startsWith('/login/') || currentPath.startsWith('/area/')) {
          targetSubdomain = 'membros';
        } else {
          targetSubdomain = 'app';
        }
      }
    } else if (currentSubdomain === 'app') {
      // app.kambafy.com: redirecionar landing page principal para o domínio main
      if (currentPath === '/' || currentPath === '') {
        shouldRedirect = true;
        targetSubdomain = 'main';
      } 
      else if (restrictedFromApp.some(route => currentPath.startsWith(route))) {
        shouldRedirect = true;
        if (currentPath.startsWith('/admin')) {
          targetSubdomain = 'admin';
        } else if (currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado')) {
          targetSubdomain = 'pay';
        } else if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/')) {
          targetSubdomain = 'membros';
        }
      }
    } else if (currentSubdomain === 'membros') {
      // membros.kambafy.com: permitir apenas rotas de área de membros (/login/ e /area/)
      console.log('🎓 SubdomainGuard: Verificando subdomínio MEMBROS', {
        currentPath,
        isLoginRoute: currentPath.startsWith('/login/'),
        isAreaRoute: currentPath.startsWith('/area/'),
        isValidMemberRoute: (currentPath.startsWith('/login/') || currentPath.startsWith('/area/'))
      });
      
      if (!(currentPath.startsWith('/login/') || currentPath.startsWith('/area/'))) {
        console.log('❌ SubdomainGuard: Rota inválida para subdomínio membros', {
          currentPath,
          message: 'Redirecionando para subdomínio apropriado'
        });
        shouldRedirect = true;
        if (currentPath.startsWith('/admin')) {
          targetSubdomain = 'admin';
        } else if (currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado')) {
          targetSubdomain = 'pay';
        } else if (currentPath.startsWith('/auth') || currentPath.startsWith('/vendedor') || 
            currentPath.startsWith('/apps') || currentPath.startsWith('/minhas-compras')) {
          targetSubdomain = 'app';
        } else {
          targetSubdomain = 'main';
        }
      } else {
        console.log('✅ SubdomainGuard: Rota válida para área de membros', currentPath);
      }
    } else if (currentSubdomain === 'pay') {
      // pay.kambafy.com: permitir apenas checkout e obrigado
      if (!(currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado'))) {
        shouldRedirect = true;
        if (restrictedFromPay.some(route => currentPath.startsWith(route))) {
          if (currentPath.startsWith('/admin')) {
            targetSubdomain = 'admin';
          } else if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/')) {
            targetSubdomain = 'membros';
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
      console.log('🔄 SubdomainGuard: REDIRECIONANDO', {
        from: window.location.href,
        to: targetUrl,
        reason: `Subdomínio ${currentSubdomain} não permite rota ${currentPath}`,
        targetSubdomain
      });
      window.location.href = targetUrl;
    } else {
      console.log('✅ SubdomainGuard: Nenhum redirecionamento necessário', {
        currentSubdomain,
        currentPath,
        message: 'Rota permitida no subdomínio atual'
      });
    }
  }, [currentSubdomain, location, getSubdomainUrl]);

  return <>{children}</>;
}
