import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

const CheckoutSuccess = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  
  const [orderStatus, setOrderStatus] = useState<'loading' | 'verifying' | 'pending' | 'completed' | 'error'>('loading');
  const [orderData, setOrderData] = useState<any>(null);
  const [upsellConfig, setUpsellConfig] = useState<any>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(false);

  console.log('🔍 CheckoutSuccess - URL Params:', {
    orderId,
    sessionId,
    allParams: Object.fromEntries(searchParams.entries())
  });

  useEffect(() => {
    const checkOrderStatus = async () => {
      if (!orderId && !sessionId) {
        console.log('❌ No orderId or sessionId found');
        setOrderStatus('error');
        return;
      }

      setOrderStatus('verifying');
      console.log('🔍 Verificando status do pagamento...');

      try {
        const { data, error } = await supabase.functions.invoke('check-order-status', {
          body: { orderId, sessionId }
        });

        if (error) {
          console.error('❌ Erro ao verificar status do pedido:', error);
          setOrderStatus('error');
          return;
        }

        if (data?.order) {
          console.log('📦 Resposta da validação:', {
            status: data.order.status,
            paymentVerified: data.paymentVerified,
            payment_method: data.order.payment_method
          });
          
          setOrderData(data.order);
          setPaymentVerified(data.paymentVerified === true);
          
          // Só considerar 'completed' se TANTO o status quanto a verificação forem verdadeiros
          if (data.order.status === 'completed' && data.paymentVerified === true) {
            console.log('✅ Pagamento confirmado! Verificando upsell...');
            setOrderStatus('completed');
            
            // Calcular valor total incluindo order bumps
            let totalAmount = parseFloat(data.order.amount) || 0;
            
            if (data.order.order_bump_data) {
              try {
                const bumpData = typeof data.order.order_bump_data === 'string' 
                  ? JSON.parse(data.order.order_bump_data) 
                  : data.order.order_bump_data;
                
                if (bumpData) {
                  // Se tem múltiplos itens
                  if (Array.isArray(bumpData.items)) {
                    bumpData.items.forEach((item: any) => {
                      totalAmount += parseFloat(item.bump_product_price || 0);
                    });
                  }
                  // Se é um único item (formato antigo)
                  else if (bumpData.bump_product_price) {
                    totalAmount += parseFloat(bumpData.bump_product_price);
                  }
                }
                
                console.log('💰 Valor calculado com upsells:', { 
                  baseAmount: data.order.amount, 
                  totalAmount,
                  orderBumpData: bumpData 
                });
              } catch (error) {
                console.error('❌ Erro ao processar order_bump_data:', error);
              }
            }
            
            // Disparar evento de Purchase para Facebook Pixel
            console.log('📤 Dispatching purchase-completed event for Facebook Pixel');
            window.dispatchEvent(new CustomEvent('purchase-completed', {
              detail: {
                amount: totalAmount,
                currency: data.order.currency || 'KZ',
                orderId: data.order.order_id,
                productId: data.order.product_id
              }
            }));
            
            // Agora SIM podemos verificar o upsell
            if (data.order.product_id) {
              await checkUpsellConfig(data.order.product_id);
            }
          } else if (data.order.status === 'failed') {
            console.log('❌ Pagamento falhou');
            setOrderStatus('error');
          } else {
            console.log('⏳ Pagamento ainda em processamento');
            setOrderStatus('pending');
          }
        } else {
          setOrderStatus('error');
        }
      } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
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
            console.log('✅ Configuração de upsell encontrada, redirecionando...');
            setUpsellConfig(settings.upsell);
            // Redirecionar após 3 segundos
            setTimeout(() => {
              window.location.href = settings.upsell.link_pagina_upsell;
            }, 3000);
          } else {
            console.log('ℹ️ Upsell não configurado ou desabilitado');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar configurações de upsell:', error);
      }
    };

    // Timeout de segurança: 45 segundos
    const timeoutId = setTimeout(() => {
      if (orderStatus !== 'completed' && orderStatus !== 'error') {
        console.log('⏱️ Timeout de verificação (45s) - status:', orderStatus);
        setVerificationTimeout(true);
        setOrderStatus('pending');
      }
    }, 45000);

    checkOrderStatus();

    // Poll a cada 15 segundos se ainda estiver pending
    const pollInterval = setInterval(() => {
      if (orderStatus === 'pending' || orderStatus === 'verifying') {
        checkOrderStatus();
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
    };
  }, [orderId, sessionId, supabase]);

  if (orderStatus === 'loading' || orderStatus === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {orderStatus === 'loading' ? 'Carregando...' : 'Verificando seu pagamento...'}
          </p>
        </div>
      </div>
    );
  }

  if (orderStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <SEO 
          title="Erro - Kambafy"
          description="Houve um erro ao verificar o status do seu pedido."
        />
        
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Erro ao Verificar Pedido</h1>
              <p className="text-muted-foreground">
                Não foi possível verificar o status do seu pedido. Entre em contato com o suporte.
              </p>
            </div>
            
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

  if (orderStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <SEO 
          title="Pagamento Pendente - Kambafy"
          description="Seu pagamento está sendo processado"
        />
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Pagamento em Processamento</h1>
              {verificationTimeout ? (
                <p className="text-muted-foreground">
                  Seu pagamento está sendo confirmado pelo provedor. Você receberá um email assim que for processado.
                  Pode fechar esta página com segurança.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Aguardando confirmação do pagamento...
                </p>
              )}
            </div>

            {orderData?.order_id && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Número do Pedido</p>
                <p className="font-mono font-bold">{orderData.order_id}</p>
              </div>
            )}

            <Button
              onClick={() => navigate('/meus-produtos')}
              className="w-full"
            >
              Ir para Meus Produtos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <SEO 
        title="Compra Confirmada - Kambafy"
        description="Sua compra foi processada com sucesso. Obrigado por confiar na Kambafy!"
      />
      
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              {upsellConfig 
                ? 'Sua compra foi processada com sucesso! Você será redirecionado para uma oferta especial em instantes...'
                : 'Sua compra foi processada com sucesso. Você receberá um email com os detalhes do seu pedido em breve.'
              }
            </p>
          </div>
          
          {upsellConfig && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-sm font-medium text-primary">
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
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Número do Pedido</p>
              <p className="font-mono font-bold">{orderData.order_id}</p>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;