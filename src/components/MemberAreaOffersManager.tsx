import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Package, DollarSign, Image as ImageIcon, Percent, Save, X, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MemberAreaOffer {
  id: string;
  member_area_id: string;
  product_id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: string;
  discount_percentage: number;
  order_number: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  cover: string | null;
  description: string | null;
}

interface MemberAreaOffersManagerProps {
  memberAreaId: string;
  userId: string;
}

export function MemberAreaOffersManager({ memberAreaId, userId }: MemberAreaOffersManagerProps) {
  const [offers, setOffers] = useState<MemberAreaOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<MemberAreaOffer | null>(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    image_url: '',
    price: '',
    discount_percentage: 0,
    enabled: true
  });

  useEffect(() => {
    loadOffers();
    loadProducts();
  }, [memberAreaId]);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('member_area_offers')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .order('order_number');

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Erro ao carregar ofertas:', error);
      toast.error('Erro ao carregar ofertas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cover, description')
        .eq('user_id', userId)
        .eq('status', 'Ativo');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setFormData({
        ...formData,
        product_id: productId,
        title: product.name,
        description: product.description || '',
        image_url: product.cover || '',
        price: product.price
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id || !formData.title || !formData.price) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('member_area_offers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOffer.id);

        if (error) throw error;
        toast.success('Oferta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('member_area_offers')
          .insert({
            ...formData,
            member_area_id: memberAreaId,
            user_id: userId,
            order_number: offers.length + 1
          });

        if (error) throw error;
        toast.success('Oferta adicionada com sucesso!');
      }

      loadOffers();
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar oferta:', error);
      toast.error('Erro ao salvar oferta');
    }
  };

  const handleEdit = (offer: MemberAreaOffer) => {
    setEditingOffer(offer);
    setFormData({
      product_id: offer.product_id,
      title: offer.title,
      description: offer.description || '',
      image_url: offer.image_url || '',
      price: offer.price,
      discount_percentage: offer.discount_percentage,
      enabled: offer.enabled
    });
    setShowForm(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta oferta?')) return;

    try {
      const { error } = await supabase
        .from('member_area_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      toast.success('Oferta excluída com sucesso!');
      loadOffers();
    } catch (error) {
      console.error('Erro ao excluir oferta:', error);
      toast.error('Erro ao excluir oferta');
    }
  };

  const handleToggleEnabled = async (offerId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('member_area_offers')
        .update({ enabled })
        .eq('id', offerId);

      if (error) throw error;
      toast.success(enabled ? 'Oferta ativada' : 'Oferta desativada');
      loadOffers();
    } catch (error) {
      console.error('Erro ao atualizar oferta:', error);
      toast.error('Erro ao atualizar oferta');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOffer(null);
    setFormData({
      product_id: '',
      title: '',
      description: '',
      image_url: '',
      price: '',
      discount_percentage: 0,
      enabled: true
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando ofertas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Ofertas na Área de Membros</h3>
          <p className="text-sm text-muted-foreground">
            Adicione produtos que seus alunos podem comprar dentro da área
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Oferta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? 'Editar Oferta' : 'Nova Oferta'}
              </DialogTitle>
              <DialogDescription>
                Configure a oferta que será exibida na área de membros
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select value={formData.product_id} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.price} KZ
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título da oferta"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da oferta"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (KZ) *</Label>
                  <Input
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="10000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Desconto (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Oferta ativa</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingOffer ? 'Atualizar' : 'Criar'} Oferta
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma oferta adicionada ainda</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Oferta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    {offer.image_url ? (
                      <img
                        src={offer.image_url}
                        alt={offer.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{offer.title}</h4>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {offer.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={offer.enabled ? 'default' : 'secondary'}>
                        {offer.enabled ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{offer.price} KZ</span>
                        {offer.discount_percentage > 0 && (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                            -{offer.discount_percentage}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1" />
                      
                      <div className="flex gap-2">
                        <Switch
                          checked={offer.enabled}
                          onCheckedChange={(checked) => handleToggleEnabled(offer.id, checked)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(offer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(offer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
