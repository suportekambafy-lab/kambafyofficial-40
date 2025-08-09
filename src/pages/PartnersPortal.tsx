import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Activity, BarChart3, Code, Settings } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function PartnersPortal() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    monthlyUsage: 0,
    monthlyLimit: 1000000
  });
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "API key copiada para a área de transferência.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <SEO 
        title="Portal de Parceiros - KambaPay"
        description="Dashboard para parceiros KambaPay - gerir API keys, ver estatísticas e documentação"
      />
      
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/kambafy-logo.png" alt="KambaPay" className="h-8" />
              <span className="text-xl font-bold text-primary">Portal de Parceiros</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Status: Aprovado</Badge>
              <Button variant="outline">Suporte</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Gerir integração KambaPay, ver estatísticas e aceder à documentação
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center space-x-2">
              <Code className="w-4 h-4" />
              <span>API</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Transações Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">+12% vs mês anterior</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} KZ</div>
                  <p className="text-xs text-muted-foreground">+8% vs mês anterior</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uso Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.monthlyUsage.toLocaleString()} KZ</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((stats.monthlyUsage / stats.monthlyLimit) * 100)}% do limite
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Comissão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.5%</div>
                  <p className="text-xs text-muted-foreground">Por transação</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <CardDescription>Tarefas comuns e links úteis</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  <Code className="w-4 h-4 mr-2" />
                  Ver Documentação
                </Button>
                <Button variant="outline" className="justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  Testar API
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Webhooks
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            {/* API Key Management */}
            <Card>
              <CardHeader>
                <CardTitle>API Key</CardTitle>
                <CardDescription>
                  Use esta chave para autenticar requests à API KambaPay
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value="kp_demo1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard("kp_demo1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  ⚠️ Mantenha esta chave segura. Não a partilhe publicamente.
                </p>
              </CardContent>
            </Card>

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Documentação da API</CardTitle>
                <CardDescription>Exemplos de uso e endpoints disponíveis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Check Balance Example */}
                <div>
                  <h4 className="font-semibold mb-2">Verificar Saldo</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="text-green-600">GET</div>
                    <div className="mt-2">https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambapay-public-api/balance?email=user@example.com</div>
                    <div className="mt-2 text-muted-foreground">Headers:</div>
                    <div>x-api-key: your_api_key_here</div>
                  </div>
                </div>

                {/* Process Payment Example */}
                <div>
                  <h4 className="font-semibold mb-2">Processar Pagamento</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="text-blue-600">POST</div>
                    <div className="mt-2">https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambapay-public-api/payments</div>
                    <div className="mt-2 text-muted-foreground">Headers:</div>
                    <div>x-api-key: your_api_key_here</div>
                    <div>Content-Type: application/json</div>
                    <div className="mt-2 text-muted-foreground">Body:</div>
                    <div className="whitespace-pre-wrap">
{`{
  "email": "customer@example.com",
  "amount": 1000,
  "currency": "KZ",
  "orderId": "order_123",
  "customerName": "João Silva",
  "metadata": {
    "product": "Premium Plan"
  }
}`}
                    </div>
                  </div>
                </div>

                {/* Response Example */}
                <div>
                  <h4 className="font-semibold mb-2">Resposta de Sucesso</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="whitespace-pre-wrap">
{`{
  "success": true,
  "orderId": "order_123",
  "transactionId": "tx_abc123",
  "amount": 1000,
  "currency": "KZ"
}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics em Desenvolvimento</CardTitle>
                <CardDescription>
                  Gráficos detalhados e métricas avançadas estarão disponíveis em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Gráficos de analytics em desenvolvimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Webhooks</CardTitle>
                <CardDescription>
                  Configure URLs para receber notificações automáticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://seusite.com/webhooks/kambapay"
                  />
                </div>
                <div>
                  <Label>Eventos</Label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>payment.completed</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>payment.failed</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" />
                      <span>balance.updated</span>
                    </label>
                  </div>
                </div>
                <Button>Guardar Configurações</Button>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Conta</CardTitle>
                <CardDescription>Informações da empresa e limites</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Limite Mensal</Label>
                    <Input value="1,000,000 KZ" readOnly />
                  </div>
                  <div>
                    <Label>Taxa de Comissão</Label>
                    <Input value="2.5%" readOnly />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Para alterar estes limites, contacte o suporte.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}