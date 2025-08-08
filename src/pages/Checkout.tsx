import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import professionalManImage from "@/assets/professional-man.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import CustomBanner from "@/components/checkout/CustomBanner";
import CountdownTimer from "@/components/checkout/CountdownTimer";
import FakeReviews from "@/components/checkout/FakeReviews";
import SocialProof from "@/components/checkout/SocialProof";
import StripeCardPayment from "@/components/checkout/StripeCardPayment";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { FacebookPixelTracker } from "@/components/FacebookPixelTracker";
import { useToast } from "@/hooks/use-toast";
import { PhoneInput } from "@/components/PhoneInput";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { OrderBump } from "@/components/checkout/OrderBump";
import { getPaymentMethodsByCountry } from "@/utils/paymentMethods";
import { SEO } from "@/components/SEO";
import { setProductSEO } from "@/utils/seoUtils";
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { 
    userCountry, 
    loading: geoLoading, 
    formatPrice, 
    convertPrice,
    changeCountry, 
    supportedCountries 
  } = useGeoLocation();
  const { affiliateCode, hasAffiliate } = useAffiliateTracking();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    phoneCountry: "AO"
  });
  const [selectedPayment, setSelectedPayment] = useState("");
  const [checkoutSettings, setCheckoutSettings] = useState<any>(null);
  const [orderBump, setOrderBump] = useState<any>(null);
  const [orderBumpPrice, setOrderBumpPrice] = useState(0);

  // Atualizar código de telefone automaticamente baseado no país detectado
  useEffect(() => {
    if (userCountry && !geoLoading) {
      setFormData(prev => ({
        ...prev,
        phoneCountry: userCountry.code,
        phone: prev.phone.startsWith('+') ? prev.phone : `${getPhoneCodeByCountry(userCountry.code)} `
      }));
    }
  }, [userCountry, geoLoading]);

  // Função para obter código de telefone baseado no país
  const getPhoneCodeByCountry = (countryCode: string): string => {
    const phoneCodes: Record<string, string> = {
      'AO': '+244',
      'PT': '+351',
      'MZ': '+258',
      'BR': '+55',
      'US': '+1',
      'GB': '+44',
      'ES': '+34',
      'FR': '+33',
      'IT': '+39',
      'DE': '+49',
      'CV': '+238',
      'ST': '+239'
    };
    return phoneCodes[countryCode] || '+244';
  };

  // Função para converter preço - usando a conversão direta sem arredondamentos extras
  const getConvertedPrice = (priceInKZ: number): number => {
    const converted = convertPrice(priceInKZ);
    console.log(`Converting ${priceInKZ} KZ to ${converted} ${userCountry.currency}`);
    return converted;
  };

  const getDisplayPrice = (priceInKZ: number): string => {
    const displayPrice = formatPrice(priceInKZ);
    console.log(`Displaying ${priceInKZ} KZ as ${displayPrice}`);
    return displayPrice;
  };

  // Forçar modo claro sempre
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  useEffect(() => {
    console.log('Checkout page loaded with productId:', productId);
    
    // Verificar se o usuário foi redirecionado de volta do Klarna
    const urlParams = new URLSearchParams(window.location.search);
    const paymentReturn = urlParams.get('payment_return');
    const redirectStatus = urlParams.get('redirect_status');
    const orderId = urlParams.get('order_id');
    const paymentIntentId = urlParams.get('payment_intent_id');
    
    if (paymentReturn === 'klarna') {
      console.log('🔄 User returned from Klarna payment');
      
      // Verificar o status do pagamento e redirecionar adequadamente
      if (redirectStatus === 'succeeded' && orderId) {
        // Pagamento bem-sucedido, redirecionar para página de obrigado
        const params = new URLSearchParams({
          order_id: orderId,
          payment_intent_id: paymentIntentId || '',
          status: 'completed'
        });
        navigate(`/obrigado?${params.toString()}`);
        return;
      } else if (redirectStatus === 'failed') {
        console.log('❌ Klarna payment failed or cancelled, staying on checkout');
        // Limpar os parâmetros da URL mas permanecer no checkout
        window.history.replaceState({}, document.title, window.location.pathname);
        toast({
          title: "Pagamento cancelado",
          description: "O pagamento foi cancelado. Você pode tentar novamente.",
          variant: "default"
        });
      }
    }
    
    const loadProduct = async () => {
      if (!productId) {
        console.error('No productId provided');
        setError("ID do produto não fornecido");
        setLoading(false);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(productId)) {
        console.error('Invalid UUID format for productId:', productId);
        setError(`ID do produto inválido: ${productId}`);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Loading product with valid UUID:', productId);
        
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            member_areas (
              id,
              name,
              url
            )
          `)
          .eq('id', productId)
          .single();

        console.log('Product query result:', { productData, productError });

        if (productError) {
          console.error('Error loading product:', productError);
          setError(`Erro ao carregar produto: ${productError.message}`);
          setProduct(null);
        } else if (!productData) {
          console.log('No product found with ID:', productId);
          setError("Produto não encontrado");
          setProduct(null);
        } else if (productData.status === 'Inativo') {
          console.log('Product is inactive:', productId);
          setProduct(productData);
          setError("");
        } else if (productData.status === 'Banido') {
          console.log('Product is banned:', productId);
          setProduct(productData);
          setError("");
        } else {
          console.log('Product loaded successfully:', productData);
          setProduct(productData);
          setError("");
          
          // Aplicar SEO imediatamente quando o produto carrega
          setProductSEO(productData);
        }
      } catch (error) {
        console.error('Unexpected error loading product:', error);
        setError("Erro inesperado ao carregar produto");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    const loadCheckoutSettings = async () => {
      if (!productId) {
        console.log('No productId provided for checkout settings');
        return;
      }
      
      try {
        console.log('🔍 Loading checkout settings for product:', productId);
        
        // Primeiro vamos verificar se a tabela existe
        const { data: tableExists } = await supabase
          .from('checkout_customizations')
          .select('id')
          .limit(1);
        
        console.log('📋 Table checkout_customizations exists, sample data:', tableExists);
        
        const { data, error } = await supabase
          .from('checkout_customizations')
          .select('*')
          .eq('product_id', productId)
          .maybeSingle();

        console.log('🎯 Checkout settings query result for product', productId, ':', { data, error });

        if (error) {
          console.error('❌ Error loading checkout settings:', error);
        } else if (data?.settings) {
          console.log('✅ Found checkout settings:', data.settings);
          console.log('📊 Settings breakdown:');
          const settings = data.settings as any;
          console.log('- Banner enabled:', settings.banner?.enabled);
          console.log('- Countdown enabled:', settings.countdown?.enabled);
          console.log('- Social proof enabled:', settings.socialProof?.enabled);
          console.log('- Reviews enabled:', settings.reviews?.enabled);
          setCheckoutSettings(settings);
        } else {
          console.log('ℹ️ No checkout settings found for product:', productId);
          console.log('💡 Check if checkout customization was configured for this product in the Apps section');
        }
      } catch (error) {
        console.error('💥 Unexpected error loading checkout settings:', error);
      }
    };

    loadProduct();
    loadCheckoutSettings();
  }, [productId, navigate, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCountryChange = (countryCode: string) => {
    changeCountry(countryCode);
    const phoneCode = getPhoneCodeByCountry(countryCode);
    setFormData(prev => ({
      ...prev,
      phoneCountry: countryCode,
      phone: phoneCode + " "
    }));
  };

  const getProductImage = (cover: string) => {
    if (!cover) return professionalManImage;
    if (cover.startsWith('data:')) {
      return cover;
    }
    // Se a URL já inclui supabase ou http/https, usar diretamente
    if (cover.includes('supabase') || cover.startsWith('http')) {
      return cover;
    }
    // Caso contrário, assumir que é ID do Unsplash (compatibilidade)
    return `https://images.unsplash.com/${cover}`;
  };

  const getPaymentMethods = () => {
    // Primeiro, verificar se o produto tem métodos de pagamento configurados
    if (product?.payment_methods && Array.isArray(product.payment_methods)) {
      // Filtrar apenas métodos habilitados E que sejam do país atual
      const enabledMethods = product.payment_methods.filter((method: any) => method.enabled);
      
      // Filtrar por país
      const countryMethods = enabledMethods.filter((method: any) => {
        if (userCountry.code === 'AO') {
          return ['express', 'reference', 'transfer'].includes(method.id);
        } else if (userCountry.code === 'MZ') {
          return ['emola', 'epesa'].includes(method.id);
        } else if (userCountry.code === 'PT') {
          return ['card', 'klarna', 'multibanco', 'apple_pay'].includes(method.id);
        }
        return false;
      });

      return countryMethods;
    }

    // Fallback: usar métodos baseados no país selecionado
    return getPaymentMethodsByCountry(userCountry.code);
  };

  const availablePaymentMethods = getPaymentMethods();

  const getSelectedPaymentName = () => {
    const selected = availablePaymentMethods.find(method => method.id === selectedPayment);
    return selected ? selected.name : "";
  };

  const getPaymentGridClasses = () => {
    const methodCount = availablePaymentMethods.length;
    
    if (methodCount === 1) return "grid-cols-1";
    if (methodCount === 2) return "grid-cols-2";
    if (methodCount === 3) return "grid-cols-3";
    return "grid-cols-2 md:grid-cols-4";
  };

  const handleOrderBumpToggle = (isSelected: boolean, bumpData: any) => {
    if (isSelected && bumpData) {
      setOrderBump(bumpData);
      // Calcular o preço com desconto em KZ
      const originalPrice = parseFloat(bumpData.bump_product_price.replace(/[^\d,]/g, '').replace(',', '.'));
      const discountedPriceInKZ = bumpData.discount > 0 
        ? originalPrice * (1 - bumpData.discount / 100)
        : originalPrice;
      setOrderBumpPrice(discountedPriceInKZ);
    } else {
      setOrderBump(null);
      setOrderBumpPrice(0);
    }
  };

  const handleCardPaymentSuccess = async (paymentResult: any) => {
    try {
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'completed',
          order_id: orderId
        })
        .eq('customer_email', formData.email)
        .eq('product_id', productId)
        .eq('status', 'pending');

      if (orderError) {
        console.error('Erro ao atualizar ordem:', orderError);
      }

      const newSalesCount = (product.sales || 0) + 1;
      await supabase
        .from('products')
        .update({ sales: newSalesCount })
        .eq('id', productId);

      try {
        console.log('🔔 Triggering webhooks for Stripe payment success...');
        
        const totalAmountInKZ = parseFloat(product.price) + orderBumpPrice;
        
        const webhookPayload = {
          event: 'payment.success',
          data: {
            order_id: orderId,
            amount: totalAmountInKZ.toString(),
            base_product_price: product.price,
            currency: 'KZ',
            customer_email: formData.email,
            customer_name: formData.fullName,
            product_id: product.id,
            product_name: product.name,
            payment_method: 'stripe',
            timestamp: new Date().toISOString(),
            order_bump: orderBump ? {
              bump_product_name: orderBump.bump_product_name,
              bump_product_price: orderBump.bump_product_price,
              discount: orderBump.discount,
              discounted_price: orderBumpPrice
            } : null
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: product.id
        };

        const { error: webhookError } = await supabase.functions.invoke('trigger-webhooks', {
          body: webhookPayload
        });

        if (webhookError) {
          console.error('Error triggering payment webhooks:', webhookError);
        }

        const productPurchasePayload = {
          event: 'product.purchased',
          data: {
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            customer_email: formData.email,
            customer_name: formData.fullName,
            price: totalAmountInKZ.toString(),
            currency: 'KZ',
            timestamp: new Date().toISOString()
          },
          user_id: product.user_id,
          order_id: orderId,
          product_id: product.id
        };

        const { error: productWebhookError } = await supabase.functions.invoke('trigger-webhooks', {
          body: productPurchasePayload
        });

        if (productWebhookError) {
          console.error('Error triggering product purchase webhooks:', productWebhookError);
        } else {
          console.log('✅ Webhooks triggered successfully for Stripe payment');
        }

      } catch (webhookError) {
        console.error('❌ Error triggering webhooks for Stripe payment:', webhookError);
      }

      const totalAmountInKZ = parseFloat(product.price) + orderBumpPrice;
      const params = new URLSearchParams({
        order_id: orderId,
        customer_name: formData.fullName.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        product_name: product.name,
        amount: totalAmountInKZ.toString(),
        currency: 'KZ',
        product_id: productId || '',
        seller_id: product.user_id,
        base_product_price: product.price,
        ...(orderBump && {
          order_bump_name: orderBump.bump_product_name,
          order_bump_price: orderBump.bump_product_price,
          order_bump_discount: orderBump.discount.toString(),
          order_bump_discounted_price: orderBumpPrice.toString()
        })
      });

      navigate(`/obrigado?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao processar sucesso do pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar compra. Entre em contato conosco.",
        variant: "destructive"
      });
    }
  };

  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive"
    });
  };

  const handlePurchase = async () => {
    console.log('🚀 HandlePurchase called with:', {
      selectedPayment,
      formData: {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone
      },
      userCountry: userCountry.code,
      availablePaymentMethods: availablePaymentMethods.map(m => m.id)
    });

    if (!formData.fullName || !formData.email || !formData.phone || !selectedPayment) {
      console.log('❌ Validation failed - missing required fields');
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (!product || !productId) {
      console.log('❌ Product not found');
      toast({
        title: "Erro",
        description: "Produto não encontrado",
        variant: "destructive"
      });
      return;
    }

    // Para métodos Stripe, o processamento é feito pelo componente StripeCardPayment
    if (['card', 'klarna', 'multibanco', 'apple_pay'].includes(selectedPayment)) {
      console.log('🔄 Stripe payment method selected, processing handled by StripeCardPayment component');
      return;
    }

    console.log('✅ Processing local payment method:', selectedPayment);
    console.log('🏢 Product details:', {
      id: product.id,
      name: product.name,
      price: product.price,
      user_id: product.user_id
    });
    
    setProcessing(true);

    try {
      console.log('Starting purchase process for product:', product);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const totalAmount = parseFloat(product.price) + orderBumpPrice;

      // Calcular comissões se houver afiliado
      let affiliate_commission = null;
      let seller_commission = null;
      
      if (hasAffiliate && affiliateCode) {
        console.log('🔍 Calculando comissões para afiliado:', affiliateCode);
        
        // Buscar informações do afiliado
        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliates')
          .select('commission_rate')
          .eq('affiliate_code', affiliateCode)
          .eq('product_id', product.id)
          .eq('status', 'ativo')
          .single();
          
        console.log('🔍 Dados do afiliado:', { affiliate, affiliateError });
          
        if (affiliate && !affiliateError) {
          const commission_rate = affiliate.commission_rate;
          const commission_decimal = parseFloat(commission_rate.replace('%', '')) / 100;
          affiliate_commission = Math.round(totalAmount * commission_decimal * 100) / 100; // Arredondar para 2 casas
          seller_commission = Math.round((totalAmount - affiliate_commission) * 100) / 100;
          
          console.log('💰 Comissões calculadas:', {
            totalAmount,
            commission_rate,
            commission_decimal,
            affiliate_commission,
            seller_commission
          });
        } else {
          console.log('⚠️ Afiliado não encontrado ou inativo, vendedor recebe tudo');
          seller_commission = totalAmount;
        }
      } else {
        console.log('ℹ️ Sem afiliado, vendedor recebe tudo');
        seller_commission = totalAmount;
      }

      const orderData = {
        product_id: product.id,
        order_id: orderId,
        customer_name: formData.fullName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        amount: totalAmount.toString(),
        currency: userCountry.currency,
        payment_method: selectedPayment,
        status: 'completed',
        user_id: null, // Always null for checkout page orders (guest orders)
        affiliate_code: hasAffiliate ? affiliateCode : null,
        affiliate_commission: affiliate_commission,
        seller_commission: seller_commission,
        order_bump_data: orderBump ? JSON.stringify({
          bump_product_name: orderBump.bump_product_name,
          bump_product_price: orderBump.bump_product_price,
          bump_product_image: orderBump.bump_product_image,
          discount: orderBump.discount,
          discounted_price: orderBumpPrice
        }) : null
      };

      console.log('📋 Inserting order with data:', {
        ...orderData,
        // Não mostrar dados sensíveis no log
        customer_phone: formData.phone ? '***' : null
      });
      console.log('🔍 Order data keys:', Object.keys(orderData));
      console.log('🔍 Order amount:', orderData.amount, 'Currency:', orderData.currency);
      console.log('🔍 Payment method:', orderData.payment_method);
      console.log('🔍 Status:', orderData.status);

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Error saving order:', orderError);
        console.error('❌ Error details:', JSON.stringify(orderError, null, 2));
        console.error('❌ Order data that failed:', orderData);
        toast({
          title: "Erro",
          description: `Erro ao processar compra: ${orderError.message}`,
          variant: "destructive"
        });
        setProcessing(false);
        return;
      } else {
        console.log('✅ Order saved successfully!');
        console.log('✅ Inserted order:', insertedOrder);
        console.log('✅ Order ID:', insertedOrder.order_id);
        console.log('✅ Order status:', insertedOrder.status);
        
        try {
          console.log('Updating product sales count...');
          const newSalesCount = (product.sales || 0) + 1;
          
          const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ 
              sales: newSalesCount 
            })
            .eq('id', productId)
            .select();

          if (updateError) {
            console.error('Error updating product sales:', updateError);
            console.error('Update error details:', JSON.stringify(updateError, null, 2));
          } else {
            console.log('Product sales count updated successfully:', updatedProduct);
            if (updatedProduct && updatedProduct.length > 0) {
              setProduct(prev => ({ ...prev, sales: newSalesCount }));
            }
          }

          try {
            console.log('🔔 Triggering webhooks for local payment method...');
            
            const webhookPayload = {
              event: 'payment.success',
              data: {
                order_id: orderId,
                amount: totalAmount.toString(),
                base_product_price: product.price,
                currency: userCountry.currency,
                customer_email: formData.email,
                customer_name: formData.fullName,
                product_id: product.id,
                product_name: product.name,
                payment_method: selectedPayment,
                timestamp: new Date().toISOString(),
                order_bump: orderBump ? {
                  bump_product_name: orderBump.bump_product_name,
                  bump_product_price: orderBump.bump_product_price,
                  discount: orderBump.discount,
                  discounted_price: orderBumpPrice
                } : null
              },
              user_id: product.user_id,
              order_id: orderId,
              product_id: product.id
            };

            const { error: webhookError } = await supabase.functions.invoke('trigger-webhooks', {
              body: webhookPayload
            });

            if (webhookError) {
              console.error('Error triggering payment webhooks:', webhookError);
            }

            const productPurchasePayload = {
              event: 'product.purchased',
              data: {
                order_id: orderId,
                product_id: product.id,
                product_name: product.name,
                customer_email: formData.email,
                customer_name: formData.fullName,
                price: totalAmount.toString(),
                currency: userCountry.currency,
                timestamp: new Date().toISOString()
              },
              user_id: product.user_id,
              order_id: orderId,
              product_id: product.id
            };

            const { error: productWebhookError } = await supabase.functions.invoke('trigger-webhooks', {
              body: productPurchasePayload
            });

            if (productWebhookError) {
              console.error('Error triggering product purchase webhooks:', productWebhookError);
            } else {
              console.log('✅ Webhooks triggered successfully for local payment');
            }

            // REMOVIDO: Push notification (será enviada apenas no email de confirmação)

          } catch (webhookError) {
            console.error('❌ Error triggering webhooks for local payment:', webhookError);
          }

        } catch (updateError) {
          console.error('Unexpected error updating sales:', updateError);
        }
      }

      try {
        console.log('Sending confirmation email...');
        const emailData = {
          customerName: formData.fullName.trim(),
          customerEmail: formData.email.trim().toLowerCase(),
          productName: product.name,
          orderId: orderId,
          amount: totalAmount.toString(),
          currency: userCountry.currency,
          productId: productId,
          shareLink: product.share_link,
          memberAreaId: product.member_areas?.id,
          sellerId: product.user_id,
          orderBump: orderBump ? {
            bump_product_name: orderBump.bump_product_name,
            bump_product_price: orderBump.bump_product_price,
            bump_product_image: orderBump.bump_product_image,
            discount: orderBump.discount,
            discounted_price: orderBumpPrice
          } : null,
          baseProductPrice: product.price
        };

        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-purchase-confirmation', {
          body: emailData
        });

        if (emailError) {
          console.error('Error sending confirmation email:', emailError);
        } else {
          console.log('Confirmation email sent successfully:', emailResponse);
        }
      } catch (emailError) {
        console.error('Unexpected error sending confirmation email:', emailError);
      }

      const params = new URLSearchParams({
        order_id: orderId,
        customer_name: formData.fullName.trim(),
        customer_email: formData.email.trim().toLowerCase(),
        product_name: product.name,
        amount: totalAmount.toString(),
        currency: userCountry.currency,
        product_id: productId || '',
        seller_id: product.user_id,
        base_product_price: product.price,
        ...(orderBump && {
          order_bump_name: orderBump.bump_product_name,
          order_bump_price: orderBump.bump_product_price,
          order_bump_discount: orderBump.discount.toString(),
          order_bump_discounted_price: orderBumpPrice.toString()
        })
      });

      navigate(`/obrigado?${params.toString()}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner 
            text="Carregando informações do produto..."
            size="lg"
          />
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Erro</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              Product ID: {productId || 'Não fornecido'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!product) {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <p className="text-muted-foreground">O produto que você está procurando não existe ou foi removido.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Product ID: {productId}
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (product.status === 'Inativo') {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Oferta Expirada</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Infelizmente, esta oferta não está mais disponível. O produto foi temporariamente desativado pelo vendedor.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{product.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">Status: Inativo</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Entre em contato com o vendedor para mais informações sobre a disponibilidade deste produto.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (product.status === 'Banido') {
    return (
      <ThemeProvider forceLightMode={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6 sm:p-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">Produto Indisponível</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Este produto não está mais disponível para compra. Foi removido temporariamente por questões administrativas.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{product.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600">Status: Indisponível</p>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              O vendedor foi notificado e está resolvendo a situação. Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const originalPrice = parseInt(product.price);
  const convertedPrice = getConvertedPrice(originalPrice);
  const totalPrice = originalPrice + orderBumpPrice;
  const convertedTotalPrice = getConvertedPrice(totalPrice);

  console.log(`Product: ${product.name}`);
  console.log(`Original price: ${originalPrice} KZ`);
  console.log(`Converted price: ${convertedPrice} ${userCountry.currency}`);
  console.log(`Display price: ${getDisplayPrice(originalPrice)}`);
  console.log(`Total converted price: ${convertedTotalPrice} ${userCountry.currency}`);

  return (
    <ThemeProvider forceLightMode={true}>
      <FacebookPixelTracker productId={productId || ''} />
      {product && (
        <SEO 
          title={`${product.name} - Checkout`}
          description={product.description || `Finalize sua compra do produto ${product.name} com segurança na Kambafy.`}
          ogImage={product.cover || 'https://kambafy.com/kambafy-social-preview.png'}
          keywords={`${product.name}, comprar ${product.name}, checkout, pagamento seguro, ${product.tags?.join(', ') || ''}`}
          structuredData={{
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description || `Produto digital: ${product.name}`,
            "image": product.cover || 'https://kambafy.com/kambafy-social-preview.png',
            "brand": {
              "@type": "Brand",
              "name": product.fantasy_name || "Kambafy"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://kambafy.com/checkout/${product.id}`,
              "priceCurrency": "AOA", 
              "price": product.price,
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": product.fantasy_name || "Kambafy"
              }
            }
          }}
        />
      )}
      <div className="min-h-screen bg-gray-50">
        {checkoutSettings?.countdown?.enabled && (
          <CountdownTimer
            minutes={checkoutSettings.countdown.minutes}
            title={checkoutSettings.countdown.title}
            backgroundColor={checkoutSettings.countdown.backgroundColor}
            textColor={checkoutSettings.countdown.textColor}
          />
        )}

        {checkoutSettings?.banner?.enabled && checkoutSettings.banner.bannerImage && (
          <CustomBanner
            bannerImage={checkoutSettings.banner.bannerImage}
          />
        )}

        <div className="bg-green-600 text-white py-3">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center justify-center">
                <Shield className="w-5 h-5" />
                <Check className="w-2.5 h-2.5 absolute inset-0 m-auto text-white" />
              </div>
              <span className="font-bold text-lg">COMPRA 100% SEGURA</span>
            </div>
            <CountrySelector
              selectedCountry={userCountry}
              onCountryChange={handleCountryChange}
              supportedCountries={supportedCountries}
              loading={geoLoading}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {checkoutSettings?.socialProof?.enabled && (
            <SocialProof
              totalSales={checkoutSettings.socialProof.totalSales}
              position={checkoutSettings.socialProof.position}
              enabled={checkoutSettings.socialProof.enabled}
            />
          )}

          <Card className="mb-8 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg overflow-hidden shadow-sm">
                  <img 
                    src={getProductImage(product.cover)} 
                    alt={product.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{product.name.toUpperCase()}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">Entrega instantânea</span>
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {getDisplayPrice(originalPrice)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700 font-medium">
                  Nome completo
                </Label>
                <Input
                  id="fullName"
                  placeholder="Digite seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="h-12 border-gray-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu e-mail para receber a compra"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-12 border-gray-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  Telefone ou Whatsapp
                </Label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => handleInputChange("phone", value)}
                  selectedCountry={formData.phoneCountry}
                  onCountryChange={handleCountryChange}
                  placeholder="Digite seu telefone"
                  className="h-12"
                />
              </div>

              <OrderBump 
                productId={productId || ''}
                position="before_payment_method"
                onToggle={handleOrderBumpToggle}
                userCountry={userCountry}
                formatPrice={formatPrice}
              />

              {availablePaymentMethods.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-green-600 font-medium">
                      Pagar com: {selectedPayment && <span className="text-gray-700">{getSelectedPaymentName()}</span>}
                    </span>
                    <p className="text-gray-700 font-medium">Selecione a forma de pagamento desejada</p>
                  </div>
                  
                  <div className={`grid ${getPaymentGridClasses()} gap-3`}>
                    {availablePaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`cursor-pointer transition-all border rounded-xl p-3 flex flex-col items-center relative ${
                          selectedPayment === method.id
                            ? 'border-green-500 border-2 bg-green-50'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                        onClick={() => setSelectedPayment(method.id)}
                      >
                        {selectedPayment === method.id && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 flex items-center justify-center">
                          <img
                            src={method.image}
                            alt={method.name}
                            className={`w-10 h-10 object-contain transition-all ${
                              selectedPayment === method.id ? '' : 'opacity-60 saturate-50'
                            }`}
                          />
                        </div>
                        <p className="text-xs text-gray-700 text-center leading-tight">
                          {method.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8 bg-gray-100 rounded-lg">
                    <p className="text-gray-600 font-medium">
                      Métodos de pagamento não disponíveis para {userCountry.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Em breve teremos opções de pagamento para sua região.
                    </p>
                  </div>
                </div>
              )}

              <OrderBump 
                productId={productId || ''}
                position="after_payment_method"
                onToggle={handleOrderBumpToggle}
                userCountry={userCountry}
                formatPrice={formatPrice}
              />

              {(['card', 'klarna', 'multibanco', 'apple_pay'].includes(selectedPayment)) && (
                <div className="mt-6">
                  <StripeCardPayment
                    amount={totalPrice}
                    currency={userCountry.currency}
                    productId={productId || ''}
                    customerData={{
                      name: formData.fullName,
                      email: formData.email,
                      phone: formData.phone
                    }}
                    paymentMethod={selectedPayment}
                    onSuccess={handleCardPaymentSuccess}
                    onError={handleCardPaymentError}
                    processing={processing}
                    setProcessing={setProcessing}
                    displayPrice={getDisplayPrice(totalPrice)}
                    convertedAmount={convertedTotalPrice}
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do pedido</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Produto principal</span>
                      <span className="font-medium text-gray-900">
                        {getDisplayPrice(originalPrice)}
                      </span>
                    </div>
                    
                    {orderBump && (
                      <div className="flex justify-between items-center text-green-600">
                        <div className="flex-1">
                          <span className="text-sm">{orderBump.bump_product_name}</span>
                          {orderBump.discount > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded ml-2">
                              -{orderBump.discount}%
                            </span>
                          )}
                        </div>
                        <span className="font-medium">
                          +{formatPrice(orderBumpPrice)}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Total</span>
                        <span className="text-2xl font-bold text-green-600">
                          {getDisplayPrice(totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!['card', 'klarna', 'multibanco', 'apple_pay'].includes(selectedPayment) && availablePaymentMethods.length > 0 && (
                <Button
                  onClick={handlePurchase}
                  disabled={!formData.fullName || !formData.email || !formData.phone || !selectedPayment || processing}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold relative"
                >
                  {processing ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 rounded bg-green-700 flex items-center justify-center mr-2">
                        <span className="text-xs font-bold text-white animate-bounce">K</span>
                      </div>
                      PROCESSANDO...
                    </div>
                  ) : (
                    `COMPRAR AGORA - ${getDisplayPrice(totalPrice)}`
                  )}
                </Button>
              )}
            </div>
          </div>

          {checkoutSettings?.reviews?.enabled && (
            <div className="mt-8 mb-8">
              <FakeReviews
                reviews={checkoutSettings.reviews.reviews}
                title={checkoutSettings.reviews.title}
              />
            </div>
          )}

          <div className="mt-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-lg mx-auto flex items-center justify-center bg-green-600">
              <span className="text-2xl font-bold text-white">K</span>
            </div>
            <div>
              <h4 className="font-semibold text-green-600">Kambafy</h4>
              <p className="text-sm text-gray-600">Todos os direitos reservados.</p>
            </div>
            <p className="text-xs text-gray-500 max-w-2xl mx-auto">
              Ao clicar em Comprar agora, eu declaro que li e concordo (1) com a Kambafy está processando este pedido em nome de{' '}
              <span className="text-green-600">
                {product?.fantasy_name || 'produtor'}
              </span> não possui responsabilidade pelo conteúdo e/ou faz controle prévio deste (li) com os{' '}
              <span className="underline cursor-pointer">Termos de uso</span> e{' '}
              <span className="underline cursor-pointer">Política de privacidade</span>.
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Checkout;
