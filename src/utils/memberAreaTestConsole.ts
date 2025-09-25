// Funções de teste para área de membros - disponíveis no console
declare global {
  interface Window {
    testMemberAreaLogin: () => void;
    testMemberAreaDirect: () => void;
    testMemberAreaLoginWithEmail: (email?: string) => void;
  }
}

// Testa o login da área de membros
window.testMemberAreaLogin = () => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const directPath = `/login/${memberAreaId}`;
  
  console.log('🚀 CORRIGIDO: Testando login da área de membros (navegação interna):', {
    memberAreaId,
    directPath,
    expectedEmail: 'victormuabi20@gmail.com',
    currentHost: window.location.hostname,
    fullCurrentUrl: window.location.href
  });
  
  console.log('🔍 Ambiente detectado:', {
    hostname: window.location.hostname,
    isLovablePreview: window.location.hostname.includes('lovable'),
    isLocalhost: window.location.hostname.includes('localhost'),
    isDevelopment: window.location.hostname.includes('lovableproject.com'),
    note: 'Usando navegação INTERNA - sem redirecionamentos!'
  });
  
  console.log('🧪 NAVEGAÇÃO INTERNA: Mudando para:', directPath);
  console.log('💡 Sem reload, sem URLs externos - apenas React Router!');
  
  // NAVEGAÇÃO INTERNA PURA - sem reload!
  try {
    // Usar apenas o history.pushState para navegação interna
    window.history.pushState({}, '', directPath);
    
    // Disparar evento de mudança de rota para o React Router
    const popStateEvent = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(popStateEvent);
    
    console.log('✅ Navegação interna realizada com sucesso!');
    console.log('📍 Nova URL:', window.location.href);
    console.log('📍 Pathname:', window.location.pathname);
    
  } catch (error) {
    console.error('❌ Erro na navegação interna:', error);
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