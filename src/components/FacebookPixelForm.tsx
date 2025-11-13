
import { FacebookPixelList } from './FacebookPixelList';
import { FacebookApiList } from './FacebookApiList';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
        <h2 className="text-2xl font-bold">Integrações com Facebook</h2>
        <p className="text-muted-foreground">
          Configure <strong>AMBAS</strong> as integrações para máxima precisão no rastreamento:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground ml-6 list-disc">
          <li>
            <strong>Facebook Pixel</strong> (Client-Side) - Rastreia eventos no navegador do usuário
          </li>
          <li>
            <strong>API de Conversões</strong> (Server-Side) - Envia eventos direto do servidor, não é bloqueado por ad-blockers
          </li>
        </ul>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-primary/20">
          💡 <strong>Dica:</strong> Usar ambas as integrações juntas melhora a precisão dos dados e a performance das campanhas
        </p>
      </div>

      <FacebookPixelList productId={productId} onSaveSuccess={onSaveSuccess} />
      <FacebookApiList productId={productId} onSaveSuccess={onSaveSuccess} />
    </div>
  );
}
