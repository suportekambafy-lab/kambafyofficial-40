
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
      fullLocation: window.location.href,
      isMemberAreaRoute: currentPath.startsWith('/area/') || currentPath.startsWith('/login/')
    });
    
    // ⚠️ CRÍTICO: ROTA /app NUNCA PODE SER REDIRECIONADA PARA kambafy.com
    // A rota /app é completamente isolada e independente
    if (currentPath.startsWith('/app')) {
      console.log('🚀 SubdomainGuard: Rota /app detectada', {
        currentPath,
        hostname,
        currentSubdomain,
        isProduction: hostname.includes('kambafy.com'),
        isDev: hostname.includes('localhost') || hostname.includes('lovable.app')
      });
      
      // Se estamos em PRODUÇÃO kambafy.com E não estamos em mobile.kambafy.com
      if (hostname.includes('kambafy.com') && !hostname.includes('localhost') && !hostname.includes('lovable.app')) {
        if (currentSubdomain !== 'mobile') {
          // FORÇAR redirecionamento para mobile.kambafy.com
          const mobileUrl = `${window.location.protocol}//mobile.kambafy.com${currentPath}`;
          console.log('🔄 SubdomainGuard: FORÇANDO /app para mobile.kambafy.com', {
            from: window.location.href,
            to: mobileUrl,
            reason: 'Rota /app DEVE estar em mobile.kambafy.com em produção'
          });
          window.location.href = mobileUrl;
          return;
        } else {
          console.log('✅ SubdomainGuard: /app já está em mobile.kambafy.com');
          return;
        }
      }
      
      // Em desenvolvimento, permitir sem redirecionamento
      console.log('✅ SubdomainGuard: /app permitida em desenvolvimento');
      return;
    }
    
    // PRIMEIRA VERIFICAÇÃO: Pular guard para rotas de teste
    if (currentPath.includes('/teste')) {
      console.log('🧪 TESTE: SubdomainGuard pulando verificação para rota de teste:', currentPath);
      return;
    }
    
    // DESENVOLVIMENTO/PREVIEW: Para ambientes de desenvolvimento, NUNCA fazer redirecionamentos
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || 
        hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      console.log('🔧 SubdomainGuard: PRÉ-VISUALIZAÇÃO/DEV - NENHUM redirecionamento', {
        currentSubdomain,
        currentPath,
        hostname,
        message: '✅ TODAS as rotas funcionam diretamente - sem reloads!'
      });
      return;
    }
    
    // TERCEIRA VERIFICAÇÃO: Para domínios customizados (não kambafy.com), também não fazer redirecionamentos
    if (!hostname.includes('kambafy.com')) {
      console.log('🔧 SubdomainGuard: DOMÍNIO CUSTOMIZADO - Sem redirecionamentos', {
        currentSubdomain,
        currentPath,
        hostname,
        message: 'TODAS as rotas funcionam diretamente em domínios customizados'
      });
      return;
    }
    
    // QUARTA VERIFICAÇÃO: MOBILE É COMPLETAMENTE ISOLADO - APENAS /app e /mobile
    if (currentSubdomain === 'mobile') {
      // Mobile subdomain APENAS pode acessar /app e /mobile
      if (!(currentPath.startsWith('/app') || currentPath.startsWith('/mobile') || currentPath === '/' || currentPath === '')) {
        console.log('🚫 SubdomainGuard: MOBILE - Bloqueando acesso a rota não permitida', {
          currentPath,
          message: 'Mobile subdomain só pode acessar /app e /mobile'
        });
        // Redirecionar para /app
        window.location.href = window.location.protocol + '//' + window.location.host + '/app';
        return;
      }
      console.log('✅ SubdomainGuard: Subdomínio MOBILE - rota permitida', currentPath);
      return;
    }
    
    // QUINTA VERIFICAÇÃO: ÁREA DE MEMBROS - SEMPRE redirecionar para membros.kambafy.com
    if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/') || 
        currentPath === '/dashboard' || currentPath === '/members/dashboard' ||
        currentPath.startsWith('/members/login') || currentPath.startsWith('/members/area')) {
      console.log('🎓 SubdomainGuard: DETECTADA rota de área de membros em PRODUÇÃO', {
        currentPath,
        currentSubdomain,
        hostname,
        message: 'Verificando se deve redirecionar para subdomínio membros'
      });
      
      // Se NÃO estamos no subdomínio membros, redirecionar
      if (currentSubdomain !== 'membros') {
        // Remover prefixo /members se existir
        let cleanPath = currentPath;
        if (currentPath.startsWith('/members/login')) {
          cleanPath = currentPath.replace('/members/login', '/login');
        } else if (currentPath.startsWith('/members/area')) {
          cleanPath = currentPath.replace('/members/area', '/area');
        } else if (currentPath === '/members/dashboard') {
          cleanPath = '/dashboard';
        }
        
        const targetUrl = `${window.location.protocol}//membros.kambafy.com${cleanPath}`;
        console.log('🔄 SubdomainGuard: REDIRECIONANDO área de membros para subdomínio correto', {
          from: window.location.href,
          to: targetUrl,
          reason: 'Área de membros SEMPRE usa membros.kambafy.com em produção'
        });
        window.location.href = targetUrl;
        return;
      }
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
      // membros.kambafy.com: permitir rotas de área de membros (/login, /dashboard, /login/:id, /area/:id)
      // NUNCA redirecionar para kambafy.com - manter sempre em membros.kambafy.com
      console.log('🎓 SubdomainGuard: Verificando subdomínio MEMBROS', {
        currentPath,
        isLoginRoute: currentPath.startsWith('/login'),
        isAreaRoute: currentPath.startsWith('/area'),
        isDashboard: currentPath === '/dashboard',
        isValidMemberRoute: (currentPath.startsWith('/login') || currentPath.startsWith('/area') || currentPath === '/dashboard')
      });
      
      if (!(currentPath.startsWith('/login') || currentPath.startsWith('/area') || currentPath === '/dashboard')) {
        console.log('❌ SubdomainGuard: Rota inválida para subdomínio membros', {
          currentPath,
          message: 'Redirecionando para /login dentro de membros.kambafy.com'
        });
        // NUNCA redirecionar para kambafy.com - redirecionar para /login dentro do mesmo subdomínio
        window.location.href = window.location.protocol + '//' + window.location.host + '/login';
        return;
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
