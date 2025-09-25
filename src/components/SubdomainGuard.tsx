
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
    
    // TEMPORÁRIO: Pular guard para rotas de teste
    if (currentPath.includes('/teste')) {
      console.log('🧪 TESTE: SubdomainGuard pulando verificação para rota de teste:', currentPath);
      return;
    }
    
    // 🔍 Debug logging - Informações básicas
    console.log('🔍 SubdomainGuard: Analisando rota', {
      currentPath,
      currentSubdomain,
      hostname,
      fullLocation: window.location.href,
      isMemberAreaRoute: currentPath.startsWith('/area/') || currentPath.startsWith('/login/')
    });
    
    // MOBILE É COMPLETAMENTE ISOLADO - sem redirecionamentos
    if (currentSubdomain === 'mobile') {
      console.log('📱 SubdomainGuard: Subdomínio MOBILE - sem redirecionamentos');
      return;
    }
    
    // Para desenvolvimento/preview do Lovable, NUNCA fazer redirecionamentos
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      console.log('🔧 SubdomainGuard: PRÉ-VISUALIZAÇÃO/DEV - Sem redirecionamentos', {
        currentSubdomain,
        currentPath,
        hostname,
        isLovablePreview: hostname.includes('lovable.app'),
        message: 'TODAS as rotas funcionam diretamente na pré-visualização'
      });
      
      // Na pré-visualização do Lovable, todas as rotas devem funcionar sem redirecionamentos
      if (currentPath.startsWith('/login/') || currentPath.startsWith('/area/')) {
        console.log('🎓 SubdomainGuard: Área de membros funcionando na pré-visualização', {
          currentPath,
          currentSubdomain,
          message: 'Login e área de membros funcionam diretamente'
        });
      }
      
      if (currentPath.startsWith('/auth') || currentPath.startsWith('/vendedor') || currentPath.startsWith('/apps')) {
        console.log('🔐 SubdomainGuard: Rotas de autenticação funcionando na pré-visualização', {
          currentPath,
          message: 'Autenticação funciona diretamente na pré-visualização'
        });
      }
      
      console.log('✅ SubdomainGuard: ACESSO LIBERADO na pré-visualização', {
        currentPath,
        hostname,
        message: 'Todas as funcionalidades disponíveis diretamente'
      });
      return;
    }
    
    // Para domínios customizados (não kambafy.com), também não fazer redirecionamentos
    if (!hostname.includes('kambafy.com')) {
      console.log('🔧 SubdomainGuard: DOMÍNIO CUSTOMIZADO - Sem redirecionamentos', {
        currentSubdomain,
        currentPath,
        hostname,
        message: 'TODAS as rotas funcionam diretamente em domínios customizados'
      });
      return;
    }
    
    // VERIFICAÇÃO ESPECIAL PARA ÁREA DE MEMBROS
    if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/')) {
      console.log('🎓 SubdomainGuard: DETECTADA rota de área de membros', {
        currentPath,
        currentSubdomain,
        hostname,
        message: 'Verificando se deve redirecionar para subdomínio membros'
      });
      
      // Se estamos em kambafy.com (não no subdomínio membros), redirecionar
      if (currentSubdomain === 'main') {
        const targetUrl = getSubdomainUrl('membros', currentPath);
        console.log('🔄 SubdomainGuard: REDIRECIONANDO área de membros para subdomínio correto', {
          from: window.location.href,
          to: targetUrl,
          reason: 'Área de membros deve estar no subdomínio membros'
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
