import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, Copy, Share, Link, Users, Check } from "lucide-react";
import { createMemberAreaLinks } from '@/utils/memberAreaLinks';

interface ProductShareDialogProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductShareDialog({ product, open, onOpenChange }: ProductShareDialogProps) {
  const { toast } = useToast();
  const memberAreaLinks = createMemberAreaLinks();
  const [copiedLinks, setCopiedLinks] = useState<Record<string, boolean>>({});

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!open) {
      setCopiedLinks({});
    }
  }, [open]);

  if (!open) return null;

  // Debug product sharing
  console.log('=== PRODUCT SHARE DEBUG ===');
  console.log('Product for sharing:', product);
  console.log('Product ID:', product.id, 'Type:', typeof product.id);

  const copyToClipboard = (text: string, type: string, linkId: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`
    });
    
    // Mark as copied
    setCopiedLinks(prev => ({ ...prev, [linkId]: true }));
    
    // Reset after 2 seconds
    setTimeout(() => {
      setCopiedLinks(prev => ({ ...prev, [linkId]: false }));
    }, 2000);
  };

  // Função para obter o link correto da área de membros - sempre usar membros.kambafy.com
  const getMemberAreaLink = () => {
    const memberAreaId = product.member_area_id || product.member_areas?.id;
    if (memberAreaId) {
      const url = memberAreaLinks.getMemberAreaUrl(memberAreaId);
      console.log('🔗 ProductShareDialog - Gerando URL da área de membros:', {
        memberAreaId,
        generatedUrl: url,
        product
      });
      return url;
    }
    console.log('❌ ProductShareDialog - Não foi possível gerar URL da área de membros:', {
      product,
      member_area_id: product.member_area_id,
      member_areas: product.member_areas
    });
    return '';
  };

  // Use pay.kambafy.com for checkout links
  const checkoutBaseUrl = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000' // Local development should use port 3000
    : 'https://pay.kambafy.com';
    
  const checkoutLink = `${checkoutBaseUrl}/checkout/${product.id}`;
  const salesPageLink = `${checkoutBaseUrl}/produto/${product.id}`;
  // Use the same checkout link for preview to maintain consistency
  const previewLink = checkoutLink;
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

  // Verificar se o produto é um rascunho
  const isRascunho = product.status === 'Rascunho';

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
          {isRascunho && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
              <p className="text-sm text-orange-800 font-medium">
                ⚠️ Este produto está em rascunho
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Produtos em rascunho não podem ser compartilhados. Complete e publique o produto para gerar links de checkout.
              </p>
            </div>
          )}
          
          <div>
            <h3 className="font-medium mb-2">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              Preço: {product.price} KZ
            </p>
            {(product.member_area_id || product.member_areas?.id) && (
              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Inclui acesso à área de membros
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Página de Vendas</Label>
              <div className="flex gap-2">
                <Input 
                  value={isRascunho ? "Link indisponível para rascunhos" : salesPageLink} 
                  readOnly 
                  className="font-mono text-xs"
                  disabled={isRascunho}
                />
                <Button 
                  size="sm" 
                  onClick={() => copyToClipboard(salesPageLink, "Link da página de vendas", "sales-page")}
                  disabled={isRascunho}
                >
                  {copiedLinks["sales-page"] ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Página completa com descrição, FAQ e botão de compra. Ideal para campanhas.
              </p>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Link Direto de Checkout</Label>
              <div className="flex gap-2">
                <Input 
                  value={isRascunho ? "Link indisponível para rascunhos" : previewLink} 
                  readOnly 
                  className="font-mono text-xs"
                  disabled={isRascunho}
                />
                <Button 
                  size="sm" 
                  onClick={() => copyToClipboard(previewLink, "Link do checkout", "checkout")}
                  disabled={isRascunho}
                >
                  {copiedLinks.checkout ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Vai direto para o checkout sem passar pela página de vendas.
              </p>
              <Button 
                onClick={openCheckoutInNewTab}
                className="w-full mt-2"
                variant="outline"
                disabled={isRascunho}
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

            {(product.member_area_id || product.member_areas?.id) && (
              <div className="border-t pt-4">
                <Label className="mb-2 block">Link da Área de Membros</Label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    value={getMemberAreaLink()} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => copyToClipboard(getMemberAreaLink(), "Link da área de membros", "member-area")}
                  >
                    {copiedLinks["member-area"] ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Link direto para acessar a área de membros após a compra.
                </p>
              </div>
            )}

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
