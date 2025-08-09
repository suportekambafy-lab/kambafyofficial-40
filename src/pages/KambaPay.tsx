import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KambaPayRegistration } from '@/components/KambaPayRegistration';
import { KambaPayBalanceManager } from '@/components/KambaPayBalanceManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, CreditCard, ShoppingCart } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function KambaPay() {
  const [registeredEmail, setRegisteredEmail] = useState<string>('');

  const handleRegistrationSuccess = (email: string) => {
    setRegisteredEmail(email);
  };

  return (
    <>
      <SEO 
        title="KambaPay - Carteira Digital | Kambafy"
        description="Registre-se no KambaPay e tenha sua carteira digital para pagamentos rápidos e seguros. Carregue saldo e pague em qualquer loja online."
      />
      
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">KambaPay</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sua carteira digital para pagamentos rápidos e seguros. 
              Registre-se, carregue saldo e pague em qualquer loja online com facilidade.
            </p>
          </div>

          <Tabs defaultValue="register" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="register">Registrar / Login</TabsTrigger>
              <TabsTrigger value="manage" disabled={!registeredEmail}>
                Gerenciar Saldo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="register" className="space-y-6">
              <KambaPayRegistration onSuccess={handleRegistrationSuccess} />
              
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="text-center">
                    <CreditCard className="h-8 w-8 text-primary mx-auto mb-2" />
                    <CardTitle className="text-lg">1. Registre-se</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      Crie sua conta KambaPay com apenas seu email
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="text-center">
                    <Wallet className="h-8 w-8 text-primary mx-auto mb-2" />
                    <CardTitle className="text-lg">2. Carregue Saldo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      Use métodos de pagamento locais para adicionar saldo
                    </CardDescription>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="text-center">
                    <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-2" />
                    <CardTitle className="text-lg">3. Pague Facilmente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      Use seu email para pagar em qualquer checkout
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="manage" className="space-y-6">
              {registeredEmail && (
                <KambaPayBalanceManager 
                  email={registeredEmail} 
                  onBalanceUpdate={() => {}}
                />
              )}
            </TabsContent>
          </Tabs>
          
          <div className="mt-12 p-6 bg-muted rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Vantagens do KambaPay</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">✅ Pagamentos Rápidos</h3>
                <p className="text-sm text-muted-foreground">
                  Pague com apenas seu email, sem precisar inserir dados do cartão toda vez
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">🔒 Seguro</h3>
                <p className="text-sm text-muted-foreground">
                  Seus dados bancários ficam protegidos, você só usa email
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">🌍 Universal</h3>
                <p className="text-sm text-muted-foreground">
                  Use em qualquer loja que aceite KambaPay como método de pagamento
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">💰 Controle Total</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie seu saldo, veja histórico de transações e controle seus gastos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}