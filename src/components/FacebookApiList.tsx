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
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  ExternalLink,
  Server,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useFacebookApiList } from '@/hooks/useFacebookApiList';
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

interface FacebookApiListProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function FacebookApiList({
  productId,
  onSaveSuccess
}: FacebookApiListProps) {
  const {
    apis,
    loading,
    addApi,
    updateApi,
    deleteApi
  } = useFacebookApiList(productId);
  const [newAccessToken, setNewAccessToken] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [expandedApi, setExpandedApi] = useState<string | null>(null);
  const [showTokenMap, setShowTokenMap] = useState<Record<string, boolean>>({});

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
    await updateApi(apiId, {
      accessToken,
      enabled
    });
  };

  const handleDeleteApi = async (apiId: string) => {
    if (confirm('Tem certeza que deseja remover esta API?')) {
      const success = await deleteApi(apiId);
      if (success) {
        onSaveSuccess();
      }
    }
  };

  const toggleTokenVisibility = (apiId: string) => {
    setShowTokenMap(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
  };

  const maskToken = (token: string) => {
    if (token.length <= 20) return '•'.repeat(token.length);
    return token.substring(0, 10) + '•'.repeat(20) + token.substring(token.length - 10);
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
      {/* Lista de APIs Configuradas */}
      {apis.length > 0 && (
        <div className="space-y-3">
          {apis.map((api) => (
            <Card key={api.id} className="overflow-hidden border-border/60 hover:border-border transition-colors">
              <Collapsible
                open={expandedApi === api.id}
                onOpenChange={(open) => setExpandedApi(open ? api.id! : null)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          API de Conversões
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium text-foreground truncate max-w-[200px]">
                          {showTokenMap[api.id!] ? api.accessToken : maskToken(api.accessToken)}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => toggleTokenVisibility(api.id!)}
                        >
                          {showTokenMap[api.id!] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Server className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Evento via Servidor</span>
                        </div>
                        <Badge 
                          variant={api.enabled ? "default" : "secondary"}
                          className={api.enabled 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" 
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {api.enabled ? 'Configurado' : 'Inativo'}
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
                        <DropdownMenuItem onClick={() => handleToggleApi(api.id!, !api.enabled, api.accessToken)}>
                          <Switch 
                            checked={api.enabled} 
                            className="mr-2 scale-75"
                            onCheckedChange={() => {}}
                          />
                          {api.enabled ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteApi(api.id!)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover API
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground hover:text-foreground">
                      Detalhes da configuração
                      {expandedApi === api.id ? (
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
                          <p className="font-medium">Server-side (Servidor)</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${api.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            {api.enabled ? 'Ativo' : 'Inativo'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-muted-foreground">
                          Eventos enviados pelo servidor não são bloqueados por ad-blockers
                        </span>
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
      {apis.length === 0 && !isAdding && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Server className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhuma API configurada</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Configure a API de Conversões para enviar eventos diretamente do servidor, garantindo maior precisão.
            </p>
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar API
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulário para adicionar nova API */}
      {isAdding && (
        <Card className="border-2 border-primary/50 shadow-lg shadow-primary/5">
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center gap-2 pb-2">
              <Server className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">API de Conversões do Facebook</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-api" className="text-sm font-medium">
                Access Token
              </Label>
              <div className="relative">
                <Input 
                  id="new-api" 
                  type={showToken ? "text" : "password"}
                  placeholder="Digite o Access Token da API de Conversões" 
                  value={newAccessToken} 
                  onChange={e => setNewAccessToken(e.target.value)} 
                  autoComplete="off"
                  className="h-12 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <a 
                href="https://developers.facebook.com/docs/marketing-api/conversions-api/get-started" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Saiba como obter o Access Token
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Importante:</strong> O Access Token é uma credencial sensível. Nunca compartilhe com terceiros.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
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
              <Button 
                onClick={handleAddApi} 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!newAccessToken.trim()}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão para adicionar mais APIs */}
      {apis.length > 0 && !isAdding && (
        <Button 
          onClick={() => setIsAdding(true)} 
          variant="outline"
          className="w-full gap-2 h-12 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Adicionar API
        </Button>
      )}
    </div>
  );
}
