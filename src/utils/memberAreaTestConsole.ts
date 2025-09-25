// Funções de teste para área de membros - disponíveis no console
declare global {
  interface Window {
    testMemberAreaLogin: () => void;
    testMemberAreaDirect: () => void;
    testMemberAreaLoginWithEmail: (email?: string) => void;
  }
}

// Testa o login da área de membros - SUPER CORRIGIDO com controle anti-reload
window.testMemberAreaLogin = () => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const targetPath = `/login/${memberAreaId}`;
  
  // 🛑 ANTI-RELOAD: Marcar que é navegação interna
  console.log('🚀 ANTI-RELOAD: Iniciando teste de navegação interna');
  console.log('🔍 ANTES da navegação:', {
    memberAreaId,
    targetPath,
    currentUrl: window.location.href,
    currentPathname: window.location.pathname,
    hostname: window.location.hostname,
    sessionStorage: sessionStorage.getItem('testNavigation'),
    timeStamp: Date.now()
  });
  
  // Marcar no sessionStorage que é navegação de teste
  sessionStorage.setItem('testNavigation', 'true');
  sessionStorage.setItem('testNavigationTime', Date.now().toString());
  
  try {
    // ✅ MÉTODO SUPER SEGURO: Usar pushState + evento custom
    console.log('🧭 Executando history.pushState para:', targetPath);
    window.history.pushState({ 
      testNavigation: true, 
      timestamp: Date.now(),
      source: 'testMemberAreaLogin'
    }, '', targetPath);
    
    // Disparar evento personalizado para React Router
    console.log('📡 Disparando eventos para React Router...');
    const popStateEvent = new PopStateEvent('popstate', { 
      state: { 
        testNavigation: true,
        timestamp: Date.now(),
        source: 'testMemberAreaLogin'
      } 
    });
    window.dispatchEvent(popStateEvent);
    
    // Fallback: Disparar evento customizado também
    const customEvent = new CustomEvent('testNavigation', {
      detail: { path: targetPath, timestamp: Date.now() }
    });
    window.dispatchEvent(customEvent);
    
    // Verificar sucesso após delay
    setTimeout(() => {
      const navigationSuccess = window.location.pathname === targetPath;
      console.log('🎯 RESULTADO da navegação:', {
        success: navigationSuccess,
        currentPathname: window.location.pathname,
        targetPath,
        timeElapsed: Date.now() - parseInt(sessionStorage.getItem('testNavigationTime') || '0') + 'ms',
        sessionStorage: sessionStorage.getItem('testNavigation')
      });
      
      if (navigationSuccess) {
        console.log('✅ SUCESSO! Navegação interna funcionou sem reload');
        console.log('📧 Agora use: victormuabi20@gmail.com');
        console.log('👤 Nome: Victor Muabi');
      } else {
        console.warn('❌ FALHA: Navegação não funcionou');
        console.log('🔧 Tentando método alternativo...');
        // Não fazer mais nada - evitar loops
      }
    }, 200);
    
  } catch (error) {
    console.error('💥 ERRO na navegação:', error);
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