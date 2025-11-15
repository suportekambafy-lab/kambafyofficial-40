import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SendResult {
  success: boolean;
  totalUsers: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string; details?: { hint?: string } }>;
  duration: number;
  timestamp: string;
}

export function SendAppAnnouncementButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SendResult | null>(null);

  const handleSend = async (isTest: boolean) => {
    const confirmMessage = isTest 
      ? "Enviar email de teste para 5 usuários?"
      : "ATENÇÃO: Isso enviará o email para TODOS os usuários cadastrados. Confirma?";
    
    if (!confirm(confirmMessage)) return;
    
    setIsLoading(true);
    setShowResults(false);
    
    try {
      toast.loading(isTest ? "Enviando emails de teste..." : "Enviando emails...", {
        id: "sending-emails"
      });
      
      const { data, error } = await supabase.functions.invoke('send-app-announcement', {
        body: { test_mode: isTest }
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      console.log('Send announcement response:', data);
      
      // Check if response indicates configuration error
      if (data && !data.success && data.error) {
        toast.error(data.error, { 
          id: "sending-emails",
          duration: 10000 
        });
        
        if (data.resendDashboard) {
          setTimeout(() => {
            window.open(data.resendDashboard, '_blank');
          }, 1000);
        }
        return;
      }
      
      setResults(data as SendResult);
      setShowResults(true);
      
      if (data.failed > 0) {
        toast.warning(
          `${data.sent} emails enviados, ${data.failed} falharam. Veja detalhes.`,
          { id: "sending-emails", duration: 8000 }
        );
      } else {
        toast.success(
          `${data.sent} emails enviados com sucesso!`,
          { id: "sending-emails" }
        );
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error("Erro ao enviar emails. Verifique os logs da edge function.", {
        id: "sending-emails",
        duration: 8000
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
              {isLoading ? (
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
              {isLoading ? (
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
              {new Date(results?.timestamp).toLocaleString('pt-BR')}
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
                        {results.sent}
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
                    <span className="font-semibold">{results.totalUsers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-semibold">{(results.duration / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de Sucesso:</span>
                    <span className="font-semibold">
                      {((results.sent / results.totalUsers) * 100).toFixed(1)}%
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
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {results.errors.map((err, idx) => (
                        <div key={idx} className="text-xs p-2 bg-red-50 rounded">
                          <div className="font-medium text-red-700">{err.email}</div>
                          <div className="text-red-600 mb-1">{err.error}</div>
                          {err.details?.hint && (
                            <div className="text-orange-600 font-medium">
                              💡 {err.details.hint}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {results.errors.some(e => e.details?.hint?.includes('API Key')) && (
                      <div className="mt-3 p-3 bg-orange-50 rounded-lg text-sm">
                        <div className="font-medium text-orange-700 mb-1">
                          ⚠️ Configuração necessária:
                        </div>
                        <div className="text-orange-600">
                          Verifique se RESEND_API_KEY está configurada em{' '}
                          <a 
                            href="https://supabase.com/dashboard/project/hcbkqygdtzpxvctfdqbd/settings/functions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Supabase Secrets
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {results.errors.some(e => e.details?.hint?.includes('Domínio')) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                        <div className="font-medium text-blue-700 mb-1">
                          📧 Domínio não verificado:
                        </div>
                        <div className="text-blue-600">
                          Verifique seu domínio em{' '}
                          <a 
                            href="https://resend.com/domains"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                          >
                            Resend Dashboard
                          </a>
                        </div>
                      </div>
                    )}
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
