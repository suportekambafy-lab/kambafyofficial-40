import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAngolaPaymentMethods } from '@/utils/paymentMethods';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Plus, History, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getPaymentMethodsByCountry } from '@/utils/paymentMethods';

interface CustomerBalanceModalProps {
  children: React.ReactNode;
}

export function CustomerBalanceModal({ children }: CustomerBalanceModalProps) {
  const { user } = useAuth();
  const userEmail = user?.email || '';
  const { balance, transactions, loading, addBalanceByEmail, registerKambaPayEmail, fetchBalanceByEmail, fetchTransactionsByEmail } = useKambaPayBalance();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [open, setOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  // Pega os métodos de pagamento de Angola (país padrão)
  const paymentMethods = getPaymentMethodsByCountry('AO');

  useEffect(() => {
    if (open && userEmail) {
      checkRegistration();
    }
  }, [open, userEmail]);

  const checkRegistration = async () => {
    if (!userEmail) return;
    
    const balanceData = await fetchBalanceByEmail(userEmail);
    setIsRegistered(balanceData !== null);
    
    // Buscar também as transações
    if (balanceData) {
      await fetchTransactionsByEmail(userEmail);
    }
  };

  const handleRegister = async () => {
    if (!userEmail) {
      toast.error('Email do usuário não encontrado');
      return;
    }

    setIsRegistering(true);
    try {
      const success = await registerKambaPayEmail(userEmail);
      
      if (success) {
        toast.success('Registrado no KambaPay com sucesso!');
        setIsRegistered(true);
        await checkRegistration();
      } else {
        toast.error('Erro ao registrar no KambaPay');
      }
    } catch (error) {
      toast.error('Erro inesperado ao registrar');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAddBalance = async () => {
    if (!userEmail) {
      toast.error('Email do usuário não encontrado');
      return;
    }

    if (!isRegistered) {
      toast.error('Você precisa se registrar no KambaPay primeiro');
      return;
    }

    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    if (!paymentMethod) {
      toast.error('Por favor, selecione um método de pagamento');
      return;
    }

    setIsAdding(true);
    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
      const success = await addBalanceByEmail(
        userEmail, 
        amountValue, 
        'Adição de saldo', 
        selectedMethod?.name || paymentMethod
      );
      
      if (success) {
        toast.success(`${amountValue} KZ adicionados ao seu saldo!`);
        setAmount('');
        setPaymentMethod('');
        await checkRegistration();
      } else {
        toast.error('Erro ao adicionar saldo. Tente novamente.');
      }
    } catch (error) {
      toast.error('Erro inesperado ao adicionar saldo');
    } finally {
      setIsAdding(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KZ`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Saldo KambaPay
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner text="Carregando..." />
          </div>
        ) : !isRegistered ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Registrar no KambaPay</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Você precisa se registrar no KambaPay para usar este recurso.
              </p>
              <p className="text-xs text-blue-600 mb-3">
                Email: {userEmail}
              </p>
              <Button 
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Registrar no KambaPay
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="balance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="balance">Saldo</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="space-y-4">
              {/* Current Balance */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-2xl font-bold text-blue-600">
                  {balance ? formatCurrency(balance.balance) : '0,00 KZ'}
                </p>
              </div>

              {/* Add Balance */}
              <div className="space-y-3">
                <Label htmlFor="amount">Adicionar Saldo</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Valor em KZ"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isAdding}
                  min="1"
                  step="0.01"
                />

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isAdding}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                       <div className="flex items-center gap-2">
                         <PaymentMethodIcon
                           methodId={method.id}
                           width={24}
                           height={24}
                         />
                         {method.name}
                       </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAddBalance}
                  disabled={isAdding || !amount || !paymentMethod}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isAdding ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Carregar Saldo
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  <strong>Nota:</strong> Em um ambiente real, este carregamento seria processado através do método de pagamento selecionado.
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2500, 5000].map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(value.toString())}
                    disabled={isAdding}
                  >
                    {value} KZ
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4" />
                <span className="font-medium">Últimas Transações</span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma transação ainda</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-full ${
                          transaction.type === 'credit' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.type === 'credit' ? 'Crédito' : 'Débito'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}