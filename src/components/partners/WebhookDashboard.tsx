import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle, XCircle, Clock, RotateCcw, Send, AlertTriangle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookLog {
  id: string;
  order_id: string;
  status: string;
  webhook_sent: boolean;
  webhook_sent_at: string | null;
  webhook_attempts: number;
  webhook_last_error: string | null;
  amount: number;
  currency: string;
  customer_email: string;
  created_at: string;
  metadata: any;
}

interface WebhookDashboardProps {
  partnerId: string;
  apiKey: string;
  webhookUrl: string | null;
}

export function WebhookDashboard({ partnerId, apiKey, webhookUrl }: WebhookDashboardProps) {
  const { toast } = useToast();
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  useEffect(() => {
    loadWebhookLogs();
  }, [partnerId]);

  const loadWebhookLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('external_payments')
        .select('id, order_id, status, webhook_sent, webhook_sent_at, webhook_attempts, webhook_last_error, amount, currency, customer_email, created_at, metadata')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWebhookLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const resendWebhook = async (paymentId: string) => {
    if (!webhookUrl) {
      toast({ 
        title: "Erro", 
        description: "Configure uma URL de webhook primeiro", 
        variant: "destructive" 
      });
      return;
    }

    setResending(paymentId);
    try {
      const response = await fetch(
        `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/kambafy-payments-api/webhooks/resend`,
        {
          method: 'POST',
          headers: { 
            'x-api-key': apiKey, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ paymentId })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({ title: "Sucesso", description: "Webhook reenviado com sucesso" });
        loadWebhookLogs();
      } else {
        toast({ 
          title: "Falhou", 
          description: result.error || "Falha ao reenviar webhook", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setResending(null);
    }
  };

  const getWebhookStatusBadge = (log: WebhookLog) => {
    if (log.status === 'pending') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Aguardando
        </Badge>
      );
    }
    
    if (log.webhook_sent) {
      return (
        <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Entregue
        </Badge>
      );
    }
    
    if (log.webhook_attempts > 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Falhou ({log.webhook_attempts}x)
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pendente
      </Badge>
    );
  };

  const stats = {
    total: webhookLogs.filter(l => l.status === 'completed').length,
    delivered: webhookLogs.filter(l => l.webhook_sent).length,
    failed: webhookLogs.filter(l => l.webhook_attempts > 0 && !l.webhook_sent).length,
    pending: webhookLogs.filter(l => l.status === 'pending').length,
  };

  const deliveryRate = stats.total > 0 
    ? Math.round((stats.delivered / stats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Webhooks Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Warning if no webhook URL */}
      {!webhookUrl && (
        <Card className="border-yellow-500 bg-yellow-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium">Webhook não configurado</p>
              <p className="text-sm text-muted-foreground">
                Configure uma URL de webhook acima para receber notificações de pagamento.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Webhooks</CardTitle>
              <CardDescription>Últimas 50 notificações de pagamento</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadWebhookLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhookLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="font-semibold mb-2">Nenhum webhook ainda</h3>
              <p>Os webhooks aparecerão aqui quando você processar pagamentos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status Pagamento</TableHead>
                  <TableHead>Status Webhook</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">{log.order_id}</TableCell>
                    <TableCell>
                      {Number(log.amount).toLocaleString()} {log.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getWebhookStatusBadge(log)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.webhook_sent_at 
                        ? format(new Date(log.webhook_sent_at), 'dd/MM HH:mm:ss')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">{log.webhook_attempts || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Detalhes
                        </Button>
                        {log.status === 'completed' && !log.webhook_sent && webhookUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendWebhook(log.id)}
                            disabled={resending === log.id}
                          >
                            {resending === log.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Reenviar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Webhook</DialogTitle>
            <DialogDescription>
              Order ID: {selectedLog?.order_id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status do Pagamento</p>
                  <Badge variant={selectedLog.status === 'completed' ? 'default' : 'secondary'}>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status do Webhook</p>
                  {getWebhookStatusBadge(selectedLog)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-semibold">
                    {Number(selectedLog.amount).toLocaleString()} {selectedLog.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p>{selectedLog.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tentativas</p>
                  <p>{selectedLog.webhook_attempts || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviado em</p>
                  <p>
                    {selectedLog.webhook_sent_at 
                      ? format(new Date(selectedLog.webhook_sent_at), 'dd/MM/yyyy HH:mm:ss')
                      : 'Não enviado'
                    }
                  </p>
                </div>
              </div>

              {selectedLog.webhook_last_error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">Último Erro:</p>
                  <p className="text-sm">{selectedLog.webhook_last_error}</p>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Metadata (Webhook Info)</p>
                  <ScrollArea className="h-40 rounded-lg border bg-muted/50 p-3">
                    <pre className="text-xs">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                {selectedLog.status === 'completed' && !selectedLog.webhook_sent && webhookUrl && (
                  <Button 
                    onClick={() => {
                      resendWebhook(selectedLog.id);
                      setSelectedLog(null);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Reenviar Webhook
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
