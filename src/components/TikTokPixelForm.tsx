import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  ExternalLink,
  Monitor,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useTikTokPixelList } from '@/hooks/useTikTokPixelList';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import tiktokLogo from '@/assets/tiktok-logo.png';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TikTokPixelFormProps {
  productId: string;
  onSaveSuccess: () => void;
}

interface PixelEvent {
  id: string;
  name: string;
  description: string;
  highlight?: string;
}

const PIXEL_EVENTS: PixelEvent[] = [
  {
    id: 'purchase',
    name: 'Compras realizadas',
    description: 'Saiba quantas pessoas finalizaram a compra e chegaram até a',
    highlight: 'Página de obrigado'
  },
  {
    id: 'initiate_checkout',
    name: 'Visitas na Página de pagamento',
    description: 'Saiba quantas pessoas visitaram a sua Página de pagamento.'
  },
  {
    id: 'view_content',
    name: 'Visitas na Página de produto',
    description: 'Saiba quantas pessoas visitaram a sua Página de produto.'
  }
];

const isValidPixelId = (pixelId: string): boolean => {
  const cleanId = pixelId.trim();
  return /^[A-Z0-9]{10,30}$/i.test(cleanId);
};

type AddStep = 'pixel-id' | 'events';

export function TikTokPixelForm({
  productId,
  onSaveSuccess
}: TikTokPixelFormProps) {
  const {
    pixels,
    loading,
    addPixel,
    updatePixel,
    deletePixel
  } = useTikTokPixelList(productId);
  const [newPixelId, setNewPixelId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>('pixel-id');
  const [pixelError, setPixelError] = useState('');
  const [expandedPixel, setExpandedPixel] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['purchase', 'initiate_checkout', 'view_content']);

  const handlePixelIdChange = (value: string) => {
    setNewPixelId(value.toUpperCase());
    if (pixelError) setPixelError('');
  };

  const handleContinueToEvents = () => {
    if (!newPixelId.trim()) {
      setPixelError('Digite o Pixel ID do TikTok');
      return;
    }
    
    if (!isValidPixelId(newPixelId)) {
      setPixelError('O Pixel ID deve ter entre 10-30 caracteres alfanuméricos');
      toast.error('Pixel ID inválido', {
        description: 'O ID do TikTok Pixel deve ser alfanumérico (10-30 caracteres).'
      });
      return;
    }
    
    setAddStep('events');
  };

  const handleAddPixel = async () => {
    const success = await addPixel({
      pixelId: newPixelId.trim(),
      enabled: true,
      events: selectedEvents
    });
    if (success) {
      setNewPixelId('');
      setIsAdding(false);
      setAddStep('pixel-id');
      setPixelError('');
      onSaveSuccess();
      toast.success('Pixel do TikTok adicionado com sucesso!');
    }
  };

  const handleToggleEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleBackToPixelId = () => {
    setAddStep('pixel-id');
  };

  const handleTogglePixel = async (pixelId: string, enabled: boolean, pixelIdValue: string, events: string[]) => {
    await updatePixel(pixelId, {
      pixelId: pixelIdValue,
      enabled,
      events
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
    <div className="space-y-6">
      {/* Header com logo TikTok */}
      <div className="flex items-center justify-center py-4">
        <img 
          src={tiktokLogo} 
          alt="TikTok" 
          className="h-10 object-contain"
        />
      </div>

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
                            TikTok Pixel ID
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
                          <DropdownMenuItem onClick={() => handleTogglePixel(pixel.id!, !pixel.enabled, pixel.pixelId, pixel.events)}>
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
                        <div>
                          <span className="text-muted-foreground text-sm">Eventos rastreados:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {pixel.events.map(eventId => {
                              const event = PIXEL_EVENTS.find(e => e.id === eventId);
                              return event ? (
                                <Badge key={eventId} variant="secondary" className="text-xs">
                                  {event.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <a 
                            href="https://ads.tiktok.com/marketing_api/docs?id=1739585700402178" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Abrir TikTok Business Center
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
                Adicione seu TikTok Pixel para rastrear eventos de conversão no navegador dos visitantes.
              </p>
              <Button onClick={() => setIsAdding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Pixel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Formulário para adicionar novo pixel - Step 1: Pixel ID */}
        {isAdding && addStep === 'pixel-id' && (
          <Card className="border-2 border-primary/50 shadow-lg shadow-primary/5">
            <CardContent className="pt-6 space-y-5">
              {/* Header com logo TikTok */}
              <div className="flex items-center gap-2 pb-2">
                <img 
                  src={tiktokLogo} 
                  alt="TikTok" 
                  className="h-8 object-contain"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pixel" className="text-sm font-medium">
                  TikTok Pixel ID
                </Label>
                <Input 
                  id="new-pixel" 
                  placeholder="Ex: CBXXXXXXXXXXXXXX" 
                  value={newPixelId} 
                  onChange={e => handlePixelIdChange(e.target.value)} 
                  autoComplete="off"
                  maxLength={30}
                  className={`h-12 text-lg font-mono ${pixelError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {pixelError ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {pixelError}
                  </p>
                ) : (
                  <a 
                    href="https://ads.tiktok.com/help/article/how-to-create-a-tiktok-pixel" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Dúvidas? Aprenda a configurar um pixel do TikTok
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
                    setAddStep('pixel-id');
                  }} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleContinueToEvents} 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={!newPixelId || newPixelId.length < 10}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário para adicionar novo pixel - Step 2: Eventos */}
        {isAdding && addStep === 'events' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Quais eventos você quer receber?
              </h3>
              <p className="text-sm text-muted-foreground">
                Pixel ID: <span className="font-mono font-medium">{newPixelId}</span>
              </p>
            </div>

            <div className="space-y-3">
              {PIXEL_EVENTS.map((event) => (
                <Card 
                  key={event.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedEvents.includes(event.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-border/80'
                  }`}
                  onClick={() => handleToggleEvent(event.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => handleToggleEvent(event.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {event.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {event.description}
                          {event.highlight && (
                            <span className="font-semibold text-foreground"> {event.highlight}</span>
                          )}
                          {!event.highlight && '.'}
                          {event.highlight && ' do seu produto.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleBackToPixelId} 
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleAddPixel} 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={selectedEvents.length === 0}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
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
    </div>
  );
}
