import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Copy, Share, Link } from "lucide-react";
import { generateProductSEOLink, copyProductLink, shareProduct, type ProductSEOData } from "@/utils/productSEO";

interface ProductShareDialogProps {
  product: ProductSEOData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductShareDialog({ product, open, onOpenChange }: ProductShareDialogProps) {
  const { toast } = useToast();

  if (!open) return null;

  // Debug product sharing
  console.log('=== PRODUCT SHARE DEBUG ===');
  console.log('Product for sharing:', product);
  console.log('Product ID:', product.id, 'Type:', typeof product.id);

  // Gerar links com prerender SEO otimizado
  const productSEOLink = generateProductSEOLink(product.id, 'product');
  const checkoutSEOLink = generateProductSEOLink(product.id, 'checkout');

  // Links de compartilhamento para redes sociais
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Confira este produto incrível: ${product.name}\n\n${productSEOLink}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productSEOLink)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(productSEOLink)}&text=${encodeURIComponent(product.name)}`
  };

  const handleCopyLink = async () => {
    const success = await copyProductLink(product.id, 'product');
    if (success) {
      toast({
        title: "Copiado!",
        description: "Link SEO otimizado copiado para a área de transferência."
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    }
  };

  const handleNativeShare = async () => {
    const success = await shareProduct(product);
    if (!success) {
      // Fallback para cópia
      handleCopyLink();
    }
  };

  const openCheckoutInNewTab = () => {
    // Para o teste do checkout, usar o link direto sem prerender
    const directCheckoutUrl = window.location.origin.includes('localhost') 
      ? `http://localhost:3000/checkout/${product.id}`
      : `https://pay.kambafy.com/checkout/${product.id}`;
    window.open(directCheckoutUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Compartilhar Produto
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Preço: {product.price} KZ
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link SEO Otimizado</Label>
              <div className="flex gap-2">
                <Input 
                  value={productSEOLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  size="sm" 
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link otimizado para redes sociais com título, descrição e capa do produto.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleNativeShare}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button 
                  onClick={openCheckoutInNewTab}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Testar Checkout
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Compartilhar nas Redes Sociais</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => window.open(shareLinks.whatsapp, '_blank')}
                >
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => window.open(shareLinks.facebook, '_blank')}
                >
                  Facebook
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => window.open(shareLinks.telegram, '_blank')}
                >
                  Telegram
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">
              <strong>✨ SEO Otimizado:</strong> Links gerados automaticamente incluem título, descrição e capa do produto para melhor preview nas redes sociais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}