import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FixMissingAccessButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFixAccess = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-missing-access');
      
      if (error) throw error;
      
      setResults(data.results);
      setShowResults(true);
      
      toast.success(`✅ Acessos corrigidos!`, {
        description: `${data.results.accessCreated} acessos criados, ${data.results.alreadyHadAccess} já existentes`
      });
    } catch (error: any) {
      console.error('Erro ao corrigir acessos:', error);
      toast.error('Erro ao corrigir acessos', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleFixAccess}
        disabled={isLoading}
        className="bg-green-600 hover:bg-green-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Corrigindo acessos...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Corrigir Acessos Faltantes
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultados da Correção</DialogTitle>
            <DialogDescription>
              Correção de acessos concluída
            </DialogDescription>
          </DialogHeader>
          
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Processado</div>
                  <div className="text-2xl font-bold text-blue-700">{results.total}</div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Acessos Criados</div>
                  <div className="text-2xl font-bold text-green-700">{results.accessCreated}</div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 font-medium">Já Existentes</div>
                  <div className="text-2xl font-bold text-gray-700">{results.alreadyHadAccess}</div>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Erros</div>
                  <div className="text-2xl font-bold text-red-700">{results.errors?.length || 0}</div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Erros:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                        {err.order_id}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
