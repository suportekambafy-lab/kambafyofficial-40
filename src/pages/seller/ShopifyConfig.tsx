import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store, Key, CreditCard, Smartphone, Building2, Copy, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface StoreConfig {
  shop_domain: string;
  settings: {
    payment_methods: {
      express: boolean;
      reference: boolean;
      card: boolean;
    };
  };
  is_active: boolean;
  installed_at: string;
  kambafy_api_key: string | null;
}

export default function ShopifyConfig() {
  const [searchParams] = useSearchParams();
  const shopDomain = searchParams.get('shop');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({
    express: true,
    reference: true,
    card: true
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shopDomain) {
      loadStoreConfig();
    }
  }, [shopDomain]);

  const loadStoreConfig = async () => {
    try {
      const { data } = await supabase.functions.invoke('shopify-app', {
        body: null,
        method: 'GET',
        headers: {}
      });
      
      // Use fetch directly since invoke doesn't support query params well
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-app/config?shop=${shopDomain}`
      );
      const result = await response.json();
      
      if (result.store) {
        setStore(result.store);
        setPaymentMethods(result.store.settings?.payment_methods || {
          express: true,
          reference: true,
          card: true
        });
      }
    } catch (error) {
      console.error('Error loading store config:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!shopDomain) return;
    
    setSaving(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-app/config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopDomain,
            kambafyApiKey: apiKey || undefined,
            settings: { payment_methods: paymentMethods }
          })
        }
      );
      
      if (response.ok) {
        toast.success('Configuração salva com sucesso!');
        if (apiKey) setApiKey('');
        loadStoreConfig();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const copyPaymentLink = () => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-app/pay/`;
    navigator.clipboard.writeText(baseUrl + '{ORDER_ID}');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  };

  if (!shopDomain) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loja não especificada</h2>
            <p className="text-muted-foreground">
              Acesse esta página através do painel da Shopify ou instale a app primeiro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Carregando configuração...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">Kambafy Pay para Shopify</h1>
          <p className="text-muted-foreground">Configure os pagamentos da sua loja</p>
        </div>
      </div>

      {/* Store Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Loja</CardTitle>
            <Badge variant={store?.is_active ? 'default' : 'secondary'}>
              {store?.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <a 
              href={`https://${shopDomain}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {shopDomain}
            </a>
          </div>
          {store?.installed_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Instalada em: {new Date(store.installed_at).toLocaleDateString('pt-AO')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chave API Kambafy
          </CardTitle>
          <CardDescription>
            Configure a sua chave API para processar pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {store?.kambafy_api_key && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Chave configurada: {store.kambafy_api_key}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              {store?.kambafy_api_key ? 'Atualizar chave API' : 'Chave API'}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="kp_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Obtenha a sua chave API no painel de parceiros da Kambafy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
          <CardDescription>
            Escolha quais métodos de pagamento quer disponibilizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Multicaixa Express</p>
                <p className="text-xs text-muted-foreground">Pagamento via push no telemóvel</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.express}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, express: checked }))}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Referência Multicaixa</p>
                <p className="text-xs text-muted-foreground">Pagamento no ATM ou Internet Banking</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.reference}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, reference: checked }))}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Cartão de Crédito/Débito</p>
                <p className="text-xs text-muted-foreground">Visa, Mastercard, etc.</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.card}
              onCheckedChange={(checked) => setPaymentMethods(prev => ({ ...prev, card: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instruções de Integração</CardTitle>
          <CardDescription>
            Como adicionar Kambafy Pay à sua loja Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">1. Adicionar método de pagamento manual</p>
            <p className="text-xs text-muted-foreground">
              Vá a Configurações → Pagamentos → Pagamento manual → Adicionar método de pagamento personalizado
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">2. Configurar instruções de pagamento</p>
            <p className="text-xs text-muted-foreground">
              Nas instruções do método, inclua o link de pagamento abaixo:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-app/pay/{ORDER_ID}`}
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={copyPaymentLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">3. Gerar link de pagamento</p>
            <p className="text-xs text-muted-foreground">
              Use a API para gerar links de pagamento para pedidos específicos:
            </p>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`POST /shopify-app/generate-link
{
  "shopDomain": "${shopDomain}",
  "shopifyOrderId": "ORDER_ID",
  "amount": 5000,
  "currency": "AOA",
  "customerEmail": "cliente@email.com",
  "customerName": "Nome do Cliente"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={saveConfig} 
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? 'Salvando...' : 'Salvar Configuração'}
      </Button>
    </div>
  );
}