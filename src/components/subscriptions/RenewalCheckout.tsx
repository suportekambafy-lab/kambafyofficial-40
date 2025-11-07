import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RenewalCheckoutProps {
  subscription: any;
  token: string;
}

export function RenewalCheckout({ subscription, token }: RenewalCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const config = subscription?.products?.subscription_config || {};
  const basePrice = parseFloat(subscription?.products?.price || 0);
  
  const discount = subscription?.status === 'past_due' 
    ? config.reactivation_discount_percentage || 0
    : 0;
  
  const finalPrice = basePrice * (1 - discount / 100);

  const handleRenew = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-manual-renewal', {
        body: {
          token,
          paymentMethod: 'manual', // Será expandido para AppyPay, etc.
          paymentData: {}
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Assinatura renovada!",
        description: "Sua assinatura foi renovada com sucesso.",
      });

      // Redirecionar para área de membros ou dashboard
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error renewing subscription:', error);
      toast({
        title: "Erro ao renovar",
        description: error.message || "Ocorreu um erro ao renovar sua assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renovar {subscription?.products?.name}</CardTitle>
        <CardDescription>
          {subscription?.status === 'active' 
            ? 'Renovação antecipada' 
            : 'Reative sua assinatura'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span>Preço base</span>
            <span>{basePrice.toFixed(2)} KZ</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center text-green-600 mt-2">
              <span>Desconto ({discount}%)</span>
              <span>-{(basePrice * discount / 100).toFixed(2)} KZ</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total</span>
            <span>{finalPrice.toFixed(2)} KZ</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Métodos de pagamento disponíveis:
          </p>
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleRenew}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Renovar Assinatura'
            )}
          </Button>
        </div>

        {config.allow_reactivation === false && subscription?.status === 'canceled' && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Este produto não permite reativação automática. Entre em contato com o suporte.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
