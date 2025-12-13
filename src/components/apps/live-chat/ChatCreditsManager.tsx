import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Zap, TrendingUp, Crown, Loader2, ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/utils/priceFormatting';
import { ChatTokenPurchaseModal } from './ChatTokenPurchaseModal';

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
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
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

  const handleOpenPurchaseModal = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
  };

  const handlePurchaseComplete = () => {
    setShowPurchaseModal(false);
    setSelectedPackage(null);
    fetchData();
    onPurchaseComplete?.();
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
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo atual</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold">
                {(credits?.token_balance || 0).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">tokens</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            ≈ {getEstimatedMessages(credits?.token_balance || 0).toLocaleString()} mensagens
          </p>
          {(credits?.token_balance || 0) < 5000 && (
            <Badge variant="outline" className="mt-1 text-destructive border-destructive/50">
              Saldo baixo
            </Badge>
          )}
        </div>
      </div>

      {/* Packages */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Pacotes disponíveis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const isPopular = pkg.name.toLowerCase() === 'pro';
            
            return (
              <div
                key={pkg.id} 
                className={`relative p-4 rounded-lg border bg-card transition-all hover:border-primary/50 ${
                  isPopular ? 'border-primary' : 'border-border'
                }`}
              >
                {isPopular && (
                  <Badge variant="secondary" className="absolute -top-2 right-3 text-xs">
                    Popular
                  </Badge>
                )}
                
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    isPopular ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {getPackageIcon(pkg.name)}
                  </div>
                  <span className="font-medium">{pkg.name}</span>
                </div>

                <div className="mb-3">
                  <div className="text-2xl font-semibold">
                    {formatPrice(pkg.price_kz)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pkg.tokens.toLocaleString()} tokens • ~{getEstimatedMessages(pkg.tokens)} msgs
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant={isPopular ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleOpenPurchaseModal(pkg)}
                >
                  Comprar
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Stats */}
      {credits && credits.total_tokens_used > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {credits.total_tokens_purchased.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Comprados</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-lg font-semibold">
              {credits.total_tokens_used.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Usados</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {getEstimatedMessages(credits.total_tokens_used).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Mensagens</div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      <ChatTokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        selectedPackage={selectedPackage}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}
