
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
    // Isso evita QUALQUER verificação desnecessária que poderia causar reload
    if (currentSubdomain === 'admin' && currentPath.startsWith('/admin')) {
      return; // Navegação interna do React Router - ZERO interferência
    }
    
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
    
    // DESENVOLVIMENTO/PREVIEW: Para ambientes de desenvolvimento OU Lovable, NUNCA fazer redirecionamentos
    // Isso inclui localhost, 127.0.0.1, lovable.app e lovableproject.com
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || 
        hostname.includes('lovable.app') || hostname.includes('lovableproject.com')) {
      console.log('🔧 SubdomainGuard: PRÉ-VISUALIZAÇÃO/DEV - NENHUM redirecionamento', {
        currentSubdomain,
        currentPath,
        hostname,
        message: '✅ TODAS as rotas (incluindo /login/:id e /area/:id) funcionam diretamente - sem reloads!'
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
    // Áreas específicas: /login/:id, /area/:id
    if (currentPath.startsWith('/area/') || currentPath.startsWith('/login/') || 
        currentPath.startsWith('/members/login') || 
        currentPath.startsWith('/members/area')) {
      console.log('🎓 SubdomainGuard: DETECTADA rota de área de membros em PRODUÇÃO', {
        currentPath,
        currentSubdomain,
        hostname,
        isSpecificArea: currentPath.includes('/login/') || currentPath.includes('/area/'),
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
        }
        
        const targetUrl = `${window.location.protocol}//membros.kambafy.com${cleanPath}`;
        console.log('🔄 SubdomainGuard: REDIRECIONANDO área de membros para subdomínio correto', {
          from: window.location.href,
          to: targetUrl,
          isSpecificArea: cleanPath.includes('/login/') || cleanPath.includes('/area/'),
          reason: 'Área de membros SEMPRE usa membros.kambafy.com em produção'
        });
        window.location.href = targetUrl;
        return;
      }
    }
    
    // Define quais rotas são RESTRITAS de cada subdomínio (não permitidas)
    // NOTA: /login/:id e /area/:id são tratadas separadamente
    // ✅ Como o app.kambafy.com foi descontinuado, rotas de app (ex: /auth, /vendedor)
    // agora são permitidas diretamente em kambafy.com.
    const restrictedFromMain = ['/admin'];
    const restrictedFromApp = ['/checkout', '/obrigado', '/admin'];
    const restrictedFromPay = ['/admin'];
    const restrictedFromAdmin = ['/checkout', '/obrigado', '/auth', '/vendedor', '/apps', '/meus-acessos'];
    
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
          currentPath.startsWith('/denuncie') ||
          currentPath.startsWith('/status') ||
          currentPath.startsWith('/privacidade') ||
          currentPath.startsWith('/termos') ||
          currentPath.startsWith('/cookies')) {
        return; // Manter no domínio principal
      }
      
      // Apenas restringir rotas específicas de admin
      if (restrictedFromMain.some(route => currentPath.startsWith(route))) {
        shouldRedirect = true;
        targetSubdomain = 'admin';
      }
    } else if (currentSubdomain === 'app') {
      // app.kambafy.com: SEMPRE redirecionar para kambafy.com (domínio principal)
      // O redirecionamento é feito diretamente para evitar loops
      const targetUrl = `https://kambafy.com${currentPath}`;
      console.log('🔄 SubdomainGuard: Redirecionando app.kambafy.com para kambafy.com', {
        from: window.location.href,
        to: targetUrl
      });
      window.location.replace(targetUrl); // Usar replace para não adicionar ao histórico
      return;
    } else if (currentSubdomain === 'membros') {
      // membros.kambafy.com: permitir APENAS rotas de área de membros
      // ✅ Áreas específicas: /login/:id, /area/:id
      const isSpecificArea = currentPath.match(/^\/(login|area)\/[^/]+/);
      
      console.log('🎓 SubdomainGuard: Verificando subdomínio MEMBROS', {
        currentPath,
        isSpecificArea: !!isSpecificArea,
        isValidMemberRoute: !!isSpecificArea
      });
      
      // ✅ Permitir apenas áreas específicas
      if (isSpecificArea) {
        console.log('✅ SubdomainGuard: Rota PERMITIDA no membros', {
          currentPath,
          type: 'área específica',
          message: 'Usuário acessando área de membros específica'
        });
        return; // Permitir acesso sem redirecionamento
      }
      
      // ❌ Se NÃO é área específica, redirecionar para kambafy.com
      console.log('❌ SubdomainGuard: Rota inválida para subdomínio membros', {
        currentPath,
        message: 'Redirecionando para kambafy.com (não é área de membros)'
      });
      window.location.href = 'https://kambafy.com';
      return;
    } else if (currentSubdomain === 'pay') {
      // pay.kambafy.com: permitir apenas checkout e obrigado
      if (!(currentPath.startsWith('/checkout') || currentPath.startsWith('/obrigado'))) {
        shouldRedirect = true;
        if (restrictedFromPay.some(route => currentPath.startsWith(route))) {
          if (currentPath.startsWith('/admin')) {
            targetSubdomain = 'admin';
          } else {
            targetSubdomain = 'main';
          }
        } else {
          targetSubdomain = 'main';
        }
      }
    } else if (currentSubdomain === 'admin') {
      // admin.kambafy.com: por padrão, FORÇAR apenas rotas /admin
      // EXCEÇÃO: durante impersonation, permitir /vendedor e /meus-acessos no MESMO subdomínio
      // para manter a sessão do Supabase (localStorage não compartilha entre subdomínios).
      const isImpersonating = !!localStorage.getItem('impersonation_data');

      if (currentPath.startsWith('/vendedor') || currentPath.startsWith('/meus-acessos')) {
        if (isImpersonating) {
          console.log('✅ SubdomainGuard: Admin impersonation ativa - permitindo rota no admin', {
            currentPath,
            currentSubdomain
          });
          return;
        }

        console.log('🚫 SubdomainGuard: Rota de app no admin sem impersonation - voltando ao login admin', {
          currentPath
        });
        window.location.href = window.location.protocol + '//' + window.location.host + '/admin/login';
        return;
      }

      if (!currentPath.startsWith('/admin')) {
        console.log('Admin subdomain: redirecting non-admin route to /admin/login');
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

      // ✅ Evitar loop: se o destino é igual à URL atual, não redirecionar
      if (targetUrl === window.location.href) {
        console.warn('⚠️ SubdomainGuard: destino igual à URL atual; ignorando para evitar refresh loop');
        return;
      }

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
