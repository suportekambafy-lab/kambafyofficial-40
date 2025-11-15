import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomToast } from "@/hooks/useCustomToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  price: string;
  currency: string;
}

interface TestSaleNotificationProps {
  products?: Product[];
}

export function TestSaleNotification({ products = [] }: TestSaleNotificationProps) {
  const { toast } = useCustomToast();
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [customerName, setCustomerName] = useState("Cliente Teste");
  const [customerEmail, setCustomerEmail] = useState("teste@kambafy.com");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Verificar se o usuário é autorizado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 TestSaleNotification: Verificando usuário', user?.email);
      if (user?.email) {
        setUserEmail(user.email);
        const authorized = user.email === 'victormuabi20@gmail.com';
        setIsAuthorized(authorized);
        console.log('🔍 TestSaleNotification: Email autorizado?', authorized);
      }
    };
    checkUser();
  }, []);

  console.log('🔍 TestSaleNotification: Renderizando', { isAuthorized, userEmail });

  // Não renderizar se não for o usuário autorizado
  if (!isAuthorized) {
    console.log('🔍 TestSaleNotification: Não autorizado, não renderizando');
    return null;
  }

  console.log('🔍 TestSaleNotification: AUTORIZADO! Renderizando botão flutuante');

  const handleTestSale = async () => {
    if (!selectedProduct) {
      toast({
        title: "Erro",
        message: "Selecione um produto para testar",
        variant: "error",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // 2. Buscar produto selecionado
      const product = products.find(p => p.id === selectedProduct);
      if (!product) {
        throw new Error("Produto não encontrado");
      }

      // 3. Gerar ID único para a venda de teste
      const testOrderId = `TEST-${Date.now()}`;

      // 4. Criar ordem de teste
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_id: testOrderId,
          product_id: selectedProduct,
          customer_name: customerName,
          customer_email: customerEmail,
          amount: product.price,
          currency: product.currency || 'AOA',
          status: 'pending',
          payment_method: 'test',
          user_id: user.id,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar ordem:', orderError);
        throw orderError;
      }

      console.log('✅ Ordem de teste criada:', order);

      // 5. Atualizar status para completed (isso dispara a notificação)
      const { error: updateError } = await supabase.functions.invoke('update-order-status', {
        body: {
          orderId: order.id,
          status: 'completed',
        },
      });

      if (updateError) {
        console.error('Erro ao completar ordem:', updateError);
        throw updateError;
      }

      console.log('✅ Ordem marcada como completa, notificação enviada!');

      toast({
        title: "Venda de teste criada! 🎉",
        message: "A notificação push foi enviada. Verifique seu dispositivo.",
        variant: "success",
      });

      // Limpar campos
      setCustomerName("Cliente Teste");
      setCustomerEmail("teste@kambafy.com");
      setSelectedProduct("");

    } catch (error: any) {
      console.error('❌ Erro ao criar venda de teste:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao criar venda de teste",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Testar Notificação de Venda"
      >
        <span className="font-medium">Teste Push</span>
      </button>

      {/* Modal com o formulário */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Testar Notificação de Venda
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Crie uma venda de teste para verificar se as notificações push estão funcionando corretamente.
            </p>

            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger id="product">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum produto disponível
                    </SelectItem>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.currency} {product.price}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-name">Nome do Cliente</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Digite o nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email do Cliente</Label>
              <Input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Digite o email do cliente"
              />
            </div>

            <Button 
              onClick={handleTestSale} 
              disabled={loading || !selectedProduct}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando venda de teste...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Criar Venda de Teste e Enviar Notificação
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>ℹ️ Esta venda será marcada como "test" no campo payment_method</p>
              <p>ℹ️ Você receberá uma notificação push no seu dispositivo</p>
              <p>ℹ️ A venda aparecerá na lista de vendas</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
