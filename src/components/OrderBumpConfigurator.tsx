import { MultipleOrderBumpManager } from "./MultipleOrderBumpManager";

interface OrderBumpConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function OrderBumpConfigurator({ productId, onSaveSuccess }: OrderBumpConfiguratorProps) {
  const handleSaveSuccess = () => {
    // Disparar eventos para atualizar lista de integrações
    window.dispatchEvent(new CustomEvent('integrationCreated'));
    window.dispatchEvent(new CustomEvent('integrationUpdated'));
    onSaveSuccess();
  };

  return (
    <MultipleOrderBumpManager
      productId={productId}
      onSaveSuccess={handleSaveSuccess}
    />
  );
}