import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProductOffers, ProductOffer } from "@/hooks/useProductOffers";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, Trash2, Copy, ExternalLink, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ProductOffersManagerProps {
  productId: string;
  productSlug: string;
  baseCurrency: string;
  basePrice: string;
  hasMultipleOffers: boolean;
  onToggleMultipleOffers: (enabled: boolean) => void;
}

const CURRENCIES = [
  { code: 'AOA', symbol: 'Kz', name: 'Kwanza' },
  { code: 'MZN', symbol: 'MT', name: 'Metical' },
  { code: 'BRL', symbol: 'R$', name: 'Real' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dólar' },
];

export function ProductOffersManager({
  productId,
  productSlug,
  baseCurrency,
  basePrice,
  hasMultipleOffers,
  onToggleMultipleOffers
}: ProductOffersManagerProps) {
  const { offers, loading, addOffer, updateOffer, deleteOffer, toggleOfferActive } = useProductOffers(productId);
  const [newOffer, setNewOffer] = useState({ name: '', price: '', currency: baseCurrency || 'AOA' });
  const [isAdding, setIsAdding] = useState(false);

  const MAX_OFFERS = 300;

  const handleAddOffer = async () => {
    if (!newOffer.name.trim()) {
      toast.error('Nome da oferta é obrigatório');
      return;
    }
    if (!newOffer.price || parseFloat(newOffer.price) <= 0) {
      toast.error('Preço deve ser maior que zero');
      return;
    }
    if (offers.length >= MAX_OFFERS) {
      toast.error(`Limite de ${MAX_OFFERS} ofertas atingido`);
      return;
    }

    setIsAdding(true);
    await addOffer({
      product_id: productId,
      name: newOffer.name.trim(),
      price: parseFloat(newOffer.price),
      currency: newOffer.currency,
      is_active: true,
      sort_order: offers.length
    });
    setNewOffer({ name: '', price: '', currency: baseCurrency || 'AOA' });
    setIsAdding(false);
  };

  const getCheckoutUrl = (offerId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/checkout/${productSlug}?offer=${offerId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  const getCurrencySymbol = (currencyCode: string) => {
    return CURRENCIES.find(c => c.code === currencyCode)?.symbol || currencyCode;
  };

  if (loading) {
    return <LoadingSpinner text="Carregando ofertas..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toggle para habilitar múltiplas ofertas */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="space-y-0.5">
          <Label className="text-base font-medium">Esse produto tem diferentes ofertas</Label>
          <p className="text-sm text-muted-foreground">
            Crie vários links de checkout com preços diferentes para o mesmo produto
          </p>
        </div>
        <Switch
          checked={hasMultipleOffers}
          onCheckedChange={onToggleMultipleOffers}
        />
      </div>

      {hasMultipleOffers && (
        <>
          {/* Oferta Principal (preço base do produto) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Oferta Principal (Preço Base)</Label>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">Oferta Padrão</p>
                      <p className="text-sm text-muted-foreground">
                        {getCurrencySymbol(baseCurrency)} {parseFloat(basePrice || '0').toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Principal</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de ofertas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-muted-foreground">Ofertas</Label>
              <span className="text-sm text-muted-foreground">{offers.length}/{MAX_OFFERS}</span>
            </div>
            
            {offers.map((offer) => (
              <Card key={offer.id} className={`border-l-4 ${offer.is_active ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{offer.name}</p>
                        <Badge variant={offer.is_active ? "default" : "secondary"} className="text-xs">
                          {offer.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getCurrencySymbol(offer.currency)} {offer.price.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(getCheckoutUrl(offer.id!))}
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getCheckoutUrl(offer.id!), '_blank')}
                        title="Abrir checkout"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={(checked) => toggleOfferActive(offer.id!, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOffer(offer.id!)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adicionar nova oferta */}
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="space-y-4">
                <Label className="text-sm font-medium">Adicionar Nova Oferta</Label>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <Input
                      placeholder="Nome da oferta (ex: Black Friday)"
                      value={newOffer.name}
                      onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      placeholder="Preço"
                      value={newOffer.price}
                      onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select 
                      value={newOffer.currency} 
                      onValueChange={(value) => setNewOffer({ ...newOffer, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      onClick={handleAddOffer} 
                      disabled={isAdding || offers.length >= MAX_OFFERS}
                      className="w-full"
                    >
                      {isAdding ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
