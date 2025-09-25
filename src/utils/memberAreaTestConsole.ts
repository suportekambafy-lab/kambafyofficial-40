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
  const loginUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
  
  console.log('🚀 Testando login da área de membros:', {
    memberAreaId,
    loginUrl,
    expectedEmail: 'victormuabi20@gmail.com',
    instructions: 'Use o email: victormuabi20@gmail.com'
  });
  
  window.open(loginUrl, '_blank');
};

// Testa acesso direto à área de membros (deve redirecionar para login)
window.testMemberAreaDirect = () => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const areaUrl = `https://membros.kambafy.com/area/${memberAreaId}`;
  
  console.log('🎯 Testando acesso direto à área de membros:', {
    memberAreaId,
    areaUrl,
    expectedBehavior: 'Deve redirecionar para login se não autenticado'
  });
  
  window.open(areaUrl, '_blank');
};

// Teste com email específico (para debug)
window.testMemberAreaLoginWithEmail = (email = 'victormuabi20@gmail.com') => {
  const memberAreaId = '290b0398-c5f4-4681-944b-edc40f6fe0a2';
  const loginUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
  
  console.log('🔍 Testando login com email específico:', {
    memberAreaId,
    loginUrl,
    email,
    note: 'Lembre-se de usar este email no formulário'
  });
  
  window.open(loginUrl, '_blank');
};

// Log inicial das funções disponíveis
console.log('🧪 FUNÇÕES DE TESTE ÁREA DE MEMBROS CARREGADAS:');
console.log('🔗 testMemberAreaLogin() - Abre página de login');
console.log('🎯 testMemberAreaDirect() - Testa acesso direto à área');
console.log('📧 testMemberAreaLoginWithEmail("email") - Login com email específico');
console.log('');
console.log('💡 Para testar:');
console.log('1. testMemberAreaLogin() - abrir login');
console.log('2. Use o email: victormuabi20@gmail.com');
console.log('3. Nome: Victor Muabi (ou qualquer nome)');

export {};