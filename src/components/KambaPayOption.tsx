import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, AlertCircle } from "lucide-react";
import { useCustomerBalance } from '@/hooks/useCustomerBalance';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface KambaPayOptionProps {
  productPrice: number;
  onSelect: () => void;
  selected: boolean;
  disabled?: boolean;
}

export function KambaPayOption({ productPrice, onSelect, selected, disabled }: KambaPayOptionProps) {
  const { balance, loading } = useCustomerBalance();

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KZ`;
  };

  const hasInsufficientBalance = balance ? balance.balance < productPrice : true;
  const isDisabled = disabled || loading || hasInsufficientBalance;

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    } ${isDisabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Wallet className="h-6 w-6 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">KambaPay</h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
              Digital
            </Badge>
          </div>
          
          {loading ? (
            <div className="flex items-center gap-2 mt-1">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-muted-foreground">Carregando saldo...</span>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm text-muted-foreground">
                Saldo disponível: {balance ? formatCurrency(balance.balance) : '0,00 KZ'}
              </p>
              {hasInsufficientBalance && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">
                    Saldo insuficiente (necessário: {formatCurrency(productPrice)})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Button
          variant={selected ? "default" : "outline"}
          size="sm"
          onClick={onSelect}
          disabled={isDisabled}
          className={selected ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          {selected ? "Selecionado" : "Selecionar"}
        </Button>
      </div>
      
      {selected && !hasInsufficientBalance && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Valor do produto:</span>
            <span>{formatCurrency(productPrice)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span>Saldo após compra:</span>
            <span className="font-medium">
              {balance ? formatCurrency(balance.balance - productPrice) : '0,00 KZ'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}