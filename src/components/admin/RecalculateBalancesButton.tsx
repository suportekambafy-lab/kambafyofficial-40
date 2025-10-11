import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecalculateBalancesButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🔄 Starting balance recalculation for all sellers...');
      
      const { data, error } = await supabase.rpc('admin_recalculate_all_seller_balances');
      
      if (error) {
        console.error('❌ Error recalculating balances:', error);
        throw error;
      }
      
      console.log('✅ Balance recalculation completed:', data);
      setResults(data as any);
      setShowResults(true);
      
      toast({
        title: "Saldos Recalculados",
        description: `${(data as any).total_sellers_processed} vendedores processados com sucesso.`,
      });
    } catch (error: any) {
      console.error('❌ Failed to recalculate balances:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao recalcular saldos",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleRecalculate}
        disabled={isProcessing}
        variant="default"
        className="gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Recalculando...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Recalcular Todos os Saldos
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado do Recálculo</DialogTitle>
            <DialogDescription>
              Saldos de vendedores foram recalculados com sucesso
            </DialogDescription>
          </DialogHeader>
          
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Processados</p>
                  <p className="text-2xl font-bold">{results.total_sellers_processed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Corrigidos</p>
                  <p className="text-2xl font-bold">{results.total_fixed}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Detalhes por Vendedor</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.details?.map((detail: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-sm font-mono text-muted-foreground">
                            {detail.user_id}
                          </p>
                          <div className="flex gap-4 text-sm">
                            <span>
                              Saldo Anterior: <strong>{detail.old_balance || 0} KZ</strong>
                            </span>
                            <span>
                              Saldo Novo: <strong>{detail.new_balance} KZ</strong>
                            </span>
                          </div>
                          {detail.deleted_transactions > 0 && (
                            <p className="text-xs text-orange-600">
                              {detail.deleted_transactions} transação(ões) duplicada(s) removida(s)
                            </p>
                          )}
                        </div>
                        {detail.difference !== 0 && (
                          <span className={`text-sm font-semibold ${
                            detail.difference > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {detail.difference > 0 ? '+' : ''}{detail.difference} KZ
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
