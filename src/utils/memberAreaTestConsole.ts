// Funções de teste para área de membros - disponíveis no console
declare global {
  interface Window {
    testMemberAreaLogin: () => void;
    testMemberAreaDirect: () => void;
    testMemberAreaLoginWithEmail: (email?: string) => void;
  }
}

// Testa o login da área de membros - CORRIGIDO para navegação puramente interna
window.testMemberAreaLogin = () => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const targetPath = `/login/${memberAreaId}`;
  
  console.log('🚀 TESTANDO LOGIN ÁREA DE MEMBROS - Navegação 100% INTERNA:', {
    memberAreaId,
    targetPath,
    expectedEmail: 'victormuabi20@gmail.com',
    currentUrl: window.location.href,
    currentPathname: window.location.pathname,
    hostname: window.location.hostname
  });
  
  console.log('🔍 Ambiente atual:', {
    hostname: window.location.hostname,
    isPreview: window.location.hostname.includes('lovable') || window.location.hostname.includes('localhost'),
    currentSubdomain: window.location.hostname.split('.')[0],
    shouldWorkDirectly: true,
    note: 'Na pré-visualização, todas as rotas devem funcionar diretamente'
  });
  
  console.log('🧭 INICIANDO navegação interna para:', targetPath);
  
  try {
    // Método 1: Usar history.pushState para mudar URL sem reload
    const newUrl = window.location.origin + targetPath;
    console.log('📍 Mudando URL de:', window.location.href, 'para:', newUrl);
    
    window.history.pushState({ testNavigation: true }, '', targetPath);
    
    // Método 2: Forçar React Router a detectar a mudança
    const popStateEvent = new PopStateEvent('popstate', { 
      state: { testNavigation: true } 
    });
    window.dispatchEvent(popStateEvent);
    
    // Método 3: Se os métodos acima não funcionarem, forçar re-render
    setTimeout(() => {
      console.log('🔄 Verificando se navegação funcionou:', {
        currentPathname: window.location.pathname,
        targetPath,
        success: window.location.pathname === targetPath
      });
      
      if (window.location.pathname !== targetPath) {
        console.warn('⚠️ Navegação não funcionou, tentando método alternativo...');
        // Método alternativo: trigger manual do router
        window.dispatchEvent(new Event('popstate'));
      } else {
        console.log('✅ NAVEGAÇÃO INTERNA SUCESSO!');
        console.log('📧 Agora use o email:', 'victormuabi20@gmail.com');
        console.log('👤 Nome: Victor Muabi');
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ ERRO na navegação interna:', error);
  }
};

// Testa acesso direto à área de membros (deve redirecionar para login)
window.testMemberAreaDirect = () => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const directPath = `/area/${memberAreaId}`;
  
  console.log('🎯 CORRIGIDO: Testando acesso direto à área (navegação interna):', {
    memberAreaId,
    directPath,
    expectedBehavior: 'Deve redirecionar para login se não autenticado',
    currentHost: window.location.hostname
  });
  
  // NAVEGAÇÃO INTERNA - sem URLs externos
  try {
    window.history.pushState({}, '', directPath);
    const popStateEvent = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(popStateEvent);
    
    console.log('✅ Navegação interna para área realizada!');
    console.log('📍 Nova URL:', window.location.href);
  } catch (error) {
    console.error('❌ Erro na navegação:', error);
  }
};

// Teste com email específico (para debug)
window.testMemberAreaLoginWithEmail = (email = 'victormuabi20@gmail.com') => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const directPath = `/login/${memberAreaId}`;
  
  console.log('🔍 CORRIGIDO: Login com email específico (navegação interna):', {
    memberAreaId,
    directPath,
    email,
    note: 'Use este email no formulário quando a página carregar'
  });
  
  // NAVEGAÇÃO INTERNA
  try {
    window.history.pushState({}, '', directPath);
    const popStateEvent = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(popStateEvent);
    
    console.log('✅ Navegação interna com email específico realizada!');
    console.log('📧 Email para usar:', email);
  } catch (error) {
    console.error('❌ Erro na navegação:', error);
  }
};

// Log inicial das funções disponíveis
console.log('🧪 FUNÇÕES DE TESTE ÁREA DE MEMBROS CORRIGIDAS:');
console.log('🔗 testMemberAreaLogin() - Navegação INTERNA para login (SEM redirecionamento!)');
console.log('🎯 testMemberAreaDirect() - Navegação INTERNA para área');
console.log('📧 testMemberAreaLoginWithEmail("email") - Login interno com email específico');
console.log('');
console.log('💡 CORREÇÃO APLICADA:');
console.log('✅ Todas as funções agora usam NAVEGAÇÃO INTERNA');
console.log('✅ Sem window.location.reload()');
console.log('✅ Sem URLs externos (kambafy.com)');
console.log('✅ Funciona na pré-visualização do Lovable');
console.log('');
console.log('🚀 Para testar: testMemberAreaLogin()');
console.log('📧 Email: victormuabi20@gmail.com');
console.log('👤 Nome: Victor Muabi (qualquer nome)');

export {};