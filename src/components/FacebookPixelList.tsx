import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  ExternalLink,
  Monitor
} from 'lucide-react';
import { useFacebookPixelList } from '@/hooks/useFacebookPixelList';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FacebookPixelListProps {
  productId: string;
  onSaveSuccess: () => void;
}

// Validar se o Pixel ID é válido (apenas números, 15-17 dígitos)
const isValidPixelId = (pixelId: string): boolean => {
  const cleanId = pixelId.trim();
  return /^\d{15,17}$/.test(cleanId);
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
  const [expandedPixel, setExpandedPixel] = useState<string | null>(null);

  const handlePixelIdChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setNewPixelId(numericValue);
    if (pixelError) setPixelError('');
  };

  const handleAddPixel = async () => {
    if (!newPixelId.trim()) {
      setPixelError('Digite o ID do Pixel');
      return;
    }
    
    if (!isValidPixelId(newPixelId)) {
      setPixelError('O Pixel ID deve ter 15-17 dígitos numéricos');
      toast.error('Pixel ID inválido', {
        description: 'O ID do Facebook Pixel deve conter apenas números (15-17 dígitos).'
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lista de Pixels Configurados */}
      {pixels.length > 0 && (
        <div className="space-y-3">
          {pixels.map((pixel) => (
            <Card key={pixel.id} className="overflow-hidden border-border/60 hover:border-border transition-colors">
              <Collapsible
                open={expandedPixel === pixel.id}
                onOpenChange={(open) => setExpandedPixel(open ? pixel.id! : null)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          ID do Pixel do Facebook
                        </Label>
                      </div>
                      <p className="font-mono text-lg font-semibold text-foreground">
                        {pixel.pixelId}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Evento via Web</span>
                        </div>
                        <Badge 
                          variant={pixel.enabled ? "default" : "secondary"}
                          className={pixel.enabled 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" 
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {pixel.enabled ? 'Configurado' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleTogglePixel(pixel.id!, !pixel.enabled, pixel.pixelId)}>
                          <Switch 
                            checked={pixel.enabled} 
                            className="mr-2 scale-75"
                            onCheckedChange={() => {}}
                          />
                          {pixel.enabled ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeletePixel(pixel.id!)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Pixel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground hover:text-foreground">
                      Detalhes da configuração
                      {expandedPixel === pixel.id ? (
                        <ChevronUp className="h-4 w-4 ml-2" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-2" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t border-border/40">
                    <div className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tipo de envio:</span>
                          <p className="font-medium">Client-side (Browser)</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${pixel.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            {pixel.enabled ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <a 
                          href="https://business.facebook.com/events_manager2" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Abrir Gerenciador de Eventos
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {pixels.length === 0 && !isAdding && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Monitor className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhum pixel configurado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Adicione seu Facebook Pixel para rastrear eventos de conversão no navegador dos visitantes.
            </p>
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Pixel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulário para adicionar novo pixel */}
      {isAdding && (
        <Card className="border-2 border-primary/50 shadow-lg shadow-primary/5">
          <CardContent className="pt-6 space-y-5">
            {/* Header com logos */}
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xl font-bold text-[#1877F2]" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
                facebook
              </span>
              <span className="text-lg text-muted-foreground">+</span>
              <span className="text-xl font-semibold bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] bg-clip-text text-transparent">
                Instagram
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-pixel" className="text-sm font-medium">
                ID do Pixel do Facebook
              </Label>
              <Input 
                id="new-pixel" 
                placeholder="Ex: 1234567890" 
                value={newPixelId} 
                onChange={e => handlePixelIdChange(e.target.value)} 
                autoComplete="off"
                maxLength={17}
                className={`h-12 text-lg font-mono ${pixelError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {pixelError ? (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {pixelError}
                </p>
              ) : (
                <a 
                  href="https://www.facebook.com/business/help/952192354843755" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Dúvidas? Aprenda a configurar um pixel do Facebook
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAdding(false);
                  setNewPixelId('');
                  setPixelError('');
                }} 
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddPixel} 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!newPixelId || newPixelId.length < 15}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão para adicionar mais pixels */}
      {pixels.length > 0 && !isAdding && (
        <Button 
          onClick={() => setIsAdding(true)} 
          variant="outline"
          className="w-full gap-2 h-12 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Adicionar Pixel
        </Button>
      )}
    </div>
  );
}
