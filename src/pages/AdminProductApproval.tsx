import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  revision_requested: boolean;
  revision_requested_at: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    business_name: string | null;
    email: string | null;
  };
}

export default function AdminProductApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-pending-products"],
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
          revision_requested,
          revision_requested_at,
          created_at,
          profiles!inner(
            full_name,
            business_name,
            email
          )
        `)
        .eq("admin_approved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.rpc("admin_approve_product", {
        product_id: productId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      toast({
        title: "Produto aprovado",
        description: "O produto foi aprovado e está ativo no marketplace",
      });
      setSelectedProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ productId, note }: { productId: string; note: string }) => {
      const { error } = await supabase
        .from("products")
        .update({
          revision_requested: true,
          revision_requested_at: new Date().toISOString(),
          status: "Revisão",
        })
        .eq("id", productId);

      if (error) throw error;

      // Enviar notificação ao vendedor (pode ser implementado depois)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
      toast({
        title: "Revisão solicitada",
        description: "O vendedor foi notificado para revisar o produto",
      });
      setSelectedProduct(null);
      setRevisionNote("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao solicitar revisão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Aprovação de Produtos</h1>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-4 w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Aprovação de Produtos</h1>
        <p className="text-muted-foreground">
          Controle de qualidade - {products?.length || 0} produtos pendentes
        </p>
      </div>

      {!products || products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Tudo em ordem!</h3>
            <p className="text-muted-foreground">
              Não há produtos pendentes de aprovação no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="w-40 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    {product.cover ? (
                      <img
                        src={product.cover}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{product.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>
                            {product.profiles.business_name || product.profiles.full_name}
                          </span>
                          <span>•</span>
                          <span>{product.profiles.email}</span>
                        </div>
                        <div className="flex gap-2 mb-3">
                          <Badge variant="outline">{product.type}</Badge>
                          {product.category && (
                            <Badge variant="secondary">{product.category}</Badge>
                          )}
                          {product.revision_requested && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Em revisão
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{product.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {product.cover && (
                              <img
                                src={product.cover}
                                alt={product.name}
                                className="w-full rounded-lg"
                              />
                            )}
                            <div>
                              <h4 className="font-semibold mb-2">Descrição</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {product.description}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => approveMutation.mutate(product.id)}
                                disabled={approveMutation.isPending}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  if (revisionNote.trim()) {
                                    requestRevisionMutation.mutate({
                                      productId: product.id,
                                      note: revisionNote,
                                    });
                                  }
                                }}
                                disabled={requestRevisionMutation.isPending}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Solicitar revisão
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        onClick={() => approveMutation.mutate(product.id)}
                        disabled={approveMutation.isPending}
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Solicitar revisão
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Solicitar Revisão</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Informe o que precisa ser ajustado no produto "{product.name}"
                            </p>
                            <Textarea
                              placeholder="Ex: A descrição está incompleta, adicione mais detalhes sobre o conteúdo..."
                              value={revisionNote}
                              onChange={(e) => setRevisionNote(e.target.value)}
                              rows={5}
                            />
                            <Button
                              onClick={() => {
                                if (revisionNote.trim()) {
                                  requestRevisionMutation.mutate({
                                    productId: product.id,
                                    note: revisionNote,
                                  });
                                }
                              }}
                              disabled={
                                !revisionNote.trim() || requestRevisionMutation.isPending
                              }
                              className="w-full"
                            >
                              Enviar solicitação
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
