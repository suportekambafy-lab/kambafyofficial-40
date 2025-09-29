
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Facebook, Webhook, Palette, Settings, Mail, RotateCcw } from "lucide-react";
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
            icon: <Facebook className="w-5 h-5 text-blue-600" />,
            productName: pixel.products?.name || 'Produto não encontrado',
            productId: pixel.product_id
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
                                   settings?.reviews?.enabled || settings?.socialProof?.enabled;
          
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

      // Sales Recovery system removed - skipping fetch

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
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="flex items-center gap-2 w-full xs:w-auto justify-center whitespace-nowrap">
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Nova Integração</span>
              <span className="xs:hidden">Nova</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto p-0">
            <div className="p-4 xs:p-6">
              <SheetHeader className="space-y-2">
                <SheetTitle className="text-lg xs:text-xl">Nova Integração</SheetTitle>
                <SheetDescription className="text-sm xs:text-base">
                  Configure uma nova integração para automatizar seu negócio
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-4 xs:mt-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-6 xs:mb-8 overflow-x-auto pb-2">
                  <div className="flex items-center space-x-2 xs:space-x-3 min-w-max px-2">
                    <div className="flex items-center flex-shrink-0">
                      <div className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                        currentStep === 'product' || currentStep === 'integration' || currentStep === 'configure'
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        1
                      </div>
                      <span className={`ml-1 xs:ml-2 text-xs sm:text-sm whitespace-nowrap ${
                        currentStep === 'product' ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        Produto
                      </span>
                    </div>

                    <div className="w-4 xs:w-6 sm:w-8 h-px bg-border flex-shrink-0"></div>

                    <div className="flex items-center flex-shrink-0">
                      <div className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                        currentStep === 'integration' || currentStep === 'configure'
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        2
                      </div>
                      <span className={`ml-1 xs:ml-2 text-xs sm:text-sm whitespace-nowrap ${
                        currentStep === 'integration' ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                      }`}>
                        Integração
                      </span>
                    </div>

                    <div className="w-4 xs:w-6 sm:w-8 h-px bg-border flex-shrink-0"></div>

                    <div className="flex items-center flex-shrink-0">
                      <div className={`w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                        currentStep === 'configure'
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        3
                      </div>
                      <span className={`ml-1 xs:ml-2 text-xs sm:text-sm whitespace-nowrap ${
                        currentStep === 'configure' ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        Configurar
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  {currentStep === 'product' && (
                    <ProductSelector
                      products={products}
                      selectedProduct={selectedProduct}
                      onProductSelect={handleProductSelect}
                    />
                  )}

                  {currentStep === 'integration' && (
                    <div className="space-y-4">
                      <Button variant="ghost" onClick={() => setCurrentStep('product')} className="mb-4">
                        ← Voltar
                      </Button>
                      <IntegrationTypeSelector
                        selectedType={selectedIntegrationType}
                        onTypeSelect={handleIntegrationSelect}
                      />
                    </div>
                  )}

                  {currentStep === 'configure' && selectedProduct && selectedIntegrationType && (
                    <div className="space-y-4">
                      <Button variant="ghost" onClick={() => setCurrentStep('integration')} className="mb-4">
                        ← Voltar
                      </Button>
                      <IntegrationConfigurator
                        product={selectedProduct}
                        integrationType={selectedIntegrationType}
                        onBack={() => setCurrentStep('integration')}
                        onComplete={handleConfigurationComplete}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

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
              <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full xs:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Integração
                  </Button>
                </SheetTrigger>
              </Sheet>
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
