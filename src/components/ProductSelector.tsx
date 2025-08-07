
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  onProductSelect: (product: Product) => void;
}

export function ProductSelector({ products, selectedProduct, onProductSelect }: ProductSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Selecionar Produto</h2>
      <p className="text-muted-foreground">Escolha o produto para integrar</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground">Crie um produto primeiro para configurar integrações</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
            <Card 
              key={product.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedProduct?.id === product.id 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onProductSelect(product)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {product.type}
                    </Badge>
                    <Badge 
                      variant={product.status === 'Ativo' ? 'default' : 'secondary'} 
                      className="mt-1 ml-2 text-xs"
                    >
                      {product.status}
                    </Badge>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
