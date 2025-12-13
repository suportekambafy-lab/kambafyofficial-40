import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Save } from 'lucide-react';

interface LiveChatConfigFormProps {
  productId: string;
  onSaveSuccess?: () => void;
}

interface ChatConfig {
  greeting: string;
  tone: string;
}

export function LiveChatConfigForm({ productId, onSaveSuccess }: LiveChatConfigFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<ChatConfig>({
    greeting: 'Olá! 👋 Como posso ajudar você hoje?',
    tone: 'friendly'
  });
  const [productName, setProductName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProductConfig();
  }, [productId]);

  const fetchProductConfig = async () => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('name, chat_enabled, chat_config')
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (product) {
        setProductName(product.name);
        setEnabled(product.chat_enabled || false);
        if (product.chat_config && typeof product.chat_config === 'object') {
          const chatConfig = product.chat_config as Record<string, unknown>;
          setConfig({
            greeting: (chatConfig.greeting as string) || 'Olá! 👋 Como posso ajudar você hoje?',
            tone: (chatConfig.tone as string) || 'friendly'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching product config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const configJson = JSON.parse(JSON.stringify(config));
      
      const { error } = await supabase
        .from('products')
        .update({
          chat_enabled: enabled,
          chat_config: configJson
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Configurações salvas!',
        description: enabled 
          ? 'O chat ao vivo está ativo para este produto.'
          : 'O chat ao vivo foi desativado para este produto.'
      });

      onSaveSuccess?.();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Chat ao Vivo IA
              </CardTitle>
              <CardDescription>
                Configure o chat para: {productName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="chat-enabled">Ativar</Label>
              <Switch
                id="chat-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Greeting Message */}
          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de Boas-vindas</Label>
            <Textarea
              id="greeting"
              value={config.greeting}
              onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
              placeholder="Digite a mensagem que aparecerá quando o cliente abrir o chat..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Esta mensagem será exibida automaticamente quando o cliente iniciar o chat.
            </p>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tom da Conversa</Label>
            <Select
              value={config.tone}
              onValueChange={(value) => setConfig({ ...config, tone: value })}
            >
              <SelectTrigger id="tone">
                <SelectValue placeholder="Selecione o tom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">🤗 Amigável</SelectItem>
                <SelectItem value="professional">💼 Profissional</SelectItem>
                <SelectItem value="casual">😊 Descontraído</SelectItem>
                <SelectItem value="formal">📋 Formal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define como a IA vai se comunicar com seus clientes.
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Prévia do Chat</Label>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
                  IA
                </div>
                <div className="bg-background rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">{config.greeting}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 justify-end">
                <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                  <p className="text-sm">Olá! Tenho uma dúvida sobre o produto.</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm">
                  👤
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
