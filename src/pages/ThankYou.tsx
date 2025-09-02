
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Phone, ExternalLink, Clock, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [multibancoData, setMultibancoData] = useState<any>(null);
  const [multibancoLoading, setMultibancoLoading] = useState(false);
  const [multibancoError, setMultibancoError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const { user } = useAuth();
  const { setTheme } = useTheme();

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  const [orderDetails, setOrderDetails] = useState({
    orderId: searchParams.get('order_id') || Math.random().toString(36).substr(2, 9).toUpperCase(),
    customerName: searchParams.get('customer_name') || 'Cliente',
    customerEmail: searchParams.get('customer_email') || '',
    productName: searchParams.get('product_name') || 'Produto Digital',
    amount: searchParams.get('amount') || '0',
    currency: searchParams.get('currency') || 'KZ',
    convertedAmount: searchParams.get('converted_amount') || '',
    convertedCurrency: searchParams.get('converted_currency') || '',
    productId: searchParams.get('product_id') || '',
    sellerId: searchParams.get('seller_id') || '',
    paymentMethod: searchParams.get('payment_method') || '',
    paymentIntentId: searchParams.get('payment_intent_id') || '',
    status: searchParams.get('status') || 'completed',
    baseProductPrice: searchParams.get('base_product_price') || searchParams.get('amount') || '0',
    // Order Bump data
    orderBumpName: searchParams.get('order_bump_name') || '',
    orderBumpPrice: searchParams.get('order_bump_price') || '',
    orderBumpDiscount: searchParams.get('order_bump_discount') || '',
    orderBumpDiscountedPrice: searchParams.get('order_bump_discounted_price') || ''
  });

  // Estado para pedidos relacionados (upsells)
  const [relatedOrders, setRelatedOrders] = useState<any[]>([]);

  // Verificar se chegamos de um cancelamento do Stripe
  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    if (redirectStatus === 'failed') {
      // Redirecionar de volta ao checkout
      navigate(`/checkout/${orderDetails.productId}`);
      return;
    }
  }, [searchParams, navigate, orderDetails.productId]);

  // Função para verificar o status do pedido no banco de dados
  const checkOrderStatus = async () => {
    if (!orderDetails.orderId) return;
    
    try {
      console.log('🔍 Verificando status do pedido:', orderDetails.orderId);
      const { data: order, error } = await supabase
        .from('orders')
        .select('status')
        .eq('order_id', orderDetails.orderId)
        .single();

      if (error) {
        console.error('❌ Erro ao verificar status do pedido:', error);
        return;
      }

      if (order && order.status !== orderStatus) {
        console.log('✅ Status do pedido atualizado:', order.status);
        setOrderStatus(order.status);
        setOrderDetails(prev => ({ ...prev, status: order.status }));
      }
    } catch (error) {
      console.error('❌ Erro na verificação do status:', error);
    }
  };

  // Verificar se chegamos de uma página de upsell
  useEffect(() => {
    const fromOrder = searchParams.get('from_order');
    const returnUrl = searchParams.get('return_url');
    
    if (fromOrder && returnUrl) {
      console.log('🎯 Voltando de página de upsell, redirecionando para página original');
      // Redirecionar para a página original sem os parâmetros do upsell
      window.location.href = returnUrl;
      return;
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProduct = async () => {
      console.log('🔍 ThankYou: ==> CARREGANDO PRODUTO <==');
      console.log('📋 Detalhes do pedido:', orderDetails);

      // Definir status inicial
      setOrderStatus(orderDetails.status);

      if (!orderDetails.productId) {
        console.log('⚠️ ThankYou: Sem product_id, finalizando...');
        setLoading(false);
        return;
      }

      try {
        console.log('📦 ThankYou: Carregando dados do produto...');
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *, 
            member_areas(id, name, url),
            profiles!products_user_id_fkey(full_name, email)
          `)
          .eq('id', orderDetails.productId)
          .single();
        
        if (productError) {
          console.error('❌ ThankYou: Erro ao carregar produto:', productError);
        }
        
        if (productData) {
          setProduct(productData);
          console.log('✅ ThankYou: Produto carregado:', productData);
          
          // Se o produto tem um seller, buscar dados do perfil
          if (productData.user_id && !productData.profiles) {
            console.log('🔍 ThankYou: Buscando perfil do vendedor...');
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', productData.user_id)
              .single();
              
            if (profileData && !profileError) {
              setSellerProfile(profileData);
              console.log('✅ ThankYou: Perfil do vendedor carregado:', profileData);
            }
          } else if (productData.profiles) {
            setSellerProfile(productData.profiles);
          }
        } else {
          console.log('❌ ThankYou: Produto não encontrado');
        }

        // Buscar pedidos relacionados (upsells vinculados a este pedido)
        console.log('🔗 ThankYou: Buscando pedidos relacionados...');
        const { data: relatedOrdersData, error: relatedError } = await supabase
          .from('orders')
          .select('*')
          .or(`parent_order_id.eq.${orderDetails.orderId},order_id.eq.${orderDetails.orderId}`)
          .neq('order_id', orderDetails.orderId);

        if (relatedError) {
          console.error('❌ Erro ao buscar pedidos relacionados:', relatedError);
        } else if (relatedOrdersData?.length > 0) {
          console.log('✅ Pedidos relacionados encontrados:', relatedOrdersData);
          setRelatedOrders(relatedOrdersData);
        }

        // Para Multibanco e Apple Pay, buscar dados reais do Stripe se necessário
        if (['multibanco', 'apple_pay'].includes(orderDetails.paymentMethod) && orderDetails.paymentIntentId) {
          if (orderDetails.paymentMethod === 'multibanco') {
            await fetchMultibancoData();
          }
        }

        // Verificar se o usuário está autenticado e redirecionar se necessário
        if (user && productData?.type === 'Curso' && productData?.member_areas?.id) {
          const { data: hasAccess, error: accessError } = await supabase
            .from('member_area_students')
            .select('*')
            .eq('student_email', user.email)
            .eq('member_area_id', productData.member_areas.id);

          if (accessError) {
            console.error('❌ ThankYou: Erro ao verificar acesso:', accessError);
          }

          if (!hasAccess || hasAccess.length === 0) {
            console.log('🔒 ThankYou: Usuário sem acesso, registrando...');
            const { error: insertError } = await supabase
              .from('member_area_students')
              .insert({
                student_email: user.email || '',
                student_name: user.email?.split('@')[0] || 'Usuario',
                member_area_id: productData.member_areas.id
              });

            if (insertError) {
              console.error('❌ ThankYou: Erro ao registrar acesso:', insertError);
            } else {
              console.log('✅ ThankYou: Acesso registrado com sucesso!');
            }
          } else {
            console.log('✅ ThankYou: Usuário já tem acesso');
          }
        }
      } catch (error) {
        console.error('❌ ThankYou: Erro no processamento:', error);
      } finally {
        setLoading(false);
        console.log('🏁 ThankYou: ==> PROCESSAMENTO FINALIZADO <==');
      }
    };

    loadProduct();
  }, [orderDetails.productId, user, orderDetails]);

  // Verificar o status do pedido periodicamente para pagamentos pendentes
  useEffect(() => {
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay'].includes(orderDetails.paymentMethod)) {
      console.log('🔄 Iniciando verificação periódica do status do pedido...');
      
      // Verificar imediatamente
      checkOrderStatus();
      
      // Verificar a cada 10 segundos
      const interval = setInterval(checkOrderStatus, 10000);
      
      return () => {
        console.log('🛑 Parando verificação periódica do status do pedido');
        clearInterval(interval);
      };
    }
  }, [orderStatus, orderDetails.paymentMethod, orderDetails.orderId]);

  const fetchMultibancoData = async () => {
    console.log('🏦 ThankYou: Buscando dados do Multibanco do Stripe...');
    console.log('Payment Intent ID:', orderDetails.paymentIntentId);
    
    setMultibancoLoading(true);
    setMultibancoError('');
    setDebugInfo(null);
    
    try {
      console.log('🔄 Chamando função get-multibanco-details...');
      const { data: multibancoDetails, error: multibancoError } = await supabase.functions.invoke('get-multibanco-details', {
        body: {
          payment_intent_id: orderDetails.paymentIntentId
        }
      });

      console.log('📨 Response from get-multibanco-details:', { 
        data: multibancoDetails, 
        error: multibancoError 
      });

      // Salvar informações de debug
      setDebugInfo({
        paymentIntentId: orderDetails.paymentIntentId,
        response: multibancoDetails,
        error: multibancoError,
        timestamp: new Date().toISOString()
      });

      if (multibancoError) {
        console.error('❌ ThankYou: Erro ao buscar dados Multibanco:', multibancoError);
        setMultibancoError(`Erro na função: ${multibancoError.message || 'Erro desconhecido'}`);
      } else if (multibancoDetails?.error) {
        console.error('❌ ThankYou: Erro retornado pela função:', multibancoDetails.error);
        setMultibancoError(`${multibancoDetails.error}`);
      } else if (multibancoDetails && multibancoDetails.entity && multibancoDetails.reference) {
        console.log('✅ ThankYou: Dados Multibanco recebidos:', multibancoDetails);
        setMultibancoData(multibancoDetails);
        setMultibancoError('');
      } else {
        console.log('❌ ThankYou: Dados Multibanco inválidos ou incompletos');
        console.log('Dados recebidos:', multibancoDetails);
        setMultibancoError('Dados do Multibanco não encontrados. O pagamento pode não ter sido processado corretamente pelo Stripe.');
      }
    } catch (error) {
      console.error('❌ ThankYou: Erro ao chamar função:', error);
      setMultibancoError(`Erro na chamada: ${error.message || 'Erro de conexão'}`);
      setDebugInfo({
        paymentIntentId: orderDetails.paymentIntentId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setMultibancoLoading(false);
    }
  };

  const handleAccessProduct = () => {
    // Usar o status atual em vez do status inicial
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay'].includes(orderDetails.paymentMethod)) {
      const methodName = orderDetails.paymentMethod === 'multibanco' ? 'Multibanco' : 'Apple Pay';
      alert(`O acesso ao produto será liberado após a confirmação do pagamento por ${methodName}.`);
      return;
    }

    if (product?.type === 'Curso' && product?.member_areas?.id) {
      navigate(`/area/${product.member_areas.id}`);
    } else if (product?.share_link) {
      window.open(product.share_link, '_blank');
    } else {
      alert('Instruções de acesso enviadas para seu e-mail!');
    }
  };

  const getStatusBadge = () => {
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer'].includes(orderDetails.paymentMethod)) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Pago
      </Badge>
    );
  };

  const getSuccessMessage = () => {
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer'].includes(orderDetails.paymentMethod)) {
      return {
        title: "Pedido Criado com Sucesso!",
        subtitle: "Complete o pagamento para ter acesso ao produto"
      };
    }
    return {
      title: "Obrigado pela sua compra!",
      subtitle: "Sua compra foi processada com sucesso"
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-checkout-green mx-auto mb-4"></div>
          <p>Processando sua compra...</p>
        </div>
      </div>
    );
  }

  const successMessage = getSuccessMessage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`text-white py-4 ${orderStatus === 'pending' ? 'bg-yellow-600' : 'bg-checkout-green'}`}>
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-3">
          {orderStatus === 'pending' ? (
            <Clock className="w-6 h-6" />
          ) : (
            <CheckCircle className="w-6 h-6" />
          )}
          <span className="text-lg font-semibold">
            {orderStatus === 'pending' ? 'PENDENTE' : 'COMPRA REALIZADA COM SUCESSO'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
            orderStatus === 'pending' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {orderStatus === 'pending' ? (
              <Clock className={`w-12 h-12 ${orderStatus === 'pending' ? 'text-yellow-600' : 'text-green-600'}`} />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-checkout-text mb-2">
            {successMessage.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {successMessage.subtitle}
          </p>
        </div>

        {/* Multibanco Payment Details */}
        {orderDetails.paymentMethod === 'multibanco' && orderStatus === 'pending' && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">Pagamento por Multibanco</h3>
              </div>
              
              {multibancoLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                  <p className="text-yellow-700">Carregando dados do pagamento...</p>
                </div>
              ) : multibancoData ? (
                <div className="space-y-4">
                  <p className="text-yellow-700">
                    Para completar sua compra, efetue o pagamento usando a referência abaixo:
                  </p>
                  
                  <div className="bg-white p-4 rounded-lg border border-yellow-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Entidade</p>
                        <p className="text-lg font-bold text-gray-900">{multibancoData.entity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Referência</p>
                        <p className="text-lg font-bold text-gray-900">{multibancoData.reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Valor</p>
                        <p className="text-lg font-bold text-green-600">
                          €{multibancoData.amount}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-yellow-700 space-y-2">
                    <p>• Use estes dados para efetuar o pagamento em qualquer caixa multibanco ou homebanking</p>
                    <p>• O acesso ao produto será liberado automaticamente após a confirmação do pagamento</p>
                    <p>• Pode demorar até 24 horas para a confirmação do pagamento</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-red-700 font-medium">Erro ao carregar dados do Multibanco</p>
                    </div>
                    <p className="text-red-600 text-sm mb-2">
                      {multibancoError || 'Os dados do Multibanco não foram encontrados no Stripe'}
                    </p>
                    <Button 
                      onClick={fetchMultibancoData}
                      variant="outline"
                      size="sm"
                      className="text-red-800 border-red-400 hover:bg-red-100"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                  
                  {debugInfo && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Informações de Debug:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Payment Intent ID:</strong> {debugInfo.paymentIntentId}</p>
                        <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
                        {debugInfo.error && <p><strong>Erro:</strong> {debugInfo.error}</p>}
                        {debugInfo.response && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-gray-700">Ver resposta completa</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                              {JSON.stringify(debugInfo.response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Details Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-checkout-text">Detalhes do Pedido</h2>
              {getStatusBadge()}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número do Pedido</label>
                  <p className="text-checkout-text font-medium">{orderDetails.orderId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Cliente</label>
                  <p className="text-checkout-text">{orderDetails.customerName}</p>
                </div>
                {orderDetails.customerEmail && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                    <p className="text-checkout-text">{orderDetails.customerEmail}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Produto</label>
                  <p className="text-checkout-text font-medium">{orderDetails.productName}</p>
                </div>
                
                {/* Order Bump Information */}
                {orderDetails.orderBumpName && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <label className="text-sm font-medium text-orange-700">Produto Extra Adicionado</label>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-checkout-text font-medium">{orderDetails.orderBumpName}</p>
                        {orderDetails.orderBumpDiscount && parseInt(orderDetails.orderBumpDiscount) > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 line-through">{orderDetails.orderBumpPrice}</span>
                            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                              -{orderDetails.orderBumpDiscount}% OFF
                            </span>
                          </div>
                        )}
                      </div>
                       <span className="text-green-600 font-medium">
                        {/* Para Multibanco, usar proporção do valor principal */}
                        {orderDetails.paymentMethod === 'multibanco' && multibancoData?.amount
                          ? `+€${orderDetails.orderBumpDiscountedPrice ? ((parseFloat(orderDetails.orderBumpDiscountedPrice) / parseFloat(orderDetails.amount)) * parseFloat(multibancoData.amount)).toFixed(2) : ((parseFloat(orderDetails.orderBumpPrice) / parseFloat(orderDetails.amount)) * parseFloat(multibancoData.amount)).toFixed(2)}`
                          : `+${orderDetails.orderBumpDiscountedPrice || orderDetails.orderBumpPrice} ${orderDetails.convertedCurrency || orderDetails.currency}`
                        }
                       </span>
                    </div>
                  </div>
                )}

                {/* Related Orders (Upsells) */}
                {relatedOrders.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Produtos Adicionais Comprados</label>
                    {relatedOrders.map((relatedOrder, index) => (
                      <div key={relatedOrder.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-checkout-text font-medium">{relatedOrder.product?.name || 'Produto Upsell'}</p>
                            <p className="text-xs text-blue-600">Pedido #{relatedOrder.order_id}</p>
                          </div>
                          <span className="text-green-600 font-medium">
                            {/* Para Multibanco, usar proporção do valor principal */}
                            {orderDetails.paymentMethod === 'multibanco' && multibancoData?.amount
                              ? `€${((parseFloat(relatedOrder.amount) / parseFloat(orderDetails.amount)) * parseFloat(multibancoData.amount)).toFixed(2)}`
                              : `${relatedOrder.amount} ${relatedOrder.currency}`
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Total Pago</label>
                  <p className="text-2xl font-bold text-checkout-green">
                    {/* Para Multibanco, usar o valor real do stripe */}
                    {orderDetails.paymentMethod === 'multibanco' && multibancoData?.amount
                      ? `€${multibancoData.amount}`
                      : orderDetails.convertedAmount && orderDetails.convertedCurrency 
                        ? `${orderDetails.convertedAmount} ${orderDetails.convertedCurrency}`
                        : `${orderDetails.amount} ${orderDetails.currency}`
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data da Compra</label>
                  <p className="text-checkout-text">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                {orderDetails.paymentMethod && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Método de Pagamento</label>
                    <p className="text-checkout-text capitalize">{orderDetails.paymentMethod}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-checkout-text mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Acesso ao Produto
            </h3>
            
            {orderStatus === 'pending' && ['multibanco', 'transfer'].includes(orderDetails.paymentMethod) ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 text-sm mb-2">
                  <strong>Pendente:</strong> O acesso ao produto será liberado após a confirmação do pagamento.
                </p>
                <p className="text-yellow-700 text-sm">
                  Você receberá um e-mail de confirmação assim que o pagamento for processado.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Entrega Instantânea:</strong> Seu produto digital está disponível imediatamente!
                </p>
                {product?.type === 'Curso' && product?.member_areas ? (
                  <p className="text-blue-700 text-sm">
                    Seu acesso ao curso <strong>{product.member_areas.name}</strong> foi liberado automaticamente. 
                    Clique no botão abaixo para acessar as aulas.
                  </p>
                ) : (
                  <p className="text-blue-700 text-sm">
                    {orderDetails.customerEmail ? 
                      `Instruções de acesso foram enviadas para ${orderDetails.customerEmail}` :
                      'Clique no botão abaixo para acessar seu produto.'
                    }
                  </p>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleAccessProduct}
              className={`w-full md:w-auto ${
                orderStatus === 'pending' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-checkout-green hover:bg-checkout-green/90'
              }`}
              disabled={orderStatus === 'pending' && ['multibanco', 'transfer'].includes(orderDetails.paymentMethod)}
            >
              {product?.type === 'Curso' && product?.member_areas ? (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {orderStatus === 'pending' ? 'Pendente' : 'Acessar Curso'}
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {orderStatus === 'pending' ? 'Pendente' : 'Acessar Produto'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className={`text-lg font-semibold text-checkout-text mb-4 ${
              !product?.support_whatsapp ? 'text-center' : ''
            }`}>
              Precisa de Ajuda?
            </h3>
            <div className={`gap-4 ${
              product?.support_whatsapp 
                ? 'grid md:grid-cols-2' 
                : 'flex justify-center'
            }`}>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Mail className="w-5 h-5 text-checkout-green" />
                <div>
                  <p className="font-medium text-checkout-text">E-mail</p>
                  <p className="text-sm text-muted-foreground">
                    {product?.support_email || sellerProfile?.email || 'suporte@kambafy.com'}
                  </p>
                </div>
              </div>
              {product?.support_whatsapp && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="w-5 h-5 text-checkout-green" />
                  <div>
                    <p className="font-medium text-checkout-text">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      {product.support_whatsapp}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {product?.fantasy_name && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Suporte fornecido por: <span className="font-medium">{product.fantasy_name}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/minhas-compras">
              Ver Minhas Compras
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-lg mx-auto flex items-center justify-center bg-green-600">
            <span className="text-2xl font-bold text-slate-50">K</span>
          </div>
          <div>
            <h4 className="font-semibold text-green-600">Kambafy</h4>
            <p className="text-sm text-muted-foreground">Obrigado por confiar em nós!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
