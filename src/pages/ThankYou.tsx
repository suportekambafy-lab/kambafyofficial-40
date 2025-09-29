import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, Phone, ExternalLink, Clock, CreditCard, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Memoizar createMemberAreaLinks para evitar recriação a cada render
  const memberAreaLinks = useMemo(() => createMemberAreaLinks(), []);
  const [product, setProduct] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [multibancoData, setMultibancoData] = useState<any>(null);
  const [multibancoLoading, setMultibancoLoading] = useState(false);
  const [multibancoError, setMultibancoError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const {
    user
  } = useAuth();
  const {
    setTheme
  } = useTheme();

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  const orderDetails = useMemo(() => ({
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
    status: searchParams.get('status') || 'pending',
    baseProductPrice: searchParams.get('base_product_price') || searchParams.get('amount') || '0',
    // Order Bump data
    orderBumpName: searchParams.get('order_bump_name') || '',
    orderBumpPrice: searchParams.get('order_bump_price') || '',
    orderBumpDiscount: searchParams.get('order_bump_discount') || '',
    orderBumpDiscountedPrice: searchParams.get('order_bump_discounted_price') || ''
  }), [searchParams]);

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
  const checkOrderStatus = useCallback(async () => {
    const orderId = orderDetails.orderId;
    if (!orderId) return;
    
    try {
      console.log('🔍 Verificando status do pedido:', orderId);
      const {
        data: order,
        error
      } = await supabase.from('orders').select('status').eq('order_id', orderId).single();
      
      if (error) {
        console.error('❌ Erro ao verificar status do pedido:', error);
        return;
      }
      
      if (order && order.status !== orderStatus) {
        console.log('✅ Status do pedido atualizado:', order.status);
        setOrderStatus(order.status);

        // Se o status mudou para 'completed', apenas atualizar o estado
        if (order.status === 'completed') {
          console.log('🎉 Pagamento aprovado! Status atualizado.');
        }
      }
    } catch (error) {
      console.error('❌ Erro na verificação do status:', error);
    }
  }, [orderDetails.orderId, orderStatus]);

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

      // Se não temos customer_name nos parâmetros, buscar do banco usando order_id
      if (orderDetails.customerName === 'Cliente' && orderDetails.orderId) {
        try {
          console.log('🔍 Buscando nome do cliente do banco de dados...');
          const {
            data: orderData,
            error: orderError
          } = await supabase.from('orders').select('customer_name, customer_email').eq('order_id', orderDetails.orderId).single();
          if (orderData && !orderError) {
            console.log('✅ Nome do cliente encontrado:', orderData.customer_name);
          }
        } catch (error) {
          console.error('❌ Erro ao buscar nome do cliente:', error);
        }
      }
      
      if (!orderDetails.productId) {
        console.log('⚠️ ThankYou: Sem product_id, finalizando...');
        setLoading(false);
        return;
      }
      
      try {
        console.log('📦 ThankYou: Carregando dados do produto...');

        // Check if productId is a UUID or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderDetails.productId);
        const {
          data: productData,
          error: productError
        } = await supabase.from('products').select(`
            *, 
            member_areas(id, name, url),
            profiles!products_user_id_fkey(full_name, email)
          `).eq(isUUID ? 'id' : 'slug', orderDetails.productId).single();
        
        if (productError) {
          console.error('❌ ThankYou: Erro ao carregar produto:', productError);
        }
        
        if (productData) {
          setProduct(productData);
          console.log('✅ ThankYou: Produto carregado:', productData);

          // Se o produto tem um seller, buscar dados do perfil
          if (productData.user_id && !productData.profiles) {
            console.log('🔍 ThankYou: Buscando perfil do vendedor...');
            const {
              data: profileData,
              error: profileError
            } = await supabase.from('profiles').select('full_name, email').eq('user_id', productData.user_id).single();
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
        const {
          data: relatedOrdersData,
          error: relatedError
        } = await supabase.from('orders').select('*').eq('order_id', orderDetails.orderId);
        
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
        const currentUser = user;
        if (currentUser && productData?.type === 'Curso' && productData?.member_areas?.id) {
          const {
            data: hasAccess,
            error: accessError
          } = await supabase.from('member_area_students').select('*').eq('student_email', currentUser.email).eq('member_area_id', productData.member_areas.id);
          
          if (accessError) {
            console.error('❌ ThankYou: Erro ao verificar acesso:', accessError);
          }
          
          if (!hasAccess || hasAccess.length === 0) {
            console.log('🔒 ThankYou: Usuário sem acesso, registrando...');
            const {
              error: insertError
            } = await supabase.from('member_area_students').insert({
              student_email: currentUser.email || '',
              student_name: currentUser.email?.split('@')[0] || 'Usuario',
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
    
    // Só executar se ainda não carregou
    if (!product && orderDetails.productId) {
      loadProduct();
    }
  }, []); // Remove todas as dependências - só executa no mount

  // Verificar o status do pedido periodicamente para pagamentos pendentes
  useEffect(() => {
    const orderId = orderDetails.orderId;
    const paymentMethod = orderDetails.paymentMethod;
    
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer', 'bank_transfer', 'transferencia'].includes(paymentMethod) && orderId) {
      console.log('🔄 Iniciando verificação periódica do status do pedido...');

      // Verificar imediatamente
      checkOrderStatus();

      // Verificar a cada 5 segundos para ser mais responsivo
      const interval = setInterval(() => {
        checkOrderStatus();
      }, 5000);
      
      return () => {
        console.log('🛑 Parando verificação periódica do status do pedido');
        clearInterval(interval);
      };
    }
  }, [orderStatus]); // Só depende do orderStatus

  // Real-time updates para pagamentos por transferência
  useEffect(() => {
    const orderId = orderDetails.orderId;
    if (!orderId || orderStatus !== 'pending') return;
    
    console.log('🔴 Configurando real-time updates para pedido:', orderId);
    const channel = supabase.channel(`order-status-${orderId}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      console.log('🔄 Atualização real-time recebida:', payload);
      const newOrder = payload.new as any;
      if (newOrder && newOrder.status !== orderStatus) {
        console.log('✅ Status do pedido atualizado via real-time:', newOrder.status);
        setOrderStatus(newOrder.status);

        // Se foi aprovado via real-time, apenas mostrar confirmação
        if (newOrder.status === 'completed') {
          console.log('🎉 Pagamento aprovado via real-time!');

          // Mostrar toast de confirmação
          const event = new CustomEvent('showTransferApproval', {
            detail: {
              message: 'Pagamento aprovado! Você receberá o acesso em instantes.',
              type: 'success'
            }
          });
          window.dispatchEvent(event);
        }
      }
    }).subscribe(status => {
      console.log('📡 Status da subscrição real-time:', status);
    });
    
    return () => {
      console.log('🔌 Desconectando real-time updates');
      // Usar unsubscribe ao invés de removeChannel para evitar erro
      channel.unsubscribe();
    };
  }, [orderStatus]); // Só depende do orderStatus, não do orderDetails completo
  const fetchMultibancoData = async () => {
    console.log('🏦 ThankYou: Buscando dados do Multibanco do Stripe...');
    console.log('Payment Intent ID:', orderDetails.paymentIntentId);
    setMultibancoLoading(true);
    setMultibancoError('');
    setDebugInfo(null);
    try {
      console.log('🔄 Chamando função get-multibanco-details...');
      const {
        data: multibancoDetails,
        error: multibancoError
      } = await supabase.functions.invoke('get-multibanco-details', {
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
  const [isAccessingProduct, setIsAccessingProduct] = useState(false);
  const handleAccessProduct = async () => {
    // Usar o status atual em vez do status inicial
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer'].includes(orderDetails.paymentMethod)) {
      const methodName = orderDetails.paymentMethod === 'multibanco' ? 'Multibanco' : orderDetails.paymentMethod === 'apple_pay' ? 'Apple Pay' : 'Transferência Bancária';
      alert(`O acesso ao produto será liberado após a confirmação do pagamento por ${methodName}.`);
      return;
    }
    if (product?.type === 'Curso' && product?.member_areas?.id) {
      setIsAccessingProduct(true);
      try {
        // Verificar se o usuário tem acesso diretamente
        const {
          data: memberAreaData,
          error: memberAreaError
        } = await supabase.from('member_areas').select('id, name, user_id').eq('id', product.member_areas.id).single();
        if (memberAreaError || !memberAreaData) {
          throw new Error('Área de membros não encontrada');
        }

        // Verificar se tem compra válida
        const {
          data: orders,
          error: ordersError
        } = await supabase.from('orders').select(`
            *,
            products!inner (
              member_area_id,
              member_areas!inner (
                id,
                name
              )
            )
          `).eq('customer_email', orderDetails.customerEmail).eq('status', 'completed').eq('products.member_areas.id', product.member_areas.id);
        if (ordersError || !orders || orders.length === 0) {
          throw new Error('Você não tem acesso a esta área de membros');
        }

        // Se chegou até aqui, tem acesso - redirecionar diretamente para área com query params
        window.location.href = `/members/area/${product.member_areas.id}?verified=true&email=${encodeURIComponent(orderDetails.customerEmail)}`;
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        alert(error.message || 'Erro ao acessar o produto. Tente novamente.');
      } finally {
        setIsAccessingProduct(false);
      }
    } else if (product?.share_link) {
      window.open(product.share_link, '_blank');
    } else {
      alert('Instruções de acesso enviadas para seu e-mail!');
    }
  };
  const getStatusBadge = () => {
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer', 'reference'].includes(orderDetails.paymentMethod)) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pendente
        </Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Pago
      </Badge>;
  };
  const getSuccessMessage = () => {
    if (orderStatus === 'pending' && ['multibanco', 'apple_pay', 'transfer'].includes(orderDetails.paymentMethod)) {
      return {
        title: "Obrigado pelo seu pedido!",
        subtitle: "Por favor, complete o seu pagamento para desbloquear o acesso."
      };
    }
    return {
      title: "Obrigado pelo seu pedido!",
      subtitle: "Por favor, complete o seu pagamento para desbloquear o acesso."
    };
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-checkout-green mx-auto mb-4"></div>
          <p>Processando sua compra...</p>
        </div>
      </div>;
  }
  const successMessage = getSuccessMessage();
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className={`text-white py-4 ${orderStatus === 'pending' ? 'bg-yellow-600' : 'bg-checkout-green'}`}>
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-3">
          {orderStatus === 'pending' ? <Clock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          <span className="text-lg font-semibold">
            {orderStatus === 'pending' ? 'PENDENTE' : 'COMPRA REALIZADA COM SUCESSO'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          
          <h1 className="text-3xl font-bold text-checkout-text mb-2">
            {successMessage.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {successMessage.subtitle}
          </p>
        </div>

        {/* Multibanco Payment Details */}
        {orderDetails.paymentMethod === 'multibanco' && orderStatus === 'pending' && <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">Pagamento por Multibanco</h3>
              </div>
              
              {multibancoLoading ? <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                  <p className="text-yellow-700">Carregando dados do pagamento...</p>
                </div> : multibancoData ? <div className="space-y-4">
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
                </div> : <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-red-700 font-medium">Erro ao carregar dados do Multibanco</p>
                    </div>
                    <p className="text-red-600 text-sm mb-2">
                      {multibancoError || 'Os dados do Multibanco não foram encontrados no Stripe'}
                    </p>
                    <Button onClick={fetchMultibancoData} variant="outline" size="sm" className="text-red-800 border-red-400 hover:bg-red-100">
                      Tentar Novamente
                    </Button>
                  </div>
                  
                  {debugInfo && <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Informações de Debug:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong>Payment Intent ID:</strong> {debugInfo.paymentIntentId}</p>
                        <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
                        {debugInfo.error && <p><strong>Erro:</strong> {debugInfo.error}</p>}
                        {debugInfo.response && <details className="mt-2">
                            <summary className="cursor-pointer text-gray-700">Ver resposta completa</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                              {JSON.stringify(debugInfo.response, null, 2)}
                            </pre>
                          </details>}
                      </div>
                    </div>}
                </div>}
            </CardContent>
          </Card>}

        {/* Bank Transfer Payment Details */}
        {orderDetails.paymentMethod === 'transfer' && orderStatus === 'pending' && <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800">Pagamento por Transferência Bancária</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-green-700 font-medium">Comprovativo enviado com sucesso!</p>
                  </div>
                  <p className="text-green-600 text-sm">
                    Recebemos o seu comprovativo de transferência bancária. 
                    O pedido está agora em análise pela nossa equipe.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3">Status do Pagamento</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-yellow-700">Aguardando Confirmação</span>
                  </div>
                </div>
                
                <div className="text-sm text-blue-700 space-y-2">
                  <p>• <strong>Próximos passos:</strong> Nossa equipe analisará o comprovativo em até 24 horas</p>
                  <p>• <strong>Confirmação:</strong> Você receberá um e-mail quando o pagamento for confirmado</p>
                  <p>• <strong>Acesso:</strong> O produto será liberado automaticamente após a aprovação</p>
                  <p>• <strong>Dúvidas:</strong> Entre em contato conosco se precisar de ajuda</p>
                </div>
              </div>
            </CardContent>
          </Card>}

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
                {orderDetails.customerEmail && <div>
                    <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                    <p className="text-checkout-text">{orderDetails.customerEmail}</p>
                  </div>}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Produto</label>
                  <p className="text-checkout-text font-medium">{orderDetails.productName}</p>
                </div>
                
                {/* Order Bump Information */}
                {orderDetails.orderBumpName && <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <label className="text-sm font-medium text-orange-700">Produto Extra Adicionado</label>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-checkout-text font-medium">{orderDetails.orderBumpName}</p>
                        {orderDetails.orderBumpDiscount && parseInt(orderDetails.orderBumpDiscount) > 0 && <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 line-through">{orderDetails.orderBumpPrice}</span>
                            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                              -{orderDetails.orderBumpDiscount}% OFF
                            </span>
                          </div>}
                      </div>
                       <span className="text-green-600 font-medium">
                         {/* Mostrar valor correto do order bump */}
                         +{orderDetails.orderBumpDiscountedPrice || orderDetails.orderBumpPrice} {orderDetails.currency}
                       </span>
                    </div>
                  </div>}

                {/* Related Orders - Remover seção incorreta */}
                {/* Esta seção foi removida pois estava incorreta - order bumps são mostrados acima */}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Total Pago</label>
                  <p className="text-2xl font-bold text-checkout-green">
                    {/* Para Multibanco, usar valor correto */}
                    {orderDetails.paymentMethod === 'multibanco' && multibancoData?.amount ? `€${multibancoData.amount}` : `${orderDetails.amount} ${orderDetails.currency}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data da Compra</label>
                  <p className="text-checkout-text">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                {orderDetails.paymentMethod && <div>
                    <label className="text-sm font-medium text-muted-foreground">Método de Pagamento</label>
                    <p className="text-checkout-text capitalize">{orderDetails.paymentMethod}</p>
                  </div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Section - Only show for Courses and E-books, not for Payment Links */}
        {product?.type !== 'Link de Pagamento' && <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-checkout-text mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Acesso ao Produto
              </h3>
              
              {orderStatus === 'pending' && ['multibanco', 'transfer', 'reference'].includes(orderDetails.paymentMethod) ? <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm mb-2">
                    <strong>Pendente:</strong> O acesso estará disponível assim que a referência de pagamento for confirmada.
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Você receberá um e-mail de confirmação assim que o pagamento for processado.
                  </p>
                </div> : <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>Entrega Instantânea:</strong> Seu produto digital está disponível imediatamente!
                  </p>
                  {product?.type === 'Curso' && product?.member_areas ? <p className="text-blue-700 text-sm">
                      Seu acesso ao curso <strong>{product.member_areas.name}</strong> foi liberado automaticamente. 
                      Clique no botão abaixo para acessar as aulas.
                    </p> : <p className="text-blue-700 text-sm">
                      {orderDetails.customerEmail ? `Instruções de acesso foram enviadas para ${orderDetails.customerEmail}` : 'Clique no botão abaixo para acessar seu produto.'}
                    </p>}
                </div>}
              
              <Button onClick={handleAccessProduct} className={`w-full md:w-auto ${orderStatus === 'pending' ? 'bg-gray-400 cursor-not-allowed' : 'bg-checkout-green hover:bg-checkout-green/90'}`} disabled={orderStatus === 'pending' && ['multibanco', 'transfer'].includes(orderDetails.paymentMethod) || isAccessingProduct}>
                {isAccessingProduct ? <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Verificando acesso...
                  </> : product?.type === 'Curso' && product?.member_areas ? <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {orderStatus === 'pending' ? 'Pendente' : 'Acessar Curso'}
                  </> : <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {orderStatus === 'pending' ? 'Pendente' : 'Acessar Produto'}
                  </>}
              </Button>
            </CardContent>
          </Card>}
        
        {/* Thank you message for Payment Links */}
        {product?.type === 'Link de Pagamento' && <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Muito obrigado por comprar com a Kambafy!
                </h3>
                <p className="text-green-700">
                  Sua confiança em nós é o que nos motiva a continuar oferecendo os melhores produtos digitais.
                </p>
              </div>
            </CardContent>
          </Card>}

        {/* Support Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className={`text-lg font-semibold text-checkout-text mb-4 ${!product?.support_whatsapp ? 'text-center' : ''}`}>
              Precisa de Ajuda?
            </h3>
            <div className={`gap-4 ${product?.support_whatsapp ? 'grid md:grid-cols-2' : 'flex justify-center'}`}>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Mail className="w-5 h-5 text-checkout-green" />
                <div>
                  <p className="font-medium text-checkout-text">E-mail</p>
                  <p className="text-sm text-muted-foreground">
                    {product?.support_email || sellerProfile?.email || 'suporte@kambafy.com'}
                  </p>
                </div>
              </div>
              {product?.support_whatsapp && <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="w-5 h-5 text-checkout-green" />
                  <div>
                    <p className="font-medium text-checkout-text">WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      {product.support_whatsapp}
                    </p>
                  </div>
                </div>}
            </div>
            {product?.fantasy_name && <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Suporte fornecido por: <span className="font-medium">{product.fantasy_name}</span>
                </p>
              </div>}
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
          <div className="w-16 h-16 rounded-lg mx-auto flex items-center justify-center bg-green-600 p-2">
            <img 
              src="/kambafy-symbol.svg" 
              alt="Kambafy" 
              className="w-full h-full object-contain filter brightness-0 invert"
            />
          </div>
          <div>
            <h4 className="font-semibold text-green-600">Kambafy</h4>
            <p className="text-sm text-muted-foreground">Obrigado por confiar em nós!</p>
          </div>
        </div>
      </div>
    </div>;
};
export default ThankYou;