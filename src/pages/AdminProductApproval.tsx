import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  cover: string | null;
  category: string | null;
  type: string;
  status: string;
  admin_approved: boolean;
  created_at: string;
  sales: number;
  profiles: {
    full_name: string | null;
    business_name: string | null;
    email: string | null;
  };
}

export default function AdminProductApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { admin } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          cover,
          category,
          type,
          status,
          admin_approved,
          sales,
          created_at,
          profiles!inner(
            full_name,
            business_name,
            email
          )
        `)
        .eq("status", "Ativo")
        .neq("type", "Link de Pagamento")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleMarketplaceMutation = useMutation({
    mutationFn: async ({ productId, isApproved }: { productId: string; isApproved: boolean }) => {
      if (!admin?.email) {
        throw new Error('Admin não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('admin-toggle-marketplace', {
        body: {
          productId,
          isApproved,
          adminEmail: admin.email
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-products"] });
      toast({
        title: variables.isApproved ? "Produto ativado" : "Produto desativado",
        description: variables.isApproved 
          ? "O produto agora aparece no marketplace" 
          : "O produto foi removido do marketplace",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.profiles.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const handleApproveAll = async () => {
    const pendingProducts = filteredProducts?.filter(p => !p.admin_approved) || [];
    
    if (pendingProducts.length === 0) {
      toast({
        title: "Nenhum produto pendente",
        description: "Todos os produtos já foram aprovados",
      });
      return;
    }

    const confirmed = window.confirm(
      `Deseja aprovar ${pendingProducts.length} produto(s) de uma vez?`
    );

    if (!confirmed) return;

    for (const product of pendingProducts) {
      await toggleMarketplaceMutation.mutateAsync({
        productId: product.id,
        isApproved: true,
      });
    }

    toast({
      title: "Sucesso",
      description: `${pendingProducts.length} produto(s) aprovado(s)`,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Controle do Marketplace" description={`Gerencie quais produtos aparecem no marketplace`}>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2 w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Controle do Marketplace" description={`Gerencie quais produtos aparecem no marketplace - Total: ${products?.length || 0} produtos`}>
      <div className="flex items-center gap-4 mb-6">
        <Input
          placeholder="Buscar por nome do produto ou vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Button
          onClick={handleApproveAll}
          disabled={toggleMarketplaceMutation.isPending || (filteredProducts?.filter(p => !p.admin_approved).length === 0)}
          variant="default"
        >
          Aprovar Todos ({filteredProducts?.filter(p => !p.admin_approved).length || 0})
        </Button>
      </div>

      {!filteredProducts || filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Tente outro termo de busca" : "Não há produtos cadastrados ainda"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    {product.cover ? (
                      <img
                        src={product.cover}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="truncate">
                        {product.profiles.business_name || product.profiles.full_name}
                      </span>
                      <span>•</span>
                      <span>{formatPrice(product.price)}</span>
                      <span>•</span>
                      <span>{product.sales} vendas</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {product.type}
                      </Badge>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Switch Control */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium mb-1">
                        {product.admin_approved ? "Visível" : "Oculto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        no marketplace
                      </p>
                    </div>
                    <Switch
                      checked={product.admin_approved}
                      onCheckedChange={(checked) => {
                        toggleMarketplaceMutation.mutate({
                          productId: product.id,
                          isApproved: checked,
                        });
                      }}
                      disabled={toggleMarketplaceMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
