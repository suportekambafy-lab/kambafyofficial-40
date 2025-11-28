import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export function BulkProductAccessButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  // IDs dos produtos do Victor Muabi
  const SOURCE_PRODUCT_ID = 'ea872141-cf2f-4c36-b1f0-2d6ed6789c4b'; // Milionário com IA
  const TARGET_PRODUCT_IDS = [
    '45a71fee-6d60-4c13-9823-3f1166ca2677', // Marca Milionária
    'fcca185c-2171-4037-84eb-217e14f32060'  // Google na Prática
  ];

  const handleGrantAccess = async () => {
    setIsLoading(true);
    try {
      toast.info('🔄 Processando...', {
        description: 'Concedendo acessos, adicionando às áreas e enviando emails...'
      });

      console.log('🚀 Calling grant-bulk-product-access...');

      const { data, error } = await supabase.functions.invoke('grant-bulk-product-access', {
        body: {
          source_product_id: SOURCE_PRODUCT_ID,
          target_product_ids: TARGET_PRODUCT_IDS
        }
      });

      console.log('📊 Response:', { data, error });
      
      if (error) {
        console.error('❌ Error invoking grant-bulk-product-access:', error);
        throw error;
      }
      
      setResults(data);
      setShowResults(true);
      
      if (data.success) {
        const summary = data.summary || {};
        toast.success(`✅ Processo concluído!`, {
          description: `${summary.total_granted || 0} acessos concedidos, emails enviados e alunos adicionados às áreas`
        });
      } else {
        toast.warning('⚠️ Concluído com avisos', {
          description: data.message || 'Alguns acessos não foram concedidos'
        });
      }
    } catch (error: any) {
      console.error('❌ Error in bulk access grant:', error);
      toast.error('Erro ao conceder acessos', {
        description: error.message || 'Erro ao processar concessão em lote'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGrantAccess}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Dar Acesso + Enviar Emails
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-purple-600" />
              Acesso em Massa: Milionário → Marca + Google
            </DialogTitle>
            <DialogDescription>
              Acessos concedidos, emails enviados e alunos adicionados às áreas de membros
            </DialogDescription>
          </DialogHeader>
          
          {results && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">Produtos Processados</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {results.summary?.total_target_products || 0}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 font-medium mb-1">Acessos Concedidos</div>
                    <div className="text-2xl font-bold text-green-700">
                      {results.summary?.total_granted || 0}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                    <div className="text-xs text-red-600 font-medium mb-1">Falhas</div>
                    <div className="text-2xl font-bold text-red-700">
                      {results.summary?.total_failed || 0}
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <Alert className="bg-purple-50 border-purple-200">
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-700">
                    <div className="space-y-2">
                      <div className="font-semibold">Detalhes da Operação:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Produto de Origem: <strong>{results.source_product?.name}</strong></li>
                        <li>Produtos de Destino: <strong>{results.target_products?.map((p: any) => p.name).join(', ')}</strong></li>
                        <li>✅ Acessos concedidos na tabela customer_access</li>
                        <li>📧 Emails de confirmação enviados</li>
                        <li>📚 Alunos adicionados às áreas de membros (Turma A)</li>
                        <li>Order ID: <code className="text-xs bg-purple-100 px-1 py-0.5 rounded">{results.bulk_order_id}</code></li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Detailed Results por Produto */}
                {results.results_by_product && results.results_by_product.length > 0 && (
                  <div className="space-y-4">
                    {results.results_by_product.map((productResult: any, prodIdx: number) => (
                      <div key={prodIdx} className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {productResult.product_name} - {productResult.granted_access} concedidos
                        </h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {productResult.results.filter((r: any) => r.success).slice(0, 5).map((result: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="p-2 rounded-lg border bg-green-50 border-green-200"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{result.customer_name}</div>
                                  <div className="text-xs text-muted-foreground">{result.customer_email}</div>
                                  <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    ✅ Acesso | 📧 Email | 📚 Turma A
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {productResult.results.length > 5 && (
                            <div className="text-xs text-center text-muted-foreground py-2">
                              + {productResult.results.length - 5} clientes adicionais
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
