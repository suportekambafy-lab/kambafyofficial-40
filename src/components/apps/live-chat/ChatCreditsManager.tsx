import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Zap, TrendingUp, Crown, Loader2, Check } from 'lucide-react';
import { formatPrice } from '@/utils/priceFormatting';

interface TokenPackage {
  id: string;
  name: string;
  description: string;
  tokens: number;
  price_kz: number;
  sort_order: number;
}

interface SellerCredits {
  token_balance: number;
  total_tokens_purchased: number;
  total_tokens_used: number;
}

interface ChatCreditsManagerProps {
  onPurchaseComplete?: () => void;
}

export function ChatCreditsManager({ onPurchaseComplete }: ChatCreditsManagerProps) {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [credits, setCredits] = useState<SellerCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch packages
      const { data: packagesData } = await supabase
        .from('chat_token_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (packagesData) {
        setPackages(packagesData);
      }

      // Fetch seller credits
      const { data: creditsData } = await supabase
        .from('seller_chat_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        setCredits(creditsData);
      } else {
        // Create initial credits record
        const { data: newCredits } = await supabase
          .from('seller_chat_credits')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (newCredits) {
          setCredits(newCredits);
        }
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: TokenPackage) => {
    setPurchasing(pkg.id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Check seller balance
      const { data: balance } = await supabase
        .from('customer_balances')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!balance || balance.balance < pkg.price_kz) {
        toast({
          title: 'Saldo insuficiente',
          description: `Você precisa de ${formatPrice(pkg.price_kz)} KZ para comprar este pacote.`,
          variant: 'destructive'
        });
        return;
      }

      // Debit from seller balance
      const { error: debitError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: user.id,
          type: 'debit',
          amount: -pkg.price_kz,
          description: `Compra de pacote de tokens: ${pkg.name}`,
          currency: 'KZ'
        });

      if (debitError) throw debitError;

      // Update seller balance
      await supabase
        .from('customer_balances')
        .update({ 
          balance: balance.balance - pkg.price_kz,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // Add tokens to seller chat credits
      const currentTokens = credits?.token_balance || 0;
      const currentPurchased = credits?.total_tokens_purchased || 0;
      const newBalance = currentTokens + pkg.tokens;

      const { error: creditError } = await supabase
        .from('seller_chat_credits')
        .upsert({
          user_id: user.id,
          token_balance: newBalance,
          total_tokens_purchased: currentPurchased + pkg.tokens,
          updated_at: new Date().toISOString()
        });

      if (creditError) throw creditError;

      // Log transaction
      await supabase
        .from('chat_token_transactions')
        .insert({
          user_id: user.id,
          type: 'purchase',
          tokens: pkg.tokens,
          balance_after: newBalance,
          package_id: pkg.id,
          description: `Compra do pacote ${pkg.name}`
        });

      toast({
        title: 'Compra realizada!',
        description: `${pkg.tokens.toLocaleString()} tokens adicionados à sua conta.`
      });

      // Refresh data
      fetchData();
      onPurchaseComplete?.();

    } catch (error) {
      console.error('Error purchasing package:', error);
      toast({
        title: 'Erro na compra',
        description: 'Não foi possível processar a compra. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setPurchasing(null);
    }
  };

  const getPackageIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return <MessageSquare className="h-5 w-5" />;
      case 'básico': return <Zap className="h-5 w-5" />;
      case 'pro': return <TrendingUp className="h-5 w-5" />;
      case 'business': return <Crown className="h-5 w-5" />;
      default: return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getEstimatedMessages = (tokens: number) => {
    return Math.floor(tokens / 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Seu Saldo de Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {(credits?.token_balance || 0).toLocaleString()}
            </span>
            <span className="text-muted-foreground">tokens</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ≈ {getEstimatedMessages(credits?.token_balance || 0).toLocaleString()} mensagens disponíveis
          </p>
          {(credits?.token_balance || 0) < 5000 && (
            <Badge variant="destructive" className="mt-2">
              Saldo baixo - Recarregue para continuar
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Pacotes de Tokens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => {
            const isPopular = pkg.name.toLowerCase() === 'pro';
            const isPurchasing = purchasing === pkg.id;
            
            return (
              <Card 
                key={pkg.id} 
                className={`relative transition-all hover:shadow-lg ${
                  isPopular ? 'border-primary ring-1 ring-primary/20' : ''
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isPopular ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {getPackageIcon(pkg.name)}
                  </div>
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatPrice(pkg.price_kz)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pkg.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    ≈ {getEstimatedMessages(pkg.tokens).toLocaleString()} mensagens
                  </div>

                  <Button 
                    className="w-full" 
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Comprar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Usage Stats */}
      {credits && credits.total_tokens_used > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {credits.total_tokens_purchased.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tokens comprados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">
                  {credits.total_tokens_used.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Tokens usados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {getEstimatedMessages(credits.total_tokens_used).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Mensagens trocadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
