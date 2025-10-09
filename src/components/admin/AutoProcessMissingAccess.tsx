import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomToast } from "@/hooks/useCustomToast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AutoProcessMissingAccess = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useCustomToast();

  const handleAutoProcess = async () => {
    try {
      setIsProcessing(true);
      setResult(null);

      toast({
        title: "Processando...",
        message: "Buscando e corrigindo pedidos sem acesso automaticamente...",
        variant: "default",
      });

      const { data, error } = await supabase.functions.invoke(
        'auto-process-missing-access',
        { body: {} }
      );

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast({
          title: "✅ Sucesso!",
          message: `${data.orders_processed} acessos criados e emails enviados!`,
          variant: "success",
        });
      } else {
        toast({
          title: "⚠️ Concluído com erros",
          message: data.message || "Alguns pedidos não foram processados",
          variant: "warning",
        });
      }
    } catch (error: any) {
      console.error('Erro ao processar acessos:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao processar acessos faltantes",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Zap className="h-5 w-5" />
          Processamento Automático de Acessos
        </CardTitle>
        <CardDescription>
          Sistema inteligente que detecta e corrige automaticamente pedidos sem acesso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-100/50 dark:border-amber-800 dark:bg-amber-900/20">
          <Zap className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <strong>Sistema Automático:</strong> Esta ação irá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Buscar pedidos completados nas últimas 48h</li>
              <li>Identificar pedidos sem customer_access</li>
              <li>Criar acesso automaticamente</li>
              <li>Enviar email de confirmação</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleAutoProcess}
          disabled={isProcessing}
          className="w-full bg-amber-600 hover:bg-amber-700"
          size="lg"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processando Automaticamente...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Executar Processamento Automático
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de pedidos (48h):</span>
              <span className="text-sm font-bold">{result.total_orders}</span>
            </div>
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Pedidos sem acesso:
              </span>
              <span className="text-sm font-bold">{result.orders_without_access}</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Acessos criados:
              </span>
              <span className="text-sm font-bold">{result.orders_processed}</span>
            </div>
            {result.errors > 0 && (
              <>
                <div className="flex items-center justify-between text-red-600">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Erros:
                  </span>
                  <span className="text-sm font-bold">{result.errors}</span>
                </div>
                {result.error_details && result.error_details.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs font-medium mb-2">Detalhes dos erros:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.error_details.map((err: any, idx: number) => (
                        <div key={idx} className="text-xs text-red-600">
                          {err.order_id} - {err.email}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
