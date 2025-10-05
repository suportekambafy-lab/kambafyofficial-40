import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Calendar, DollarSign, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Cohort, CohortInsert, CohortStatus } from "@/types/cohort";
import { format } from "date-fns";

interface CohortsManagerProps {
  memberAreaId: string;
  memberAreaName: string;
}

export default function CohortsManager({ memberAreaId, memberAreaName }: CohortsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_id: '',
    price: '',
    currency: 'KZ',
    max_students: '',
    start_date: '',
    end_date: '',
    status: 'active' as 'active' | 'inactive' | 'full' | 'ended'
  });

  useEffect(() => {
    loadCohorts();
    loadProducts();
  }, [memberAreaId]);

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('member_area_cohorts')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCohorts((data || []) as Cohort[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar turmas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('member_area_id', memberAreaId)
        .eq('status', 'Ativo');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        toast({ title: "Erro: Usuário não autenticado", variant: "destructive" });
        return;
      }

      if (!formData.product_id) {
        toast({ title: "Selecione um produto", variant: "destructive" });
        return;
      }

      const cohortData: CohortInsert = {
        member_area_id: memberAreaId,
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        price: (editingCohort?.name === 'Turma A' || formData.name === 'Turma A') ? null : (formData.price || null),
        currency: formData.currency || 'KZ',
        product_id: formData.product_id,
        max_students: formData.max_students ? parseInt(formData.max_students) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status as CohortStatus,
      };

      if (editingCohort) {
        const { error } = await supabase
          .from('member_area_cohorts')
          .update(cohortData)
          .eq('id', editingCohort.id);

        if (error) throw error;
        toast({ title: "Turma atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('member_area_cohorts')
          .insert([cohortData]);

        if (error) throw error;
        toast({ title: "Turma criada com sucesso!" });
      }

      setDialogOpen(false);
      resetForm();
      loadCohorts();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar turma",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cohortId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;

    try {
      const { error } = await supabase
        .from('member_area_cohorts')
        .delete()
        .eq('id', cohortId);

      if (error) throw error;
      
      toast({ title: "Turma excluída com sucesso!" });
      loadCohorts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir turma",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (cohort: Cohort) => {
    setEditingCohort(cohort);
    
    // Para Turma A, pré-selecionar o primeiro produto ativo se não houver produto vinculado
    const productId = cohort.product_id || (cohort.name === 'Turma A' && products.length > 0 ? products[0].id : '');
    
    setFormData({
      name: cohort.name,
      description: cohort.description || '',
      product_id: productId,
      price: cohort.name === 'Turma A' ? '' : (cohort.price || ''), // Turma A não tem preço personalizado
      currency: cohort.currency || 'KZ',
      max_students: cohort.max_students?.toString() || '',
      start_date: cohort.start_date ? format(new Date(cohort.start_date), 'yyyy-MM-dd') : '',
      end_date: cohort.end_date ? format(new Date(cohort.end_date), 'yyyy-MM-dd') : '',
      status: cohort.status,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCohort(null);
    setFormData({
      name: '',
      description: '',
      product_id: '',
      price: '',
      currency: 'KZ',
      max_students: '',
      start_date: '',
      end_date: '',
      status: 'active',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default", label: "Ativa" },
      inactive: { variant: "secondary", label: "Inativa" },
      full: { variant: "destructive", label: "Lotada" },
      ended: { variant: "outline", label: "Encerrada" }
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const copyCheckoutLink = async (cohort: Cohort) => {
    if (!cohort.product_id) {
      toast({
        title: "Esta turma não está vinculada a um produto",
        description: "Vincule a turma a um produto para gerar o link de pagamento",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === cohort.product_id);
    if (!product) {
      toast({
        title: "Produto não encontrado",
        variant: "destructive",
      });
      return;
    }

    // Sempre usar o subdomínio pay.kambafy.com em produção
    const checkoutUrl = `https://pay.kambafy.com/checkout/${product.id}?cohort=${cohort.id}`;

    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopiedId(cohort.id);
      toast({
        title: "Link copiado!",
        description: "Link de pagamento da turma copiado para a área de transferência",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar link",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Turmas</h2>
          <p className="text-muted-foreground">Gerencie as turmas de {memberAreaName}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCohort ? 'Editar Turma' : 'Criar Nova Turma'}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da turma. Você pode vincular a um produto existente ou definir um preço personalizado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Turma *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Turma Janeiro 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva os detalhes da turma"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Este produto será vinculado à turma para criar o link de checkout.
                </p>
              </div>

              {/* Preço Personalizado - Não disponível para Turma A */}
              {editingCohort?.name !== 'Turma A' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Preço Personalizado (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="price"
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="Ex: 5000 ou deixe vazio para usar preço do produto"
                    />
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KZ">KZ</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="MZN">MZN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.price 
                      ? `💰 Esta turma será vendida por ${formData.price} ${formData.currency}` 
                      : '📦 Será usado o preço do produto selecionado'}
                  </p>
                </div>
              )}
              
              {editingCohort?.name === 'Turma A' && (
                <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                  <p className="text-sm text-muted-foreground">
                    ℹ️ A <strong>Turma A</strong> é a turma padrão e sempre usa o preço do produto.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="max_students">Número Máximo de Alunos</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                  placeholder="Ex: 50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Término</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                    <SelectItem value="full">Lotada</SelectItem>
                    <SelectItem value="ended">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : editingCohort ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cohorts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma turma criada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie turmas para organizar seus alunos e definir preços personalizados
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Turma
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((cohort) => (
            <Card key={cohort.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{cohort.name}</CardTitle>
                  {getStatusBadge(cohort.status)}
                </div>
                {cohort.description && (
                  <CardDescription>{cohort.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  {/* Link de Checkout */}
                  {cohort.product_id && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => copyCheckoutLink(cohort)}
                      className="w-full gap-2"
                    >
                      {copiedId === cohort.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Link Copiado!
                        </>
                      ) : (
                        <>
                          <LinkIcon className="w-4 h-4" />
                          Copiar Link de Venda
                        </>
                      )}
                    </Button>
                  )}

                  {/* Badge de Turma Padrão */}
                  {cohort.name === 'Turma A' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Turma Padrão
                    </Badge>
                  )}

                  {/* Alunos */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{cohort.current_students}{cohort.max_students ? ` / ${cohort.max_students}` : ''} alunos</span>
                  </div>

                  {/* Data de Início */}
                  {cohort.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{format(new Date(cohort.start_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(cohort)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(cohort.id)}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
