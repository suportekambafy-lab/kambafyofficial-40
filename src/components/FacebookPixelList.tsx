import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useFacebookPixelList } from '@/hooks/useFacebookPixelList';
import { toast } from 'sonner';

interface FacebookPixelListProps {
  productId: string;
  onSaveSuccess: () => void;
}

// Validar se o Pixel ID é válido (apenas números, 15-16 dígitos)
const isValidPixelId = (pixelId: string): boolean => {
  const cleanId = pixelId.trim();
  // Facebook Pixel IDs são números de 15-16 dígitos
  return /^\d{15,16}$/.test(cleanId);
};

export function FacebookPixelList({
  productId,
  onSaveSuccess
}: FacebookPixelListProps) {
  const {
    pixels,
    loading,
    addPixel,
    updatePixel,
    deletePixel
  } = useFacebookPixelList(productId);
  const [newPixelId, setNewPixelId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [pixelError, setPixelError] = useState('');

  const handlePixelIdChange = (value: string) => {
    // Permitir apenas números
    const numericValue = value.replace(/\D/g, '');
    setNewPixelId(numericValue);
    
    // Limpar erro ao digitar
    if (pixelError) setPixelError('');
  };

  const handleAddPixel = async () => {
    if (!newPixelId.trim()) {
      setPixelError('Digite o ID do Pixel');
      return;
    }
    
    if (!isValidPixelId(newPixelId)) {
      setPixelError('O Pixel ID deve ter 15-16 dígitos numéricos');
      toast.error('Pixel ID inválido', {
        description: 'O ID do Facebook Pixel deve conter apenas números (15-16 dígitos). Encontre-o no Gerenciador de Eventos do Facebook.'
      });
      return;
    }
    
    const success = await addPixel({
      pixelId: newPixelId.trim(),
      enabled: true
    });
    if (success) {
      setNewPixelId('');
      setIsAdding(false);
      setPixelError('');
      onSaveSuccess();
      toast.success('Pixel adicionado com sucesso!');
    }
  };
  const handleTogglePixel = async (pixelId: string, enabled: boolean, pixelIdValue: string) => {
    await updatePixel(pixelId, {
      pixelId: pixelIdValue,
      enabled
    });
  };
  const handleDeletePixel = async (pixelId: string) => {
    if (confirm('Tem certeza que deseja remover este pixel?')) {
      const success = await deletePixel(pixelId);
      if (success) {
        onSaveSuccess();
      }
    }
  };
  if (loading) {
    return <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando pixels...</p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Facebook Pixel </h2>
        <p className="text-muted-foreground">
          Rastreamento de eventos no navegador do cliente. Adicione múltiplos pixels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pixels Configurados ({pixels.length})</span>
            {!isAdding && <Button size="sm" onClick={() => setIsAdding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Pixel
              </Button>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && <Card className="border-2 border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pixel">ID do Novo Pixel</Label>
                  <Input 
                    id="new-pixel" 
                    placeholder="Ex: 123456789012345" 
                    value={newPixelId} 
                    onChange={e => handlePixelIdChange(e.target.value)} 
                    autoComplete="off"
                    maxLength={16}
                    className={pixelError ? 'border-destructive' : ''}
                  />
                  {pixelError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {pixelError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      O Pixel ID é um número de 15-16 dígitos. Encontre-o em: Facebook Events Manager → Data Sources → Seu Pixel
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddPixel} className="flex-1" disabled={!newPixelId || newPixelId.length < 15}>
                    Adicionar
                  </Button>
                  <Button variant="outline" onClick={() => {
                setIsAdding(false);
                setNewPixelId('');
                setPixelError('');
              }} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>}

          {pixels.length === 0 && !isAdding && <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">Nenhum pixel configurado</p>
              <Button onClick={() => setIsAdding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Pixel
              </Button>
            </div>}

          {pixels.map(pixel => <Card key={pixel.id} className="border">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch id={`pixel-${pixel.id}`} checked={pixel.enabled} onCheckedChange={checked => handleTogglePixel(pixel.id!, checked, pixel.pixelId)} />
                      <Label htmlFor={`pixel-${pixel.id}`}>
                        {pixel.enabled ? 'Ativo' : 'Inativo'}
                      </Label>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Pixel ID
                      </Label>
                      <p className="font-mono text-sm font-medium">
                        {pixel.pixelId}
                      </p>
                    </div>
                  </div>

                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePixel(pixel.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>)}
        </CardContent>
      </Card>
    </div>;
}