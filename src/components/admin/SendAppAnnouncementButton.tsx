import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SendResult {
  success: boolean;
  total_users: number;
  emails_sent: number;
  failed: number;
  errors?: string[];
  duration_seconds: number;
  timestamp: string;
}

export function SendAppAnnouncementButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [results, setResults] = useState<SendResult | null>(null);
  const { toast } = useToast();

  const handleSend = async (isTest: boolean) => {
    if (!isTest && !confirm('⚠️ Confirma o envio de emails para TODOS os utilizadores? Esta ação não pode ser revertida.')) {
      return;
    }

    setIsLoading(true);
    setTestMode(isTest);
    
    toast({
      title: isTest ? "🧪 Enviando emails de teste..." : "📧 Enviando emails em massa...",
      description: isTest ? "Enviando para 5 utilizadores" : "Aguarde, pode levar alguns segundos",
    });

    try {
      const { data, error } = await supabase.functions.invoke('send-app-announcement', {
        body: { test_mode: isTest }
      });

      if (error) throw error;

      setResults(data);
      setShowResults(true);
      
      toast({
        title: "✅ Envio concluído!",
        description: `${data.emails_sent} emails enviados com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao enviar emails:', error);
      toast({
        title: "❌ Erro ao enviar emails",
        description: error.message || "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Anúncio do App
          </CardTitle>
          <CardDescription>
            Enviar email em massa sobre o lançamento da aplicação móvel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Modo Teste:</strong> Envia apenas para 5 utilizadores para validar o email.
              <br />
              <strong>Modo Completo:</strong> Envia para todos os utilizadores (~2.556).
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={() => handleSend(true)}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading && testMode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Teste (5 users)
            </Button>

            <Button
              onClick={() => handleSend(false)}
              disabled={isLoading}
              variant="default"
              className="flex-1"
            >
              {isLoading && !testMode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Envio Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {results?.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Resultado do Envio
            </DialogTitle>
            <DialogDescription>
              {testMode ? 'Modo Teste' : 'Envio Completo'} - {results?.timestamp}
            </DialogDescription>
          </DialogHeader>

          {results && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {results.emails_sent}
                      </p>
                      <p className="text-sm text-muted-foreground">Enviados</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">
                        {results.failed}
                      </p>
                      <p className="text-sm text-muted-foreground">Falhados</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detalhes */}
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de Utilizadores:</span>
                    <span className="font-semibold">{results.total_users}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-semibold">{results.duration_seconds}s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de Sucesso:</span>
                    <span className="font-semibold">
                      {((results.emails_sent / results.total_users) * 100).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Erros */}
              {results.errors && results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Erros encontrados:</p>
                    <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sucesso */}
              {results.failed === 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Todos os emails foram enviados com sucesso! 🎉
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
