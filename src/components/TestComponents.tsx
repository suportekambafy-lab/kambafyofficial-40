import { useEffect } from 'react';

export const TestAreaComponent = () => {
  useEffect(() => {
    console.log('🧪 TESTE: Elemento /area/teste sendo renderizado!');
    console.log('🧪 TESTE: Pathname atual:', window.location.pathname);
    console.log('🧪 TESTE: URL completa:', window.location.href);
  }, []);
  
  return (
    <div className="p-8 border border-green-500 bg-green-50">
      <h1 className="text-2xl font-bold text-green-800">🧪 TESTE: Rota /area/teste Funcionando!</h1>
      <p className="text-green-600">Navegação interna do React Router funcionando sem reload</p>
      <p className="text-sm text-green-600">Pathname: {window.location.pathname}</p>
      <p className="text-sm text-green-600">Host: {window.location.hostname}</p>
    </div>
  );
};

export const TestLoginComponent = () => {
  useEffect(() => {
    console.log('🧪 TESTE: Elemento /login/teste sendo renderizado!');
    console.log('🧪 TESTE: Pathname atual:', window.location.pathname);
    console.log('🧪 TESTE: URL completa:', window.location.href);
  }, []);
  
  return (
    <div className="p-8 border border-blue-500 bg-blue-50">
      <h1 className="text-2xl font-bold text-blue-800">🧪 TESTE: Rota /login/teste Funcionando!</h1>
      <p className="text-blue-600">Navegação interna do React Router funcionando sem reload</p>
      <p className="text-sm text-blue-600">Pathname: {window.location.pathname}</p>
      <p className="text-sm text-blue-600">Host: {window.location.hostname}</p>
    </div>
  );
};