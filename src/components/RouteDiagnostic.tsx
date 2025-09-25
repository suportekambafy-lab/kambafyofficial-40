import { useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';

export function RouteDiagnostic({ componentName }: { componentName: string }) {
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    console.log(`🔍 ${componentName} - Component mounted!`, {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      params,
      hostname: window.location.hostname,
      timestamp: new Date().toISOString()
    });
  }, [location, params, componentName]);

  return (
    <div className="p-4 border border-green-500 bg-green-50">
      <h2 className="font-bold text-green-800">{componentName} - Componente Carregado!</h2>
      <p className="text-sm text-green-600">Pathname: {location.pathname}</p>
      <p className="text-sm text-green-600">Params: {JSON.stringify(params)}</p>
    </div>
  );
}