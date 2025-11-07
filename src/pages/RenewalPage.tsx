import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RenewalCheckout } from '@/components/subscriptions/RenewalCheckout';
import { SEO } from '@/components/SEO';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function RenewalPage() {
  const { token } = useParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token não fornecido');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscription_renewal_tokens')
          .select(`
            *,
            customer_subscriptions (
              *,
              products (*)
            )
          `)
          .eq('token', token)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .single();

        if (error || !data) {
          setError('Link inválido ou expirado');
        } else {
          setSubscription(data.customer_subscriptions);
        }
      } catch (err) {
        setError('Erro ao validar token');
        console.error('Error validating token:', err);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <SEO 
          title="Erro na Renovação" 
          description="Link de renovação inválido ou expirado"
        />
        <div className="container max-w-2xl mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title={`Renovar Assinatura - ${subscription?.products?.name || ''}`}
        description="Renove sua assinatura e continue aproveitando"
      />
      <div className="container max-w-2xl mx-auto py-8">
        <RenewalCheckout subscription={subscription} token={token!} />
      </div>
    </>
  );
}
