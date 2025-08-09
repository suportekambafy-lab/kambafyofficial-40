import { useState, useEffect } from "react";
import { SalesRecoveryDashboard } from "@/components/SalesRecoveryDashboard";
import { SalesRecoveryConfigurator } from "@/components/SalesRecoveryConfigurator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OptimizedPageWrapper } from "@/components/ui/optimized-page-wrapper";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function SalesRecovery() {
  const { user } = useAuth();
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('products')
      .select('id, name, type, status')
      .eq('user_id', user.id)
      .eq('status', 'Ativo');

    if (data) {
      setProducts(data);
    }
  };

  const handleConfigure = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setConfigurationOpen(true);
    }
  };

  const handleConfigurationComplete = () => {
    setConfigurationOpen(false);
    setSelectedProduct(null);
  };

  return (
    <OptimizedPageWrapper skeletonVariant="dashboard">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Recuperação de Vendas
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitore carrinhos abandonados e recupere vendas perdidas
            </p>
          </div>
        </div>

        <SalesRecoveryDashboard onConfigure={handleConfigure} />

        <Sheet open={configurationOpen} onOpenChange={setConfigurationOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Configurar Recuperação de Vendas</SheetTitle>
              <SheetDescription>
                Configure as mensagens e delays para recuperação automática de carrinhos abandonados
              </SheetDescription>
            </SheetHeader>
            
            {selectedProduct && (
              <div className="mt-6">
                <SalesRecoveryConfigurator
                  product={selectedProduct}
                  onBack={() => setConfigurationOpen(false)}
                  onComplete={handleConfigurationComplete}
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </OptimizedPageWrapper>
  );
}