import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductExtraBumpConfigurator } from "./ProductExtraBumpConfigurator";
import { AccessExtensionBumpConfigurator } from "./AccessExtensionBumpConfigurator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock } from "lucide-react";

interface OrderBumpConfiguratorProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function OrderBumpConfigurator({ productId, onSaveSuccess }: OrderBumpConfiguratorProps) {
  const handleSaveSuccess = () => {
    // Disparar eventos para atualizar lista de integrações
    window.dispatchEvent(new CustomEvent('integrationCreated'));
    window.dispatchEvent(new CustomEvent('integrationUpdated'));
    onSaveSuccess();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Bumps - Configure Ofertas Extras</CardTitle>
          <p className="text-sm text-muted-foreground">
            Você pode ativar ambos os tipos de order bump simultaneamente para maximizar suas vendas.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="product-extra" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="product-extra" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produto Extra
          </TabsTrigger>
          <TabsTrigger value="access-extension" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Extensão de Acesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product-extra">
          <ProductExtraBumpConfigurator
            productId={productId}
            onSaveSuccess={handleSaveSuccess}
          />
        </TabsContent>

        <TabsContent value="access-extension">
          <AccessExtensionBumpConfigurator
            productId={productId}
            onSaveSuccess={handleSaveSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}