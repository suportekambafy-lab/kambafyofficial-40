import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ResendMissingAccessEmails = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleResendEmails = async () => {
    try {
      setIsProcessing(true);
      setResult(null);

      toast({
        title: "Processando...",
        description: "Buscando pedidos sem acesso e reenviando emails...",
      });

      const { data, error } = await supabase.functions.invoke(
        'resend-missing-access-emails',
        {
          body: {},
        }
      );

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast({
          title: "✅ Sucesso!",
          description: `${data.emails_sent} emails enviados com sucesso!`,
        });
      } else {
        toast({
          title: "⚠️ Concluído com erros",
          description: data.message || "Alguns emails não foram enviados",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao reenviar emails:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar reenvio de emails",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Reenviar Emails de Acesso
        </CardTitle>
        <CardDescription>
          Busca pedidos completados sem registro de acesso e reenvia emails automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta ação irá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Buscar todos os pedidos completados sem customer_access</li>
              <li>Criar registros de acesso faltantes</li>
              <li>Enviar email com link de acesso para cada cliente</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleResendEmails}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Reenviar Todos os Emails Faltantes
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de pedidos:</span>
              <span className="text-sm">{result.total_orders}</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Emails enviados:
              </span>
              <span className="text-sm font-bold">{result.emails_sent}</span>
            </div>
            {result.errors > 0 && (
              <div className="flex items-center justify-between text-red-600">
                <span className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Erros:
                </span>
                <span className="text-sm font-bold">{result.errors}</span>
              </div>
            )}
            {result.error_details && result.error_details.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-medium mb-2">Detalhes dos erros:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.error_details.map((err: any, idx: number) => (
                    <div key={idx} className="text-xs text-red-600">
                      {err.email}: {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
