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
      toast.info('Processando...', {
        description: 'Buscando pedidos sem acesso e enviando emails...'
      });

      const { data, error } = await supabase.functions.invoke('resend-missing-access-emails');
      
      if (error) throw error;
      
      setResults(data);
      setShowResults(true);
      
      if (data.success) {
        toast.success(`✅ Emails enviados!`, {
          description: `${data.emails_sent} emails enviados de ${data.total_orders} pedidos`
        });
      } else {
        toast.warning('Concluído com avisos', {
          description: data.message || 'Alguns emails não foram enviados'
        });
      }
    } catch (error: any) {
      console.error('Erro ao enviar emails:', error);
      toast.error('Erro ao enviar emails', {
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
            Enviando emails...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Enviar Emails Faltantes
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultados do Envio de Emails</DialogTitle>
            <DialogDescription>
              Envio de emails de acesso concluído
            </DialogDescription>
          </DialogHeader>
          
          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total de Pedidos</div>
                  <div className="text-2xl font-bold text-blue-700">{results.total_orders || 0}</div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Emails Enviados</div>
                  <div className="text-2xl font-bold text-green-700">{results.emails_sent || 0}</div>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg col-span-2">
                  <div className="text-sm text-red-600 font-medium">Erros</div>
                  <div className="text-2xl font-bold text-red-700">{results.errors || 0}</div>
                </div>
              </div>

              {results.error_details && results.error_details.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Detalhes dos erros:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.error_details.map((err: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                        {err.email}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.message && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">{results.message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
