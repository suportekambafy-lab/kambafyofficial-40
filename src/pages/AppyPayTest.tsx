import { AppyPayDemo } from '@/components/checkout/AppyPayDemo';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AppyPayTest = () => {
  return (
    <>
      <SEO
        title="AppyPay Integration Test - Kambafy"
        description="Teste da integração AppyPay para pagamentos por referência"
        keywords="appypay, pagamento, referência, angola, kambafy"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">
                AppyPay Integration
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Sistema de pagamentos por referência integrado com a plataforma AppyPay
              </p>
              <Badge variant="secondary" className="text-sm">
                🚀 Integração Completa
              </Badge>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📋 Criar Referência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Gere referências de pagamento automaticamente através da API AppyPay
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔍 Verificar Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Monitore o status dos pagamentos em tempo real com verificação automática
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔗 Webhook</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações instantâneas quando os pagamentos forem confirmados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Demo */}
            <Card className="border-2 border-dashed border-blue-200">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Demo Interativo</CardTitle>
                <CardDescription className="text-center">
                  Experimente a integração AppyPay completa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppyPayDemo />
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes Técnicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Edge Functions</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• create-appypay-reference</li>
                      <li>• verify-appypay-payment</li>
                      <li>• appypay-webhook</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Componentes React</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• AppyPayPaymentForm</li>
                      <li>• AppyPayStatusChecker</li>
                      <li>• AppyPayCheckout</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Base de Dados</h4>
                  <p className="text-sm text-muted-foreground">
                    Tabela `reference_payments` com RLS policies configuradas para segurança
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
};

export default AppyPayTest;