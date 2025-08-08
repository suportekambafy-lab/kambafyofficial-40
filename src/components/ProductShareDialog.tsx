
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Copy, Share, Link } from "lucide-react";

interface ProductShareDialogProps {
  product: any;
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

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`
    });
  };

  // Use pay.kambafy.com for checkout links
  const checkoutBaseUrl = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000' // Local development should use port 3000
    : 'https://pay.kambafy.com';
    
  const checkoutLink = `${checkoutBaseUrl}/checkout/${product.id}`;
  // Pre-rendered preview URL for social crawlers (OG/Twitter tags server-side)
  const previewLink = `https://hcbkqygdtzpxvctfdqbd.functions.supabase.co/checkout-prerender/${product.id}`;
  console.log('Generated checkout link:', checkoutLink);
  
  // Cache-bust preview for WhatsApp to force re-scrape
  const whatsappPreview = `${previewLink}?v=${Date.now()}`;
  
  const shareLinks = {
    checkout: checkoutLink,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(whatsappPreview)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(previewLink)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(previewLink)}&text=${encodeURIComponent(product.name)}`
  };

  const openCheckoutInNewTab = () => {
    window.open(checkoutLink, '_blank');
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
              <Label>Link com Preview (recomendado)</Label>
              <div className="flex gap-2">
                <Input 
                  value={previewLink} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button 
                  size="sm" 
                  onClick={() => copyToClipboard(previewLink, "Link com preview")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este link para redes sociais: mostra título, descrição e imagem. Usuários reais serão redirecionados ao checkout automaticamente.
              </p>
              <div className="text-xs text-muted-foreground">
                Link direto (sem preview): <span className="font-mono">{shareLinks.checkout}</span>
              </div>
              <Button 
                onClick={openCheckoutInNewTab}
                className="w-full mt-2"
                variant="outline"
              >
                <Link className="h-4 w-4 mr-2" />
                Testar Checkout
              </Button>
              {window.location.origin.includes('localhost') && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Desenvolvimento:</strong> Em produção, este link usará pay.kambafy.com para o checkout.
                  </p>
                </div>
              )}
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
              <strong>Dica:</strong> O link de checkout será aberto no subdomínio pay.kambafy.com, dedicado aos pagamentos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
