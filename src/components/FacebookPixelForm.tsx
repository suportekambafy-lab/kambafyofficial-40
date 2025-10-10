
import { FacebookPixelList } from './FacebookPixelList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFacebookApiSettings } from '@/hooks/useFacebookApiSettings';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  const { 
    settings: apiSettings, 
    setSettings: setApiSettings, 
    saveSettings: saveApiSettings,
    loading: apiLoading 
  } = useFacebookApiSettings();

  const handleSaveApi = async () => {
    const success = await saveApiSettings({ ...apiSettings, enabled: true });
    if (success) {
      onSaveSuccess();
    }
  };

  return (
    <div className="space-y-6">
      <FacebookPixelList productId={productId} onSaveSuccess={onSaveSuccess} />

      <Card>
        <CardHeader>
          <CardTitle>API de Conversões (Opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              name="facebook-access-token"
              type="text"
              placeholder="Digite o Access Token"
              value={apiSettings.accessToken}
              onChange={(e) => setApiSettings(prev => ({ ...prev, accessToken: e.target.value }))}
              autoComplete="off"
              data-form-type="other"
            />
            <p className="text-xs text-muted-foreground">
              Token para API de Conversões do Facebook (opcional)
            </p>
          </div>

          <Button onClick={handleSaveApi} className="w-full" size="lg">
            Salvar API de Conversões
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
