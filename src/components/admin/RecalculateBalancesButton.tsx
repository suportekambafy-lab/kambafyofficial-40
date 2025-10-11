import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function RecalculateBalancesButton() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      setResults(null);
      
      console.log('🔄 Recalculando todos os saldos...');
      
      // Chamar a função do banco de dados que recalcula todos os saldos
      const { data, error } = await supabase.rpc('admin_recalculate_all_seller_balances');
      
      if (error) {
        console.error('❌ Erro ao recalcular saldos:', error);
        toast({
          title: "Erro ao recalcular saldos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Saldos recalculados:', data);
      setResults(data as any);
      
      toast({
        title: "Saldos recalculados!",
        description: `${(data as any).total_sellers_processed} vendedores processados com sucesso.`,
      });
      
    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro ao processar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
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
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Recalcular Todos os Saldos</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover transações duplicadas antigas (tipo "credit")</li>
                <li>Recalcular o saldo correto baseado em todas as transações válidas</li>
                <li>Atualizar o saldo de todos os vendedores</li>
              </ul>
              <p className="mt-2 font-semibold">
                Tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {results && (
            <div className="space-y-4 max-h-96">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Vendedores Processados</p>
                  <p className="text-2xl font-bold">{results.total_sellers_processed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Corrigidos</p>
                  <p className="text-2xl font-bold">{results.total_fixed}</p>
                </div>
              </div>
              
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {results.details?.map((detail: any, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Vendedor {index + 1}</span>
                        <span className={detail.difference > 0 ? "text-green-500" : detail.difference < 0 ? "text-red-500" : "text-muted-foreground"}>
                          {detail.difference > 0 ? "+" : ""}{detail.difference.toFixed(2)} KZ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Anterior: {detail.old_balance?.toFixed(2) || 0} KZ</div>
                        <div>Novo: {detail.new_balance.toFixed(2)} KZ</div>
                        <div>Deletadas: {detail.deleted_transactions}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRecalculate();
              }}
              disabled={loading}
            >
              {loading ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
