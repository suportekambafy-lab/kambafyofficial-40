import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Activity, BarChart3, Code, Settings, RefreshCw, ExternalLink, Webhook, FileText, AlertCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Helper para evitar inferência de tipo profunda do Supabase
const executeQuery = async <T,>(queryFn: () => any): Promise<{ data: T | null; error: any }> => {
  return await queryFn();
};

interface Partner {
  id: string;
  company_name: string;
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  status: string;
  commission_rate: number;
  monthly_transaction_limit: number;
  current_month_transactions: number;
  total_transactions: number;
  total_revenue: number;
}

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
  completed_at: string | null;
}

interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
}

export default function PartnersPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    if (user) {
      loadPartnerData();
    }
  }, [user]);

  const loadPartnerData = async () => {
    try {
      setLoading(true);

      // Buscar dados do parceiro - usando any para evitar deep type instantiation
      const { data: partnerData, error: partnerError } = await (supabase as any)
        .from('partners')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .single();

      if (partnerError || !partnerData) {
        toast({
          title: "Acesso Negado",
          description: "Você não é um parceiro aprovado. Cadastre-se primeiro.",
          variant: "destructive"
        });
        navigate('/partners/apply');
        return;
      }

      setPartner(partnerData as Partner);
      setWebhookUrl(partnerData.webhook_url || "");

      // Buscar pagamentos
      const { data: paymentsData } = await (supabase as any)
        .from('external_payments')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      setPayments((paymentsData || []) as Payment[]);

      // Buscar logs de API
      const { data: logsData } = await (supabase as any)
        .from('api_usage_logs')
        .select('*')
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      setApiLogs((logsData || []) as ApiLog[]);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const saveWebhookSettings = async () => {
    if (!partner) return;

    setSavingWebhook(true);
    try {
      const { error } = await supabase
        .from('partners')
        .update({ 
          webhook_url: webhookUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', partner.id);

      if (error) throw error;

      setPartner({ ...partner, webhook_url: webhookUrl || null });
      toast({
        title: "Sucesso",
        description: "Configurações de webhook atualizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingWebhook(false);
    }
  };

  const regenerateWebhookSecret = async () => {
    if (!partner) return;

    const newSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
    
    try {
      const { error } = await supabase
        .from('partners')
        .update({ 
          webhook_secret: newSecret,
          updated_at: new Date().toISOString()
        })
        .eq('id', partner.id);

      if (error) throw error;

      setPartner({ ...partner, webhook_secret: newSecret });
      toast({
        title: "Sucesso",
        description: "Novo webhook secret gerado. Atualize sua aplicação.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Concluído</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'expired':
        return <Badge variant="outline">Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    totalPayments: payments.length,
    completedPayments: payments.filter(p => p.status === 'completed').length,
    totalVolume: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0),
    pendingPayments: payments.filter(p => p.status === 'pending').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <SEO 
        title="Portal de Parceiros - Kambafy Payments"
        description="Dashboard para parceiros Kambafy - gerenciar API keys, ver estatísticas e documentação"
      />
      
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold">Portal de Parceiros</span>
                <p className="text-sm text-muted-foreground">{partner.company_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={partner.status === 'approved' ? 'default' : 'secondary'}>
                {partner.status === 'approved' ? 'Aprovado' : partner.status}
              </Badge>
              <Button variant="outline" onClick={() => navigate('/api-docs')}>
                <FileText className="w-4 h-4 mr-2" />
                Documentação
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pagamentos Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPayments}</div>
                  <p className="text-xs text-muted-foreground">{stats.completedPayments} concluídos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVolume.toLocaleString()} AOA</div>
                  <p className="text-xs text-muted-foreground">Pagamentos concluídos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uso Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((partner.current_month_transactions / partner.monthly_transaction_limit) * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {partner.current_month_transactions.toLocaleString()} / {partner.monthly_transaction_limit.toLocaleString()} AOA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Comissão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{partner.commission_rate}%</div>
                  <p className="text-xs text-muted-foreground">Por transação</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => navigate('/api-docs')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Documentação
                </Button>
                <Button variant="outline" onClick={loadPartnerData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Dados
                </Button>
                <Button variant="outline" onClick={() => window.open('mailto:suporte@kambafy.com')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contatar Suporte
                </Button>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pagamento ainda. Use a API para criar seu primeiro pagamento.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.order_id}</TableCell>
                          <TableCell>{payment.customer_name}</TableCell>
                          <TableCell>{Number(payment.amount).toLocaleString()} {payment.currency}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.payment_method === 'express' ? 'Express' : 'Referência'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Pagamentos</CardTitle>
                <CardDescription>Histórico completo de pagamentos processados via API</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="font-semibold mb-2">Nenhum pagamento encontrado</h3>
                    <p>Use a API para criar seu primeiro pagamento</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Concluído</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-sm">{payment.order_id}</TableCell>
                          <TableCell>{payment.customer_name}</TableCell>
                          <TableCell className="text-sm">{payment.customer_email}</TableCell>
                          <TableCell className="font-semibold">
                            {Number(payment.amount).toLocaleString()} {payment.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.payment_method === 'express' ? 'Express' : 'Referência'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(payment.created_at), 'dd/MM HH:mm')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.completed_at 
                              ? format(new Date(payment.completed_at), 'dd/MM HH:mm')
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais da API</CardTitle>
                <CardDescription>Use estas credenciais para autenticar suas requisições</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={partner.api_key}
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
                      onClick={() => copyToClipboard(partner.api_key, "API Key")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Mantenha esta chave segura. Não a partilhe publicamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value="https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard("https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api", "Base URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exemplo de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
{`curl -X POST "https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${showApiKey ? partner.api_key : 'YOUR_API_KEY'}" \\
  -d '{
    "orderId": "order_123",
    "amount": 5000,
    "currency": "AOA",
    "paymentMethod": "express",
    "phoneNumber": "+244923456789",
    "customerName": "João Silva",
    "customerEmail": "joao@email.com"
  }'`}
                  </pre>
                </div>
                <Button className="mt-4" onClick={() => navigate('/api-docs')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Documentação Completa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Webhooks</CardTitle>
                <CardDescription>
                  Configure uma URL para receber notificações em tempo real sobre eventos de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <Input
                    id="webhook-url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://seusite.com/api/webhooks/kambafy"
                  />
                  <p className="text-sm text-muted-foreground">
                    Deve ser uma URL HTTPS acessível publicamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showWebhookSecret ? "text" : "password"}
                      value={partner.webhook_secret || "Não configurado"}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {partner.webhook_secret && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(partner.webhook_secret!, "Webhook Secret")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use este secret para verificar a assinatura HMAC-SHA256 dos webhooks
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={saveWebhookSettings} disabled={savingWebhook}>
                    {savingWebhook && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar URL
                  </Button>
                  <Button variant="outline" onClick={regenerateWebhookSecret}>
                    Regenerar Secret
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Badge className="mb-2">payment.completed</Badge>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando um pagamento é confirmado com sucesso
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Badge variant="destructive" className="mb-2">payment.failed</Badge>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando um pagamento falha ou é rejeitado
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Badge variant="secondary" className="mb-2">payment.expired</Badge>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando uma referência expira sem pagamento
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Badge variant="outline" className="mb-2">refund.completed</Badge>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando um reembolso é processado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Uso da API</CardTitle>
                <CardDescription>Últimas 100 requisições à API</CardDescription>
              </CardHeader>
              <CardContent>
                {apiLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="font-semibold mb-2">Nenhum log encontrado</h3>
                    <p>Faça uma requisição à API para ver os logs aqui</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant={log.method === 'POST' ? 'default' : 'secondary'}>
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={log.status_code < 300 ? 'default' : log.status_code < 500 ? 'secondary' : 'destructive'}
                              className={log.status_code < 300 ? 'bg-green-600' : ''}
                            >
                              {log.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.response_time_ms}ms</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
