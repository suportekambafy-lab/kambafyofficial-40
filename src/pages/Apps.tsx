import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductSelector } from "@/components/ProductSelector";
import { IntegrationTypeSelector, IntegrationType } from "@/components/IntegrationTypeSelector";
import { IntegrationConfigurator } from "@/components/IntegrationConfigurator";
import { AppsTabLayout } from "@/components/AppsTabLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

type Step = 'product' | 'integration' | 'configure' | 'complete';

export default function Apps() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';
  const configureType = searchParams.get('configure');
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Se há um tipo de configuração específico na URL, pula direto para configuração
    if (configureType && products.length > 0) {
      // Seleciona o primeiro produto por padrão
      const firstProduct = products[0];
      if (firstProduct) {
        setSelectedProduct(firstProduct);
        
        // Define o tipo de integração baseado no parâmetro
        let integrationType: IntegrationType | null = null;
        
        if (configureType === 'facebook-pixel') {
          integrationType = {
            id: 'facebook-pixel',
            name: 'Facebook Pixel',
            description: 'Rastreie conversões e otimize campanhas do Facebook',
            icon: ({ className }: { className?: string }) => <span className={className}>📊</span>,
            color: 'text-blue-600'
          };
        } else if (configureType === 'webhook') {
          integrationType = {
            id: 'webhook',
            name: 'Webhook',
            description: 'Receba notificações em tempo real sobre eventos',
            icon: ({ className }: { className?: string }) => <span className={className}>🔗</span>,
            color: 'text-orange-600'
          };
        } else if (configureType === 'order-bump') {
          integrationType = {
            id: 'order-bump',
            name: 'Order Bump',
            description: 'Configure produtos complementares para aumentar o valor médio do pedido',
            icon: ({ className }: { className?: string }) => <span className={className}>➕</span>,
            color: 'text-purple-600'
          };
        } else if (configureType === 'custom-checkout') {
          integrationType = {
            id: 'custom-checkout',
            name: 'Checkout Personalizado',
            description: 'Personalize seu checkout com banners, countdown, avaliações e prova social',
            icon: ({ className }: { className?: string }) => <span className={className}>🛒</span>,
            color: 'text-green-600'
          };
        } else if (configureType === 'upsell') {
          integrationType = {
            id: 'upsell',
            name: 'Upsell Pós-Compra',
            description: 'Configure ofertas especiais que aparecem após a compra principal',
            icon: ({ className }: { className?: string }) => <span className={className}>⬆️</span>,
            color: 'text-indigo-600'
          };
        }
        
        if (integrationType) {
          setSelectedIntegrationType(integrationType);
          setCurrentStep('configure');
        }
      }
    }
  }, [configureType, products]);

  const fetchProducts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive"
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setCurrentStep('integration');
  };

  const handleIntegrationSelect = (type: IntegrationType) => {
    setSelectedIntegrationType(type);
    setCurrentStep('configure');
  };

  const handleConfigurationComplete = () => {
    setCurrentStep('complete');
    
    // Disparar evento para notificar outras partes da aplicação
    window.dispatchEvent(new CustomEvent('integrationCreated', {
      detail: { type: selectedIntegrationType?.id }
    }));
    
    // Salvar no localStorage para persistir entre sessões
    localStorage.setItem('lastIntegrationCreated', JSON.stringify({
      type: selectedIntegrationType?.id,
      timestamp: new Date().toISOString()
    }));
  };

  const handleReset = () => {
    setCurrentStep('product');
    setSelectedProduct(null);
    setSelectedIntegrationType(null);
    // Remove parâmetros da URL
    setSearchParams({});
  };

  const handleGoBack = () => {
    // Remove parâmetros da URL e volta para a lista
    setSearchParams({});
    
    // Disparar evento para notificar que deve atualizar a lista
    window.dispatchEvent(new CustomEvent('integrationUpdated'));
  };

  const getStepNumber = (step: Step): number => {
    switch (step) {
      case 'product': return 1;
      case 'integration': return 2;
      case 'configure': return 3;
      case 'complete': return 3;
      default: return 1;
    }
  };

  // Se não está criando nova integração, mostra o gerenciamento
  if (!isNew) {
    return (
      <OptimizedPageWrapper skeletonVariant="list" requireAuth={true}>
        <div className="p-3 xs:p-4 md:p-6 space-y-4 xs:space-y-6 max-w-6xl mx-auto min-h-screen">
          <AppsTabLayout />
        </div>
      </OptimizedPageWrapper>
    );
  }

  if (loading) {
    return (
      <OptimizedPageWrapper skeletonVariant="form" requireAuth={true}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </OptimizedPageWrapper>
    );
  }

  return (
    <div className="p-3 xs:p-4 md:p-6 space-y-4 xs:space-y-6 max-w-6xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 xs:gap-4">
        {(currentStep !== 'product' || configureType) && (
          <Button variant="ghost" onClick={() => {
            if (configureType) {
              handleGoBack();
            } else {
              setCurrentStep('product');
            }
          }} className="p-2 self-start">
            ←
          </Button>
        )}
        <div className="flex-1 w-full">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold break-words">
            {configureType ? t('apps.configure') : t('apps.title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm xs:text-base">
            {t('apps.subtitle')}
          </p>
        </div>
      </div>

      {/* Progress Steps - só mostra se não é configuração direta */}
      {!configureType && (
        <div className="flex items-center justify-center mb-6 xs:mb-8 overflow-x-auto pb-2">
          <div className="flex items-center space-x-3 xs:space-x-4 min-w-max px-2 xs:px-4">
            {/* Step 1 */}
            <div className="flex items-center flex-shrink-0">
              <div className={`w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center text-xs xs:text-sm font-medium ${
                getStepNumber(currentStep) >= 1 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className={`ml-2 text-xs xs:text-sm whitespace-nowrap ${
                currentStep === 'product' ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                Produto
              </span>
            </div>

            <div className="w-6 xs:w-8 sm:w-12 h-px bg-border flex-shrink-0"></div>

            {/* Step 2 */}
            <div className="flex items-center flex-shrink-0">
              <div className={`w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center text-xs xs:text-sm font-medium ${
                getStepNumber(currentStep) >= 2 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={`ml-2 text-xs xs:text-sm whitespace-nowrap ${
                currentStep === 'integration' ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                Integração
              </span>
            </div>

            <div className="w-6 xs:w-8 sm:w-12 h-px bg-border flex-shrink-0"></div>

            {/* Step 3 */}
            <div className="flex items-center flex-shrink-0">
              <div className={`w-7 h-7 xs:w-8 xs:h-8 rounded-full flex items-center justify-center text-xs xs:text-sm font-medium ${
                getStepNumber(currentStep) >= 3 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <span className={`ml-2 text-xs xs:text-sm whitespace-nowrap ${
                currentStep === 'configure' || currentStep === 'complete' 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground'
              }`}>
                Configurar
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-h-[300px] xs:min-h-[400px] w-full">
        {currentStep === 'product' && !configureType && (
          <ProductSelector
            products={products}
            selectedProduct={selectedProduct}
            onProductSelect={handleProductSelect}
          />
        )}

        {currentStep === 'integration' && !configureType && (
          <IntegrationTypeSelector
            selectedType={selectedIntegrationType}
            onTypeSelect={handleIntegrationSelect}
          />
        )}

        {currentStep === 'configure' && selectedProduct && selectedIntegrationType && (
          <IntegrationConfigurator
            product={selectedProduct}
            integrationType={selectedIntegrationType}
            onBack={() => {
              if (configureType) {
                handleGoBack();
              } else {
                setCurrentStep('integration');
              }
            }}
            onComplete={handleConfigurationComplete}
          />
        )}

        {currentStep === 'complete' && selectedProduct && selectedIntegrationType && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Integração Configurada!</h2>
              <p className="text-muted-foreground mb-6">
                {selectedIntegrationType.name} foi configurado com sucesso para {selectedProduct.name}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleReset} className="w-full sm:w-auto">
                  Nova Integração
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full sm:w-auto">
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
