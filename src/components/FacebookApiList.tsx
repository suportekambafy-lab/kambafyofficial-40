import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { useFacebookApiList } from '@/hooks/useFacebookApiList';

interface FacebookApiListProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function FacebookApiList({ productId, onSaveSuccess }: FacebookApiListProps) {
  const { apis, loading, addApi, updateApi, deleteApi } = useFacebookApiList(productId);
  const [newAccessToken, setNewAccessToken] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddApi = async () => {
    if (!newAccessToken.trim()) return;

    const success = await addApi({
      accessToken: newAccessToken,
      enabled: true
    });

    if (success) {
      setNewAccessToken('');
      setIsAdding(false);
      onSaveSuccess();
    }
  };

  const handleToggleApi = async (apiId: string, enabled: boolean, accessToken: string) => {
    await updateApi(apiId, { accessToken, enabled });
  };

  const handleDeleteApi = async (apiId: string) => {
    if (confirm('Tem certeza que deseja remover esta API?')) {
      const success = await deleteApi(apiId);
      if (success) {
        onSaveSuccess();
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando APIs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🔄 API de Conversões do Facebook (Server-Side)</h2>
        <p className="text-muted-foreground">
          Envia eventos de conversão direto do servidor. Mais confiável e não é bloqueado por ad-blockers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>APIs Configuradas ({apis.length})</span>
            {!isAdding && (
              <Button
                size="sm"
                onClick={() => setIsAdding(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar API
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <Card className="border-2 border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-api">Access Token da Nova API</Label>
                  <Input
                    id="new-api"
                    type="password"
                    placeholder="Digite o Access Token"
                    value={newAccessToken}
                    onChange={(e) => setNewAccessToken(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Token para API de Conversões do Facebook
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddApi} className="flex-1">
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setNewAccessToken('');
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {apis.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">Nenhuma API configurada</p>
              <Button onClick={() => setIsAdding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Primeira API
              </Button>
            </div>
          )}

          {apis.map((api) => (
            <Card key={api.id} className="border">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`api-${api.id}`}
                        checked={api.enabled}
                        onCheckedChange={(checked) =>
                          handleToggleApi(api.id!, checked, api.accessToken)
                        }
                      />
                      <Label htmlFor={`api-${api.id}`}>
                        {api.enabled ? 'Ativa' : 'Inativa'}
                      </Label>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Access Token
                      </Label>
                      <p className="font-mono text-sm font-medium truncate">
                        {api.accessToken.substring(0, 20)}...
                      </p>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteApi(api.id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
