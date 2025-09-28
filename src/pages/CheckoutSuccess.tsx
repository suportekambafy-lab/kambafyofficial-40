import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

const CheckoutSuccess = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  const [orderStatus, setOrderStatus] = useState<'loading' | 'pending' | 'completed' | 'error'>('loading');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const checkOrderStatus = async () => {
      if (!orderId && !sessionId) {
        setOrderStatus('error');
        return;
      }

      try {
        let query = supabase
          .from('orders')
          .select('*')
          .limit(1);

        if (orderId) {
          query = query.eq('order_id', orderId);
        } else if (sessionId) {
          query = query.eq('stripe_session_id', sessionId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Erro ao buscar pedido:', error);
          setOrderStatus('error');
          return;
        }

        if (!data) {
          console.error('Pedido não encontrado');
          setOrderStatus('error');
          return;
        }

        setOrderData(data);
        setOrderStatus(data.status === 'completed' ? 'completed' : 'pending');
      } catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
        setOrderStatus('error');
      }
    };

    checkOrderStatus();

    // Poll para verificar mudanças de status a cada 10 segundos
    const interval = setInterval(checkOrderStatus, 10000);
    return () => clearInterval(interval);
  }, [orderId, sessionId]);

  if (orderStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orderStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SEO 
          title="Erro - Kambafy"
          description="Houve um erro ao verificar o status do seu pedido."
        />
        
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Erro ao Verificar Pedido
            </h1>
            
            <p className="text-gray-600 mb-6">
              Não foi possível verificar o status do seu pedido. Entre em contato com o suporte.
            </p>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('mailto:suporte@kambafy.com', '_blank')}
            >
              Falar com Suporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SEO 
        title={orderStatus === 'completed' ? "Compra Confirmada - Kambafy" : "Pedido Recebido - Kambafy"}
        description={orderStatus === 'completed' 
          ? "Sua compra foi processada com sucesso. Obrigado por confiar na Kambafy!"
          : "Seu pedido foi recebido e está sendo processado."
        }
      />
      
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            orderStatus === 'completed' 
              ? 'bg-green-100' 
              : 'bg-yellow-100'
          }`}>
            {orderStatus === 'completed' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <Clock className="w-8 h-8 text-yellow-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {orderStatus === 'completed' ? 'Pagamento Confirmado!' : 'Pedido Recebido!'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {orderStatus === 'completed' 
              ? 'Sua compra foi processada com sucesso. Você receberá um email com os detalhes do seu pedido em breve.'
              : 'Seu pedido foi recebido e está sendo processado. Você será notificado assim que o pagamento for confirmado.'
            }
          </p>
          
          {orderData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Número do Pedido:</p>
              <p className="font-mono text-sm">{orderData.order_id}</p>
              {orderData.payment_method === 'transfer' && orderStatus === 'pending' && (
                <p className="text-xs text-yellow-600 mt-2">
                  Aguardando confirmação da transferência bancária
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/minhas-compras'}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Ver Minhas Compras
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('mailto:suporte@kambafy.com', '_blank')}
            >
              Falar com Suporte
            </Button>
          </div>
          
          <p className="text-xs text-gray-400 mt-6">
            Obrigado por escolher a Kambafy!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;