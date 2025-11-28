import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AddStudentsToCohortButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  // IDs dos produtos
  const PRODUCT_IDS = [
    'ea872141-cf2f-4c36-b1f0-2d6ed6789c4b', // Milionário com IA
    '45a71fee-6d60-4c13-9823-3f1166ca2677', // Marca Milionária
    'fcca185c-2171-4037-84eb-217e14f32060'  // Google na Prática
  ];

  const handleAddToCohorts = async () => {
    setIsLoading(true);
    try {
      toast.info('🔄 Processando...', {
        description: 'Adicionando alunos às turmas...'
      });

      console.log('🚀 Calling add-students-to-cohorts...');

      const { data, error } = await supabase.functions.invoke('add-students-to-cohorts', {
        body: {
          product_ids: PRODUCT_IDS
        }
      });

      console.log('📊 Response:', { data, error });
      
      if (error) {
        console.error('❌ Error invoking add-students-to-cohorts:', error);
        throw error;
      }
      
      setResults(data);
      setShowResults(true);
      
      if (data.success) {
        const summary = data.summary || {};
        toast.success(`✅ Processo concluído!`, {
          description: `${summary.total_students_added || 0} alunos adicionados às turmas`
        });
      } else {
        toast.warning('⚠️ Concluído com avisos', {
          description: data.message || 'Alguns alunos não foram adicionados'
        });
      }
    } catch (error: any) {
      console.error('❌ Error in add to cohorts:', error);
      toast.error('Erro ao adicionar alunos', {
        description: error.message || 'Erro ao processar adição às turmas'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleAddToCohorts}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Users className="mr-2 h-4 w-4" />
            Adicionar Alunos às Turmas
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-blue-600" />
              Alunos Adicionados às Turmas
            </DialogTitle>
            <DialogDescription>
              Alunos sem turma foram adicionados à "Turma A"
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
                      {results.summary?.total_products || 0}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 font-medium mb-1">Alunos Adicionados</div>
                    <div className="text-2xl font-bold text-green-700">
                      {results.summary?.total_students_added || 0}
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
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    <div className="space-y-2">
                      <div className="font-semibold">Detalhes da Operação:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Produtos processados: <strong>Milionário com IA, Marca Milionária, Google na Prática</strong></li>
                        <li>✅ Alunos adicionados à "Turma A" de cada área</li>
                        <li>📊 Contadores de turmas atualizados</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Detailed Results por Produto */}
                {results.results && results.results.length > 0 && (
                  <div className="space-y-4">
                    {results.results.map((productResult: any, prodIdx: number) => (
                      <div key={prodIdx} className="space-y-2">
                        <h4 className="font-semibold text-sm text-foreground/80 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {productResult.product_name} - {productResult.students_added || 0} alunos
                        </h4>
                        <div className="p-3 rounded-lg border bg-muted/50">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Área de Membros:</span>
                              <span className="font-medium">{productResult.member_area_name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Turma:</span>
                              <span className="font-medium">{productResult.cohort_name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Alunos processados:</span>
                              <span className="font-medium">{productResult.total_processed || 0}</span>
                            </div>
                            {productResult.message && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {productResult.message}
                              </div>
                            )}
                            {productResult.error && (
                              <div className="text-xs text-red-600 mt-2">
                                ❌ {productResult.error}
                              </div>
                            )}
                          </div>
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
