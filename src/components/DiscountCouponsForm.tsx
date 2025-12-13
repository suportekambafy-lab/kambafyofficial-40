import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Save, 
  Ticket, 
  Plus, 
  Trash2, 
  Copy,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DiscountCouponsFormProps {
  productId: string;
  onSaveSuccess: () => void;
}

interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency: string;
  min_purchase_amount: number;
  max_uses: number | null;
  uses_per_customer: number;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export function DiscountCouponsForm({ productId, onSaveSuccess }: DiscountCouponsFormProps) {
  const [coupons, setCoupons] = useState<DiscountCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New coupon form state
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [usesPerCustomer, setUsesPerCustomer] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCoupons();
  }, [productId]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as DiscountCoupon[]) || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCode.trim()) {
      toast.error('Código obrigatório', {
        description: 'Por favor, insira um código para o cupom.',
      });
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error('Valor do desconto inválido', {
        description: 'Por favor, insira um valor de desconto válido.',
      });
      return;
    }

    if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
      toast.error('Desconto inválido', {
        description: 'O desconto percentual não pode ser maior que 100%.',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const couponData = {
        user_id: user.id,
        product_id: productId,
        code: newCode.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        currency: 'EUR',
        max_uses: maxUses ? parseInt(maxUses) : null,
        uses_per_customer: parseInt(usesPerCustomer) || 1,
        valid_until: validUntil || null,
        is_active: isActive,
      };

      const { error } = await supabase
        .from('discount_coupons')
        .insert(couponData);

      if (error) {
        if (error.code === '23505') {
          toast.error('Código duplicado', {
            description: 'Já existe um cupom com este código.',
          });
          return;
        }
        throw error;
      }

      toast.success('Cupom criado!', {
        description: `Cupom ${newCode.toUpperCase()} criado com sucesso.`,
      });

      // Reset form
      setNewCode('');
      setDiscountValue('');
      setMaxUses('');
      setUsesPerCustomer('1');
      setValidUntil('');
      setIsActive(true);
      setIsAdding(false);
      
      loadCoupons();
      
      // Dispatch event to update integrations list
      window.dispatchEvent(new CustomEvent('integrationCreated'));
      
      onSaveSuccess();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast.error('Erro ao criar cupom', {
        description: error.message || 'Ocorreu um erro ao criar o cupom.',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCouponStatus = async (coupon: DiscountCoupon) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;

      toast.success(coupon.is_active ? 'Cupom desativado' : 'Cupom ativado');
      loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast.error('Erro ao atualizar cupom');
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Cupom excluído');
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2">
          <Ticket className="h-8 w-8 text-emerald-600" />
          <span className="text-2xl font-bold text-emerald-600">Cupons de Desconto</span>
        </div>
      </div>

      {/* Lista de Cupons */}
      {coupons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cupons Ativos</CardTitle>
            <CardDescription>
              Gerencie seus cupons de desconto para este produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  coupon.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-3 py-1 rounded font-mono text-sm font-semibold">
                      {coupon.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyCode(coupon.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Badge variant={coupon.discount_type === 'percentage' ? 'default' : 'secondary'}>
                    {coupon.discount_type === 'percentage' ? (
                      <><Percent className="h-3 w-3 mr-1" />{coupon.discount_value}%</>
                    ) : (
                      <><DollarSign className="h-3 w-3 mr-1" />{coupon.discount_value}€</>
                    )}
                  </Badge>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {coupon.current_uses}/{coupon.max_uses || '∞'}
                    </span>
                    
                    {coupon.valid_until && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(coupon.valid_until), 'dd/MM/yyyy', { locale: pt })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={() => toggleCouponStatus(coupon)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteCoupon(coupon.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Formulário para novo cupom */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Cupom
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="code">Código do Cupom *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="Ex: DESCONTO10"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    <Hash className="h-4 w-4 mr-2" />
                    Gerar
                  </Button>
                </div>
              </div>

              {/* Tipo e Valor do Desconto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select value={discountType} onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <span className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Percentual
                        </span>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor Fixo
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">
                    Valor do Desconto *
                  </Label>
                  <div className="relative">
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? '100' : undefined}
                      step="0.01"
                      placeholder={discountType === 'percentage' ? '10' : '5.00'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {discountType === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Limites de Uso */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Limite Total de Usos</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Ilimitado"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para ilimitado
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usesPerCustomer">Usos por Cliente</Label>
                  <Input
                    id="usesPerCustomer"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={usesPerCustomer}
                    onChange={(e) => setUsesPerCustomer(e.target.value)}
                  />
                </div>
              </div>

              {/* Data de Validade */}
              <div className="space-y-2">
                <Label htmlFor="validUntil">Válido Até</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para cupom sem expiração
                </p>
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Cupom ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Clientes podem usar este cupom imediatamente
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsAdding(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Criar Cupom
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button 
          onClick={() => setIsAdding(true)} 
          className="w-full"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Criar Novo Cupom
        </Button>
      )}
    </div>
  );
}