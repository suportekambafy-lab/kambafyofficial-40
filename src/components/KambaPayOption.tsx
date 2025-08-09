import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKambaPayBalance } from '@/hooks/useKambaPayBalance';
import { Wallet, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KambaPayOptionProps {
  productPrice: number;
  onSelect: () => void;
  selected: boolean;
  disabled?: boolean;
}

export function KambaPayOption({ productPrice, onSelect, selected, disabled }: KambaPayOptionProps) {
  const [email, setEmail] = useState('');
  const { balance, loading, fetchBalanceByEmail } = useKambaPayBalance(email);

  const formatPrice = (amount: number, currency: string = 'KZ') => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
    }).format(amount).replace('AOA', currency);
  };

  const isDisabled = disabled || loading;
  const hasSufficientBalance = balance && balance.balance >= productPrice;
  const hasBalance = balance && balance.balance > 0;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        selected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={!isDisabled ? onSelect : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">KambaPay</h3>
              <p className="text-sm text-muted-foreground">
                Carteira digital
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatPrice(productPrice)}</p>
            <p className="text-xs text-muted-foreground">Saldo digital</p>
          </div>
        </div>

        {selected && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kambapay-email">Email registrado no KambaPay</Label>
              <Input
                id="kambapay-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            {email && balance && (
              <div className="p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Saldo disponível:</span>
                  <span className="font-medium">{formatPrice(balance.balance)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Valor do produto:</span>
                  <span className="font-medium">{formatPrice(productPrice)}</span>
                </div>
                {hasSufficientBalance ? (
                  <div className="flex items-center justify-between text-sm">
                    <span>Saldo após compra:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(balance.balance - productPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Saldo insuficiente</span>
                  </div>
                )}
              </div>
            )}

            {email && !balance && !loading && (
              <div className="p-3 rounded-lg border-red-200 bg-red-50 border">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Email não encontrado</span>
                </div>
                <p className="text-xs text-red-600 mb-3">
                  Este email não está registrado no KambaPay ou não possui saldo.
                </p>
                <Link to="/kambapay">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Registrar no KambaPay
                  </Button>
                </Link>
              </div>
            )}

            {!email && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-800 mb-2">
                  Não tem uma conta KambaPay ainda?
                </p>
                <Link to="/kambapay">
                  <Button variant="outline" size="sm" className="w-full">
                    <Wallet className="mr-2 h-4 w-4" />
                    Criar conta KambaPay
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}