import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ResendAllAccessButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleResendAll = async () => {
    setIsLoading(true);
    try {
      toast.info('🔄 Processando...', {
        description: 'Buscando todos os pedidos completados e reenviando acessos...'
      });

      console.log('📧 Starting resend-purchase-access for all orders...');

      const { data, error } = await supabase.functions.invoke('resend-purchase-access', {
        body: {
          resendAll: true
        }
      });

      console.log('📧 Resend response:', { data, error });
      
      if (error) {
        console.error('❌ Error invoking resend-purchase-access:', error);
        throw error;
      }
      
      setResults(data);
      setShowResults(true);
      
      if (data.success) {
        const summary = data.summary || {};
        toast.success(`✅ Processo concluído!`, {
          description: `${summary.successful || 0} acessos enviados com sucesso de ${summary.total || 0} pedidos processados`
        });
      } else {
        toast.warning('⚠️ Concluído com avisos', {
          description: data.message || 'Alguns acessos não foram enviados'
        });
      }
    } catch (error: any) {
      console.error('❌ Error in resend all access:', error);
      toast.error('Erro ao reenviar acessos', {
        description: error.message || 'Erro ao processar o reenvio de acessos'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleResendAll}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Reenviar Todos os Acessos
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="h-5 w-5 text-blue-600" />
              Resultados do Reenvio de Acessos
            </DialogTitle>
            <DialogDescription>
              Processo de reenvio de acessos ao painel e área de membros concluído
            </DialogDescription>
          </DialogHeader>
          
          {results && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">Total Processado</div>
                    <div className="text-2xl font-bold text-blue-700">{results.summary?.total || 0}</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 font-medium mb-1">Enviados</div>
                    <div className="text-2xl font-bold text-green-700">{results.summary?.successful || 0}</div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                    <div className="text-xs text-red-600 font-medium mb-1">Falhas</div>
                    <div className="text-2xl font-bold text-red-700">{results.summary?.failed || 0}</div>
                  </div>
                </div>

                {/* Alert */}
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Todos os clientes processados receberam:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Email com acesso ao painel Kambafy (se conta foi criada)</li>
                      <li>Email com acesso à área de membros (se produto tiver)</li>
                      <li>Informações de contato do vendedor</li>
                      <li>Senha temporária (para novas contas)</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Detailed Results */}
                {results.results && results.results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Detalhes do Processamento
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {results.results.map((result: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg border ${
                            result.success 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {result.success ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {result.email}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>Pedido: {result.order_id}</div>
                                {result.account_created && (
                                  <div className="text-blue-600 font-medium">
                                    ✨ Nova conta criada
                                  </div>
                                )}
                                {result.error && (
                                  <div className="text-red-600 mt-1">
                                    {result.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.message && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-foreground/80">{results.message}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
