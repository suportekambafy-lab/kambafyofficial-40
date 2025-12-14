
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Facebook, Webhook, Palette, Settings, Mail, RotateCcw, MessageSquare, RefreshCw } from "lucide-react";
import utmifyLogo from '@/assets/utmify-logo.png';
import googleAnalyticsLogo from '@/assets/google-analytics-logo.png';
import googleAdsLogo from '@/assets/google-ads-logo.png';
import metaLogo from '@/assets/meta-logo.png';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { IntegrationCard } from "@/components/IntegrationCard";
import { IntegrationStats } from "@/components/IntegrationStats";
import { ProductSelector } from "@/components/ProductSelector";
import { IntegrationTypeSelector, IntegrationType } from "@/components/IntegrationTypeSelector";
import { IntegrationConfigurator } from "@/components/IntegrationConfigurator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Integration {
  id: string;
  type: string;
  name: string;
  active: boolean;
  createdAt: string;
  icon: React.ReactNode;
  productName?: string;
  productId?: string;
}

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

type Step = 'product' | 'integration' | 'configure';

export function AppsTabLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    fetchIntegrations();
    fetchProducts();
    
    // Event listeners para atualizar integrações
    const handleIntegrationCreated = () => {
      console.log('Integration created event received, refreshing...');
      setTimeout(() => {
        fetchIntegrations();
      }, 1000); // Delay para garantir que os dados foram salvos
    };

    const handleIntegrationUpdated = () => {
      console.log('Integration updated event received, refreshing...');
      setTimeout(() => {
        fetchIntegrations();
      }, 500);
    };

    window.addEventListener('integrationCreated', handleIntegrationCreated);
    window.addEventListener('integrationUpdated', handleIntegrationUpdated);

    return () => {
      window.removeEventListener('integrationCreated', handleIntegrationCreated);
      window.removeEventListener('integrationUpdated', handleIntegrationUpdated);
    };
  }, []);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Products fetched:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive"
      });
    }
  };

  const fetchIntegrations = async () => {
    if (!user) return;

    setLoading(true);
    const allIntegrations: Integration[] = [];

    try {
      console.log('Fetching integrations for user:', user.id);

      // Fetch Facebook Pixel settings with product name
      const { data: pixelData, error: pixelError } = await supabase
        .from('facebook_pixel_settings')
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (pixelError) {
        console.error('Error fetching pixel data:', pixelError);
      } else {
        console.log('Pixel data:', pixelData);
      }

      if (pixelData && pixelData.length > 0) {
        pixelData.forEach(pixel => {
          allIntegrations.push({
            id: pixel.id,
            type: 'facebook-pixel',
            name: 'Facebook Pixel',
            active: pixel.enabled || false,
            createdAt: new Date(pixel.created_at || '').toLocaleDateString(),
            icon: <img src={metaLogo} alt="Meta" className="h-5 w-auto object-contain" />,
            productName: pixel.products?.name || 'Produto não encontrado',
            productId: pixel.product_id
          });
        });
      }

      // Fetch TikTok Pixel settings with product name
      const { data: tiktokPixelData, error: tiktokPixelError } = await supabase
        .from('tiktok_pixel_settings' as any)
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (tiktokPixelError) {
        console.error('Error fetching TikTok pixel data:', tiktokPixelError);
      } else {
        console.log('TikTok Pixel data:', tiktokPixelData);
      }

      if (tiktokPixelData && tiktokPixelData.length > 0) {
        (tiktokPixelData as any[]).forEach(pixel => {
          allIntegrations.push({
            id: pixel.id,
            type: 'tiktok-pixel',
            name: 'TikTok Pixel',
            active: pixel.enabled || false,
            createdAt: new Date(pixel.created_at || '').toLocaleDateString(),
            icon: (
              <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            ),
            productName: pixel.products?.name || 'Produto não encontrado',
            productId: pixel.product_id
          });
        });
      }

      // Fetch Google Analytics settings with product name
      const { data: gaData, error: gaError } = await supabase
        .from('google_analytics_settings' as any)
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (gaError) {
        console.error('Error fetching Google Analytics data:', gaError);
      }

      if (gaData && gaData.length > 0) {
        (gaData as any[]).forEach(ga => {
          allIntegrations.push({
            id: ga.id,
            type: 'google-analytics',
            name: 'Google Analytics',
            active: ga.enabled || false,
            createdAt: new Date(ga.created_at || '').toLocaleDateString(),
            icon: <img src={googleAnalyticsLogo} alt="Google Analytics" className="h-5 w-auto object-contain" />,
            productName: ga.products?.name || 'Produto não encontrado',
            productId: ga.product_id
          });
        });
      }

      // Fetch Google Ads settings with product name
      const { data: gadsData, error: gadsError } = await supabase
        .from('google_ads_settings' as any)
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (gadsError) {
        console.error('Error fetching Google Ads data:', gadsError);
      }

      if (gadsData && gadsData.length > 0) {
        (gadsData as any[]).forEach(gads => {
          allIntegrations.push({
            id: gads.id,
            type: 'google-ads',
            name: 'Google Ads',
            active: gads.enabled || false,
            createdAt: new Date(gads.created_at || '').toLocaleDateString(),
            icon: <img src={googleAdsLogo} alt="Google Ads" className="h-5 w-auto object-contain" />,
            productName: gads.products?.name || 'Produto não encontrado',
            productId: gads.product_id
          });
        });
      }

      // Fetch Webhook settings - modificada para funcionar sem product_id obrigatório
      const { data: webhookData, error: webhookError } = await supabase
        .from('webhook_settings')
        .select(`
          *,
          products(name)
        `)
        .eq('user_id', user.id);

      if (webhookError) {
        console.error('Error fetching webhook data:', webhookError);
      } else {
        console.log('Webhook data:', webhookData);
      }

      if (webhookData && webhookData.length > 0) {
        webhookData.forEach(webhook => {
          allIntegrations.push({
            id: webhook.id,
            type: 'webhook',
            name: 'Webhook',
            active: webhook.active || false,
            createdAt: new Date(webhook.created_at || '').toLocaleDateString(),
            icon: <Webhook className="w-5 h-5 text-orange-600" />,
            productName: webhook.products?.name || 'Webhook Geral',
            productId: webhook.product_id
          });
        });
      }

      // Fetch Checkout Customization settings with product name
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('checkout_customizations')
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (checkoutError) {
        console.error('Error fetching checkout data:', checkoutError);
      } else {
        console.log('Checkout data:', checkoutData);
      }

      if (checkoutData && checkoutData.length > 0) {
        checkoutData.forEach(checkout => {
          const settings = checkout.settings as any;
          
          // Checkout Customization Integration
          const isCheckoutActive = settings?.banner?.enabled || settings?.countdown?.enabled || 
                                   settings?.reviews?.enabled || settings?.socialProof?.enabled ||
                                   settings?.spotsCounter?.enabled;
          
          if (isCheckoutActive) {
            allIntegrations.push({
              id: checkout.id,
              type: 'custom-checkout',
              name: 'Checkout Personalizado',
              active: isCheckoutActive || false,
              createdAt: new Date(checkout.created_at || '').toLocaleDateString(),
              icon: <Palette className="w-5 h-5 text-green-600" />,
              productName: checkout.products?.name || 'Produto não encontrado',
              productId: checkout.product_id
            });
          }

          // Upsell Integration - check if upsell settings exist
          const isUpsellActive = settings?.upsell?.enabled && settings?.upsell?.link_pagina_upsell;
          
          if (settings?.upsell) {
            allIntegrations.push({
              id: `${checkout.id}-upsell`,
              type: 'upsell',
              name: 'Upsell Pós-Compra',
              active: isUpsellActive || false,
              createdAt: new Date(checkout.created_at || '').toLocaleDateString(),
              icon: <Mail className="w-5 h-5 text-indigo-600" />,
              productName: checkout.products?.name || 'Produto não encontrado',
              productId: checkout.product_id
            });
          }
        });
      }

      // Fetch Order Bump settings with product name
      const { data: orderBumpData, error: orderBumpError } = await supabase
        .from('order_bump_settings')
        .select(`
          *,
          main_product:products!order_bump_settings_product_id_fkey(name)
        `)
        .eq('user_id', user.id);

      if (orderBumpError) {
        console.error('Error fetching order bump data:', orderBumpError);
      } else {
        console.log('Order bump data:', orderBumpData);
      }

      if (orderBumpData && orderBumpData.length > 0) {
        orderBumpData.forEach(orderBump => {
          allIntegrations.push({
            id: orderBump.id,
            type: 'order-bump',
            name: 'Order Bump',
            active: orderBump.enabled || false,
            createdAt: new Date(orderBump.created_at || '').toLocaleDateString(),
            icon: <Settings className="w-5 h-5 text-purple-600" />,
            productName: orderBump.main_product?.name || 'Produto não encontrado',
            productId: orderBump.product_id
          });
        });
      }

      // Fetch UTMify settings with product name
      const { data: utmifyData, error: utmifyError } = await supabase
        .from('utmify_settings' as any)
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id);

      if (utmifyError) {
        console.error('Error fetching UTMify data:', utmifyError);
      } else {
        console.log('UTMify data:', utmifyData);
      }

      if (utmifyData && utmifyData.length > 0) {
        (utmifyData as any[]).forEach(utmify => {
          allIntegrations.push({
            id: utmify.id,
            type: 'utmify',
            name: 'UTMify',
            active: utmify.enabled || false,
            createdAt: new Date(utmify.created_at || '').toLocaleDateString(),
            icon: <img src={utmifyLogo} alt="UTMify" className="h-5 w-auto object-contain" />,
            productName: utmify.products?.name || 'Produto não encontrado',
            productId: utmify.product_id
          });
        });
      }

      // Fetch Cart Recovery settings
      const { data: cartRecoveryData, error: cartRecoveryError } = await supabase
        .from('sales_recovery_settings')
        .select(`
          *,
          products(name)
        `)
        .eq('user_id', user.id);

      if (cartRecoveryError) {
        console.error('Error fetching cart recovery settings:', cartRecoveryError);
      } else {
        console.log('Cart recovery settings:', cartRecoveryData);
      }

      if (cartRecoveryData && cartRecoveryData.length > 0) {
        cartRecoveryData.forEach((recovery: any) => {
          allIntegrations.push({
            id: recovery.id,
            type: 'cart-recovery',
            name: 'Recuperação de Carrinho',
            active: recovery.enabled || false,
            createdAt: new Date(recovery.created_at || '').toLocaleDateString(),
            icon: <RefreshCw className="h-5 w-5 text-emerald-600" />,
            productName: recovery.products?.name || 'Produto não encontrado',
            productId: recovery.product_id
          });
        });
      }

      // Fetch Live Chat AI products
      const { data: chatProducts, error: chatError } = await supabase
        .from('products')
        .select('id, name, chat_enabled, chat_config, created_at')
        .eq('user_id', user.id)
        .eq('chat_enabled', true);

      if (chatError) {
        console.error('Error fetching chat products:', chatError);
      } else {
        console.log('Chat products:', chatProducts);
      }

      if (chatProducts && chatProducts.length > 0) {
        chatProducts.forEach(product => {
          allIntegrations.push({
            id: `live-chat-${product.id}`,
            type: 'live-chat-ai',
            name: 'Chat ao Vivo IA',
            active: true,
            createdAt: new Date(product.created_at || '').toLocaleDateString(),
            icon: <MessageSquare className="h-5 w-5 text-pink-600" />,
            productName: product.name || 'Produto não encontrado',
            productId: product.id
          });
        });
      }

      // Fetch Discount Coupons (agrupado por produto)
      const { data: couponsData, error: couponsError } = await supabase
        .from('discount_coupons')
        .select(`
          *,
          products(name)
        `)
        .eq('user_id', user.id);

      if (couponsError) {
        console.error('Error fetching coupons data:', couponsError);
      } else {
        console.log('Coupons data:', couponsData);
      }

      if (couponsData && couponsData.length > 0) {
        // Agrupar cupons por produto para mostrar uma integração por produto
        const couponsByProduct = new Map<string, any[]>();
        couponsData.forEach(coupon => {
          const productId = coupon.product_id || 'global';
          if (!couponsByProduct.has(productId)) {
            couponsByProduct.set(productId, []);
          }
          couponsByProduct.get(productId)!.push(coupon);
        });

        couponsByProduct.forEach((coupons, productId) => {
          const hasActiveCoupons = coupons.some(c => c.is_active);
          const firstCoupon = coupons[0];
          allIntegrations.push({
            id: productId === 'global' ? 'discount-coupons-global' : `discount-coupons-${productId}`,
            type: 'discount-coupons',
            name: 'Cupons de Desconto',
            active: hasActiveCoupons,
            createdAt: new Date(firstCoupon.created_at || '').toLocaleDateString(),
            icon: <span className="text-lg">🎟️</span>,
            productName: firstCoupon.products?.name || 'Todos os Produtos',
            productId: productId === 'global' ? undefined : productId
          });
        });
      }

      console.log('All integrations loaded:', allIntegrations);
      setIntegrations(allIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar integrações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (integration: Integration, active: boolean) => {
    try {
      console.log('Toggling integration:', integration.type, 'to', active);
      let updateResult;
      
      if (integration.type === 'facebook-pixel') {
        updateResult = await supabase
          .from('facebook_pixel_settings')
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'tiktok-pixel') {
        updateResult = await supabase
          .from('tiktok_pixel_settings' as any)
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'google-analytics') {
        updateResult = await supabase
          .from('google_analytics_settings' as any)
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'google-ads') {
        updateResult = await supabase
          .from('google_ads_settings' as any)
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'webhook') {
        updateResult = await supabase
          .from('webhook_settings')
          .update({ active: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'custom-checkout') {
        toast({
          title: "Aviso",
          description: "Para personalização do checkout, configure cada opção individualmente",
        });
        return;
      } else if (integration.type === 'order-bump') {
        updateResult = await supabase
          .from('order_bump_settings')
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'upsell') {
        // For upsell, we need to update the checkout_customizations settings
        const realId = integration.id.replace('-upsell', '');
        const { data: currentData } = await supabase
          .from('checkout_customizations')
          .select('settings')
          .eq('id', realId)
          .single();
        
        if (currentData) {
          const currentSettings = currentData.settings as any;
          const updatedSettings = {
            ...currentSettings,
            upsell: {
              ...(currentSettings.upsell || {}),
              enabled: active
            }
          };
          
          updateResult = await supabase
            .from('checkout_customizations')
            .update({ settings: updatedSettings })
            .eq('id', realId)
            .select();
        }
      } else if (integration.type === 'utmify') {
        updateResult = await supabase
          .from('utmify_settings' as any)
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'cart-recovery') {
        updateResult = await supabase
          .from('sales_recovery_settings')
          .update({ enabled: active })
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'live-chat-ai') {
        // Extract the real product ID from the integration id (format: live-chat-{productId})
        const productId = integration.productId || integration.id.replace('live-chat-', '');
        updateResult = await supabase
          .from('products')
          .update({ chat_enabled: active })
          .eq('id', productId)
          .select();
      } else if (integration.type === 'discount-coupons') {
        // Toggle all coupons for this product
        const productId = integration.productId;
        if (productId) {
          updateResult = await supabase
            .from('discount_coupons')
            .update({ is_active: active })
            .eq('product_id', productId)
            .eq('user_id', user?.id)
            .select();
        } else {
          // Global coupons (no product_id)
          updateResult = await supabase
            .from('discount_coupons')
            .update({ is_active: active })
            .is('product_id', null)
            .eq('user_id', user?.id)
            .select();
        }
      }

      if (updateResult?.error) {
        console.error('Update error:', updateResult.error);
        throw updateResult.error;
      }

      console.log('Update successful:', updateResult?.data);

      // Update local state
      setIntegrations(prev => prev.map(int => 
        int.id === integration.id ? { ...int, active } : int
      ));

      toast({
        title: active ? "Integração ativada" : "Integração desativada",
        description: `${integration.name} foi ${active ? 'ativada' : 'desativada'} com sucesso`,
      });
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast({
        title: "Erro",
        description: `Falha ao ${active ? 'ativar' : 'desativar'} integração`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteIntegration = async (integration: Integration) => {
    if (!confirm(`Tem certeza que deseja eliminar ${integration.name}?`)) {
      return;
    }

    try {
      console.log('Deleting integration:', integration.type, integration.id);
      let deleteResult;
      
      if (integration.type === 'facebook-pixel') {
        deleteResult = await supabase
          .from('facebook_pixel_settings')
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'tiktok-pixel') {
        deleteResult = await supabase
          .from('tiktok_pixel_settings' as any)
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'google-analytics') {
        deleteResult = await supabase
          .from('google_analytics_settings' as any)
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'google-ads') {
        deleteResult = await supabase
          .from('google_ads_settings' as any)
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'webhook') {
        deleteResult = await supabase
          .from('webhook_settings')
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'custom-checkout') {
        deleteResult = await supabase
          .from('checkout_customizations')
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'order-bump') {
        deleteResult = await supabase
          .from('order_bump_settings')
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'upsell') {
        // For upsell, we need to remove upsell settings from checkout_customizations
        const realId = integration.id.replace('-upsell', '');
        const { data: currentData } = await supabase
          .from('checkout_customizations')
          .select('settings')
          .eq('id', realId)
          .single();
        
        if (currentData) {
          const currentSettings = currentData.settings as any;
          const { upsell, ...otherSettings } = currentSettings;
          
          deleteResult = await supabase
            .from('checkout_customizations')
            .update({ settings: otherSettings })
            .eq('id', realId)
            .select();
        }
      } else if (integration.type === 'utmify') {
        deleteResult = await supabase
          .from('utmify_settings' as any)
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'cart-recovery') {
        deleteResult = await supabase
          .from('sales_recovery_settings')
          .delete()
          .eq('id', integration.id)
          .select();
      } else if (integration.type === 'live-chat-ai') {
        // For live chat, we disable and clear the config
        const productId = integration.productId || integration.id.replace('live-chat-', '');
        deleteResult = await supabase
          .from('products')
          .update({ chat_enabled: false, chat_config: null })
          .eq('id', productId)
          .select();
      }

      if (deleteResult?.error) {
        console.error('Delete error:', deleteResult.error);
        throw deleteResult.error;
      }

      console.log('Delete successful:', deleteResult?.data);

      // Update local state
      setIntegrations(prev => prev.filter(int => int.id !== integration.id));

      toast({
        title: "Integração eliminada",
        description: `${integration.name} foi eliminada com sucesso`,
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Erro",
        description: "Falha ao eliminar integração",
        variant: "destructive"
      });
    }
  };

  const handleConfigureIntegration = (integration: Integration) => {
    console.log('Configuring integration:', integration);
    
    // Find the correct product for this integration
    let targetProduct: Product | null = null;
    
    if (integration.productId) {
      targetProduct = products.find(p => p.id === integration.productId) || null;
    }
    
    // If no specific product found, use first available product
    if (!targetProduct) {
      targetProduct = products[0] || null;
    }
    
    if (!targetProduct) {
      toast({
        title: "Erro",
        description: "Você precisa ter pelo menos um produto para configurar integrações",
        variant: "destructive"
      });
      return;
    }

    setSelectedProduct(targetProduct);
    setEditingIntegration(integration);
    
    let integrationType: IntegrationType | null = null;
    
    if (integration.type === 'facebook-pixel') {
      integrationType = {
        id: 'facebook-pixel',
        name: 'Facebook Pixel',
        description: 'Rastreie conversões e otimize campanhas do Facebook',
        icon: ({ className }: { className?: string }) => <Facebook className={className || "w-6 h-6"} />,
        color: 'text-blue-600'
      };
    } else if (integration.type === 'webhook') {
      integrationType = {
        id: 'webhook',
        name: 'Webhook',
        description: 'Receba notificações em tempo real sobre eventos',
        icon: ({ className }: { className?: string }) => <Webhook className={className || "w-6 h-6"} />,
        color: 'text-orange-600'
      };
    } else if (integration.type === 'custom-checkout') {
      integrationType = {
        id: 'custom-checkout',
        name: 'Checkout Personalizado',
        description: 'Personalize seu checkout com banners, countdown, avaliações e prova social',
        icon: ({ className }: { className?: string }) => <Palette className={className || "w-6 h-6"} />,
        color: 'text-green-600'
      };
    } else if (integration.type === 'order-bump') {
      integrationType = {
        id: 'order-bump',
        name: 'Order Bump',
        description: 'Adicione produtos extras ao checkout para aumentar o valor das vendas',
        icon: ({ className }: { className?: string }) => <Settings className={className || "w-6 h-6"} />,
        color: 'text-purple-600'
      };
    } else if (integration.type === 'upsell') {
      integrationType = {
        id: 'upsell',
        name: 'Upsell Pós-Compra',
        description: 'Configure ofertas especiais que aparecem após a compra principal',
        icon: ({ className }: { className?: string }) => <Mail className={className || "w-6 h-6"} />,
        color: 'text-indigo-600'
      };
    } else if (integration.type === 'tiktok-pixel') {
      integrationType = {
        id: 'tiktok-pixel',
        name: 'TikTok Pixel',
        description: 'Rastreie conversões e otimize campanhas do TikTok',
        icon: ({ className }: { className?: string }) => (
          <svg className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        ),
        color: 'text-pink-600'
      };
    } else if (integration.type === 'google-analytics') {
      integrationType = {
        id: 'google-analytics',
        name: 'Google Analytics',
        description: 'Analise o comportamento dos visitantes e conversões',
        icon: ({ className }: { className?: string }) => (
          <svg className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.84 2.998V21c0 1.1-.9 2-2 2h-4V7.998l6-5zM12.84 22.998h-4V12l4-3.5v14.498zM6.84 22.998h-4c-1.1 0-2-.9-2-2V16l6-5.25v12.248z"/>
          </svg>
        ),
        color: 'text-yellow-600'
      };
    } else if (integration.type === 'google-ads') {
      integrationType = {
        id: 'google-ads',
        name: 'Google Ads',
        description: 'Rastreie conversões de campanhas do Google Ads',
        icon: ({ className }: { className?: string }) => (
          <svg className={className || "w-6 h-6"} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.002 7.5v9l6-4.5-6-4.5zm7.998 0v9l6-4.5-6-4.5zm7.998 0v9l2.002-1.5V9l-2.002-1.5z"/>
          </svg>
        ),
        color: 'text-green-600'
      };
    } else if (integration.type === 'utmify') {
      integrationType = {
        id: 'utmify',
        name: 'UTMify',
        description: 'Envie conversões automaticamente para rastreamento UTM avançado',
        icon: ({ className }: { className?: string }) => (
          <img src={utmifyLogo} alt="UTMify" className={className || "h-6 w-auto"} />
        ),
        color: 'text-blue-500'
      };
    } else if (integration.type === 'discount-coupons') {
      integrationType = {
        id: 'discount-coupons',
        name: 'Cupons de Desconto',
        description: 'Crie e gerencie cupons de desconto para seus produtos',
        icon: ({ className }: { className?: string }) => (
          <span className={className || "text-lg"}>🎟️</span>
        ),
        color: 'text-amber-600'
      };
    } else if (integration.type === 'cart-recovery') {
      integrationType = {
        id: 'cart-recovery',
        name: 'Recuperação de Carrinho',
        description: 'Recupere vendas abandonadas automaticamente',
        icon: ({ className }: { className?: string }) => <RefreshCw className={className || "w-6 h-6"} />,
        color: 'text-emerald-600'
      };
    } else if (integration.type === 'live-chat-ai') {
      integrationType = {
        id: 'live-chat-ai',
        name: 'Chat ao Vivo IA',
        description: 'Configure o atendente virtual com IA para seus produtos',
        icon: ({ className }: { className?: string }) => <MessageSquare className={className || "w-6 h-6"} />,
        color: 'text-pink-600'
      };
    }
    
    if (integrationType) {
      setSelectedIntegrationType(integrationType);
      setCurrentStep('configure');
      setIsCreateOpen(true);
    }
  };

  const handleProductSelect = (product: Product) => {
    console.log('Product selected:', product);
    setSelectedProduct(product);
    setCurrentStep('integration');
  };

  const handleIntegrationSelect = (type: IntegrationType) => {
    console.log('Integration type selected:', type);
    setSelectedIntegrationType(type);
    setCurrentStep('configure');
  };

  const handleConfigurationComplete = () => {
    console.log('Configuration completed, closing sheet and refreshing');
    setIsCreateOpen(false);
    setCurrentStep('product');
    setSelectedProduct(null);
    setSelectedIntegrationType(null);
    setEditingIntegration(null);
    
    // Refresh integrations immediately
    fetchIntegrations();
    
    const message = editingIntegration ? "Integração atualizada com sucesso" : "Integração criada com sucesso";
    toast({
      title: editingIntegration ? "Integração atualizada" : "Integração criada",
      description: message,
    });
  };

  const handleResetCreate = () => {
    console.log('Resetting create flow');
    setCurrentStep('product');
    setSelectedProduct(null);
    setSelectedIntegrationType(null);
    setEditingIntegration(null);
  };

  const handlePanelIntegration = (integration: any) => {
    // Panel integration navigation - sales recovery removed
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando integrações...</p>
        </div>
      </div>
    );
  }

  const totalIntegrations = integrations.length;
  const activeIntegrations = integrations.filter(int => int.active).length;
  const inactiveIntegrations = totalIntegrations - activeIntegrations;

  return (
    <div className="p-3 xs:p-4 md:p-6 space-y-4 xs:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-4">
        <div className="w-full xs:w-auto">
          <h1 className="text-xl xs:text-2xl md:text-3xl font-bold break-words text-foreground">Integrações</h1>
          <p className="text-muted-foreground mt-2 text-sm xs:text-base">
            Gerencie suas integrações e automações
          </p>
        </div>
        <Button 
          onClick={() => navigate('/vendedor/apps?new=true')}
          className="flex items-center gap-2 w-full xs:w-auto justify-center whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden xs:inline">Nova Integração</span>
          <span className="xs:hidden">Nova</span>
        </Button>
      </div>

      {/* Sheet para edição de integrações existentes */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto p-0">
          <div className="p-4 xs:p-6">
            <SheetHeader className="space-y-2">
              <SheetTitle className="text-lg xs:text-xl">Configurar Integração</SheetTitle>
              <SheetDescription className="text-sm xs:text-base">
                Edite as configurações da sua integração
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-4 xs:mt-6">
              {/* Content */}
              <div className="space-y-4">
                {currentStep === 'configure' && selectedProduct && selectedIntegrationType && (
                  <IntegrationConfigurator
                    product={selectedProduct}
                    integrationType={selectedIntegrationType}
                    onBack={() => {
                      setIsCreateOpen(false);
                      handleResetCreate();
                    }}
                    onComplete={handleConfigurationComplete}
                  />
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Stats */}
      <IntegrationStats 
        total={totalIntegrations}
        active={activeIntegrations}
        inactive={inactiveIntegrations}
      />

      {/* Integrations List */}
      <Card>
        <CardHeader className="pb-3 xs:pb-4">
          <CardTitle className="text-lg xs:text-xl">Integrações Ativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 xs:space-y-4 p-3 xs:p-6 pt-0">
          {integrations.length === 0 ? (
            <div className="text-center py-8 xs:py-12">
              <Settings className="w-12 h-12 xs:w-16 xs:h-16 text-muted-foreground mx-auto mb-3 xs:mb-4" />
              <h3 className="text-base xs:text-lg font-semibold mb-2">Nenhuma integração configurada</h3>
              <p className="text-sm xs:text-base text-muted-foreground mb-4 px-4">
                Configure sua primeira integração para começar a automatizar seu negócio
              </p>
              <Button 
                onClick={() => navigate('/vendedor/apps?new=true')}
                className="w-full xs:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Integração
              </Button>
            </div>
          ) : (
            integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                name={integration.name}
                icon={integration.icon}
                active={integration.active}
                createdAt={integration.createdAt}
                productName={integration.productName}
                type={integration.type}
                onToggle={(active) => handleToggleIntegration(integration, active)}
                onConfigure={() => handleConfigureIntegration(integration)}
                onDelete={() => handleDeleteIntegration(integration)}
                onPanel={() => handlePanelIntegration(integration)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
