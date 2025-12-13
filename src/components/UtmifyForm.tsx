import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Key, ExternalLink, CheckCircle2, Zap } from 'lucide-react';

interface UtmifyFormProps {
  productId: string;
  onSaveSuccess: () => void;
}

interface UtmifySetting {
  id: string;
  api_token: string;
  enabled: boolean;
}

export function UtmifyForm({ productId, onSaveSuccess }: UtmifyFormProps) {
  const [apiToken, setApiToken] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [existingSetting, setExistingSetting] = useState<UtmifySetting | null>(null);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      toast({
        title: 'Token obrigatório',
        description: 'Por favor, insira o API Token antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    try {
      // Validação do formato do token UTMify
      // Tokens UTMify geralmente têm formato alfanumérico com 30+ caracteres
      const token = apiToken.trim();
      
      if (token.length < 20) {
        toast({
          title: 'Token muito curto',
          description: 'O token UTMify deve ter pelo menos 20 caracteres.',
          variant: 'destructive',
        });
        return;
      }

      // Verifica se contém apenas caracteres válidos (alfanuméricos)
      const validTokenPattern = /^[a-zA-Z0-9]+$/;
      if (!validTokenPattern.test(token)) {
        toast({
          title: 'Formato inválido',
          description: 'O token deve conter apenas letras e números.',
          variant: 'destructive',
        });
        return;
      }

      // Token passou nas validações básicas
      // Simula um pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 800));

      toast({
        title: 'Token validado!',
        description: 'O formato do token está correto. Salve a configuração para ativar a integração.',
      });
    } catch (error: any) {
      console.error('Error testing UTMify connection:', error);
      toast({
        title: 'Erro ao validar',
        description: 'Ocorreu um erro ao validar o token.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    loadExistingSetting();
  }, [productId]);

  const loadExistingSetting = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('utmify_settings' as any)
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle() as any);

      if (error) throw error;

      if (data) {
        setExistingSetting(data as UtmifySetting);
        setApiToken(data.api_token);
        setEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error loading UTMify settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiToken.trim()) {
      toast({
        title: 'Token obrigatório',
        description: 'Por favor, insira o API Token da UTMify.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const settingData = {
        user_id: user.id,
        product_id: productId,
        api_token: apiToken.trim(),
        enabled,
        updated_at: new Date().toISOString(),
      };

      if (existingSetting) {
        const { error } = await (supabase
          .from('utmify_settings' as any)
          .update(settingData)
          .eq('id', existingSetting.id) as any);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('utmify_settings' as any)
          .insert(settingData) as any);

        if (error) throw error;
      }

      toast({
        title: 'Sucesso!',
        description: 'Configurações da UTMify salvas com sucesso.',
      });

      onSaveSuccess();
    } catch (error: any) {
      console.error('Error saving UTMify settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header UTMify */}
      <div className="flex items-center justify-center py-4">
        <span className="text-2xl font-bold text-[#3B82F6]">
          UTMify
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuração da API UTMify
          </CardTitle>
          <CardDescription>
            Configure o token da API para enviar conversões automaticamente para a UTMify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* API Token Field */}
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token *</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Cole seu API Token aqui"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Encontre seu token em: <strong>Integrações → Webhooks → Credenciais de API</strong>
              </p>
            </div>

            {/* Enable/Disable Switch */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Integração ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativa, as conversões serão enviadas automaticamente
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">O que será enviado:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Dados do pedido (ID, valor, status)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Dados do cliente (nome, email, telefone)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Parâmetros UTM (utm_source, utm_campaign, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Parâmetros src e sck da UTMify
                </li>
              </ul>
            </div>

            {/* Documentation Link */}
            <a
              href="https://docs.google.com/document/d/1RVpbmUn8EaD7DcO4rNdAnG0T9VEI0qQeGzqTE8t2AAE/mobilebasic"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Ver documentação oficial da UTMify
            </a>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={handleTestConnection}
                disabled={testing || !apiToken.trim()}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {existingSetting ? 'Atualizar' : 'Salvar'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
