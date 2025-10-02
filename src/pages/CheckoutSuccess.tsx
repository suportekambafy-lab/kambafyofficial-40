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
  const expressConfirmed = searchParams.get('express_confirmed') === 'true';
  const [orderStatus, setOrderStatus] = useState<'loading' | 'pending' | 'completed' | 'error'>('loading');
  const [orderData, setOrderData] = useState<any>(null);
  const [upsellConfig, setUpsellConfig] = useState<any>(null);

  console.log('🔍 CheckoutSuccess - URL Params:', {
    orderId,
    sessionId,
    expressConfirmed,
    allParams: Object.fromEntries(searchParams.entries())
  });

  useEffect(() => {
    const checkOrderStatus = async () => {
      if (!orderId && !sessionId) {
        console.log('❌ No orderId or sessionId found');
        setOrderStatus('error');
        return;
      }

      // Se veio de Express confirmado, já marcar como completed
      if (expressConfirmed) {
        console.log('🎉 EXPRESS CONFIRMED PARAMETER DETECTED - Setting status to completed immediately');
        setOrderStatus('completed');
        
        // Buscar dados do pedido para upsell
        try {
          console.log('📦 Fetching order data for order_id:', orderId);
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, products(*)')
            .eq('order_id', orderId)
            .single();
          
          if (orderError) {
            console.error('❌ Error fetching order:', orderError);
          }
          
          if (order) {
            console.log('✅ Order data loaded:', order);
            setOrderData(order);
            if (order.product_id) {
              await checkUpsellConfig(order.product_id);
            }
          } else {
            console.log('⚠️ No order found for order_id:', orderId);
          }
        } catch (error) {
          console.error('💥 Exception loading order data:', error);
        }
        return;
      }

      console.log('⏳ Checking order status via edge function...');
      try {
        // Usar a edge function para verificar o status do pedido
        const { data, error } = await supabase.functions.invoke('check-order-status', {
          body: { orderId, sessionId }
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          setOrderStatus('error');
          return;
        }

        if (!data.success || !data.order) {
          console.error('❌ Order not found in response:', data);
          setOrderStatus('error');
          return;
        }

        console.log('✅ Order found:', data.order);
        setOrderData(data.order);
        const newStatus = data.order.status === 'completed' ? 'completed' : 'pending';
        console.log('📊 Setting order status to:', newStatus);
        setOrderStatus(newStatus);
        
        // Se o pedido estiver completo, verificar configurações de upsell
        if (newStatus === 'completed' && data.order.product_id) {
          await checkUpsellConfig(data.order.product_id);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
        setOrderStatus('error');
      }
    };

    const checkUpsellConfig = async (productId: string) => {
      try {
        const { data: upsellData } = await supabase
          .from('checkout_customizations')
          .select('settings')
          .eq('product_id', productId)
          .maybeSingle();

        if (upsellData?.settings && typeof upsellData.settings === 'object') {
          const settings = upsellData.settings as any;
          if (settings.upsell?.enabled && settings.upsell?.link_pagina_upsell) {
            console.log('Configuração de upsell encontrada, redirecionando...');
            setUpsellConfig(settings.upsell);
            // Redirecionar após 3 segundos
            setTimeout(() => {
              window.location.href = settings.upsell.link_pagina_upsell;
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar configurações de upsell:', error);
      }
    };

    // Verificar status inicial
    checkOrderStatus();

    // Poll apenas se ainda não temos dados ou se o status for pending (e não for Express confirmado)
    if (!expressConfirmed) {
      const interval = setInterval(() => {
        if (orderStatus === 'pending' || orderStatus === 'loading') {
          checkOrderStatus();
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [orderId, sessionId, expressConfirmed]);

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
              ? upsellConfig 
                ? 'Sua compra foi processada com sucesso! Você será redirecionado para uma oferta especial em instantes...'
                : 'Sua compra foi processada com sucesso. Você receberá um email com os detalhes do seu pedido em breve.'
              : 'Seu pedido foi recebido e está sendo processado. Você será notificado assim que o pagamento for confirmado.'
            }
          </p>
          
          {upsellConfig && orderStatus === 'completed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p className="text-sm font-medium text-blue-800">
                  Redirecionando para oferta especial...
                </p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.location.href = upsellConfig.link_pagina_upsell}
                className="text-xs"
              >
                Ir agora
              </Button>
            </div>
          )}
          
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
          
          {!upsellConfig && (
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => window.location.href = '/minhas-compras'}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Ver Meus Acessos
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('mailto:suporte@kambafy.com', '_blank')}
              >
                Falar com Suporte
              </Button>
            </div>
          )}
          
          <div className="mt-8 flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-600 p-2">
              <img 
                src="/kambafy-symbol.svg" 
                alt="Kambafy" 
                className="w-full h-full object-contain filter brightness-0 invert"
              />
            </div>
            <p className="text-xs text-gray-400">
              Obrigado por escolher a Kambafy!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;