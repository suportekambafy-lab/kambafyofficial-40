import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Key, Zap } from 'lucide-react';
import utmifyLogo from '@/assets/utmify-logo.png';

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
  const handleTestConnection = async () => {
    if (!apiToken.trim()) {
      toast.error('Token obrigatório', {
        description: 'Por favor, insira o API Token antes de testar.',
      });
      return;
    }

    const token = apiToken.trim();
    
    if (token.length < 10) {
      toast.error('Token muito curto', {
        description: 'O token UTMify parece estar incompleto.',
      });
      return;
    }

    setTesting(true);
    
    try {
      console.log('🔵 Chamando edge function test-utmify-connection...');
      
      const { data, error } = await supabase.functions.invoke('test-utmify-connection', {
        body: { apiToken: token }
      });

      console.log('📥 Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ Erro da edge function:', error);
        toast.error('Erro de conexão', {
          description: error.message || 'Não foi possível testar a conexão.',
        });
        return;
      }

      if (data?.success) {
        toast.success('Conexão bem-sucedida!', {
          description: data.message || 'O sinal de teste foi enviado e validado pela UTMify.',
        });
      } else {
        toast.error(data?.error || 'Erro no teste', {
          description: data?.message || 'A UTMify retornou um erro.',
        });
      }
    } catch (error: any) {
      console.error('❌ UTMify test error:', error);
      toast.error('Erro de conexão', {
        description: 'Não foi possível conectar ao servidor de teste.',
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
      toast.error('Token obrigatório', {
        description: 'Por favor, insira o API Token da UTMify.',
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

      toast.success('Sucesso!', {
        description: 'Configurações da UTMify salvas com sucesso.',
      });

      onSaveSuccess();
    } catch (error: any) {
      console.error('Error saving UTMify settings:', error);
      toast.error('Erro ao salvar', {
        description: error.message || 'Ocorreu um erro ao salvar as configurações.',
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
        <img 
          src={utmifyLogo} 
          alt="UTMify" 
          className="h-10 object-contain"
        />
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
