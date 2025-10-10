
import { FacebookPixelList } from './FacebookPixelList';
import { FacebookApiList } from './FacebookApiList';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  return (
    <div className="space-y-8">
      <FacebookPixelList productId={productId} onSaveSuccess={onSaveSuccess} />
      <FacebookApiList productId={productId} onSaveSuccess={onSaveSuccess} />
    </div>
  );
}
