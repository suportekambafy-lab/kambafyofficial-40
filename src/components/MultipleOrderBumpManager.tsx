import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrderBumpSettings } from "@/hooks/useOrderBumpSettings";
import { ProductExtraBumpConfigurator } from "./ProductExtraBumpConfigurator";
import { AccessExtensionBumpConfigurator } from "./AccessExtensionBumpConfigurator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, Package, Clock, Edit, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MultipleOrderBumpManagerProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function MultipleOrderBumpManager({ productId, onSaveSuccess }: MultipleOrderBumpManagerProps) {
  const { orderBumps, loading, deleteOrderBump } = useOrderBumpSettings(productId);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOrderBump, setEditingOrderBump] = useState<string | null>(null);
  const [newBumpType, setNewBumpType] = useState<'product_extra' | 'access_extension'>('product_extra');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateNew = () => {
    setEditingOrderBump(null);
    setIsCreating(true);
    setDialogOpen(true);
  };

  const handleEdit = (orderBumpId: string) => {
    setEditingOrderBump(orderBumpId);
    setIsCreating(true);
    setDialogOpen(true);
  };

  const handleDelete = async (orderBumpId: string) => {
    const success = await deleteOrderBump(orderBumpId);
    if (success) {
      onSaveSuccess();
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setIsCreating(false);
    setEditingOrderBump(null);
  };

  const handleSaveSuccess = () => {
    handleDialogClose();
    onSaveSuccess();
  };

  const activeOrderBumps = orderBumps.filter(bump => bump.enabled);
  const canCreateMore = activeOrderBumps.length < 3;

  const getBumpTypeIcon = (category: string) => {
    return category === 'access_extension' ? Clock : Package;
  };

  const getBumpTypeName = (category: string) => {
    return category === 'access_extension' ? 'Extensão de Acesso' : 'Produto Extra';
  };

  const editingBumpData = editingOrderBump ? orderBumps.find(bump => bump.id === editingOrderBump) : null;
  const editingBumpType = editingBumpData?.bump_category as 'product_extra' | 'access_extension' || 'product_extra';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Carregando order bumps..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Order Bumps</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie até 3 order bumps independentes por produto. Cada order bump pode ser um produto extra ou extensão de acesso.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={activeOrderBumps.length >= 3 ? "destructive" : "secondary"}>
                {activeOrderBumps.length}/3 Order Bumps Ativos
              </Badge>
              {!canCreateMore && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Limite atingido</span>
                </div>
              )}
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateNew} disabled={!canCreateMore}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Order Bump
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOrderBump ? 'Editar Order Bump' : 'Criar Novo Order Bump'}
                  </DialogTitle>
                </DialogHeader>
                
                {!editingOrderBump && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Tipo de Order Bump</label>
                    <Select value={newBumpType} onValueChange={(value: 'product_extra' | 'access_extension') => setNewBumpType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_extra">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Produto Extra
                          </div>
                        </SelectItem>
                        <SelectItem value="access_extension">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Extensão de Acesso
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(editingOrderBump ? editingBumpType : newBumpType) === 'product_extra' ? (
                  <ProductExtraBumpConfigurator
                    productId={productId}
                    onSaveSuccess={handleSaveSuccess}
                    editingOrderBump={editingBumpData}
                  />
                ) : (
                  <AccessExtensionBumpConfigurator
                    productId={productId}
                    onSaveSuccess={handleSaveSuccess}
                    editingOrderBump={editingBumpData}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Order Bumps */}
          <div className="space-y-4">
            {orderBumps.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Package className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum order bump criado</p>
                  <p className="text-sm text-muted-foreground">
                    Crie order bumps para aumentar suas vendas
                  </p>
                </div>
              </div>
            ) : (
              orderBumps.map((orderBump) => {
                const Icon = getBumpTypeIcon(orderBump.bump_category);
                return (
                  <Card key={orderBump.id} className="border-l-[6px] border-l-muted-foreground/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 mt-1 ${orderBump.bump_category === 'access_extension' ? 'text-orange-600' : 'text-blue-600'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{orderBump.title}</h4>
                              <Badge variant={orderBump.enabled ? "default" : "secondary"}>
                                {orderBump.enabled ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline">
                                {getBumpTypeName(orderBump.bump_category)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {orderBump.description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Posição:</span> {
                                orderBump.position === 'after_payment_method' ? 'Após métodos de pagamento' :
                                orderBump.position === 'before_payment_method' ? 'Antes dos métodos de pagamento' :
                                'Após informações do cliente'
                              }
                              {orderBump.bump_product_name && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="font-medium">Produto:</span> {orderBump.bump_product_name}
                                  {orderBump.bump_product_price && (
                                    <>
                                      <span className="mx-1">-</span>
                                      <span>{orderBump.bump_product_price}</span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(orderBump.id!)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja deletar este order bump? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(orderBump.id!)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}