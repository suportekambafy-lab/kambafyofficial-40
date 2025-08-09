import React, { useState } from 'react';
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
import { Wallet, Plus, History, ArrowUp, ArrowDown } from "lucide-react";
import { useCustomerBalance } from '@/hooks/useCustomerBalance';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface CustomerBalanceModalProps {
  children: React.ReactNode;
}

export function CustomerBalanceModal({ children }: CustomerBalanceModalProps) {
  const { balance, transactions, loading, addBalance } = useCustomerBalance();
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAddBalance = async () => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }

    setIsAdding(true);
    const success = await addBalance(amountValue, `Adição de saldo via ${getPaymentMethod()}`);
    
    if (success) {
      toast.success(`${amountValue} KZ adicionados ao seu saldo!`);
      setAmount('');
    } else {
      toast.error('Erro ao adicionar saldo. Tente novamente.');
    }
    setIsAdding(false);
  };

  const getPaymentMethod = () => {
    // Simula método de pagamento - em produção seria baseado na seleção do usuário
    return 'Multicaixa Express';
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
            <LoadingSpinner text="Carregando saldo..." />
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
                <div className="flex gap-2">
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
                  <Button 
                    onClick={handleAddBalance}
                    disabled={isAdding || !amount}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAdding ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adicione saldo para usar o KambaPay nas suas compras
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