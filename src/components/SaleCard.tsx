import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Package, CheckCircle, Clock, XCircle, CreditCard, Banknote, Building } from "lucide-react";
import { getPaymentMethodName, getCountryByPaymentMethod } from "@/utils/paymentMethods";
import { useCurrencyToCountry } from "@/hooks/useCurrencyToCountry";
import { formatPriceForSeller } from '@/utils/priceFormatting';

interface Sale {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    cover: string;
    type: string;
    price: string;
  } | null;
}

interface SaleCardProps {
  sale: Sale;
}

export const SaleCard = memo(({ sale }: SaleCardProps) => {
  const { getCurrencyInfo, convertToKZ } = useCurrencyToCountry();
  
  const getProductImage = (cover: string) => {
    if (!cover) return "/placeholder.svg";
    if (cover.startsWith('data:')) {
      return cover;
    }
    // Se a URL já inclui supabase ou http/https, usar diretamente
    if (cover.includes('supabase') || cover.startsWith('http')) {
      return cover;
    }
    // Caso contrário, assumir que é ID do Unsplash (compatibilidade)
    return `https://images.unsplash.com/${cover}`;
  };

  const formatPrice = (sale: Sale) => {
    const currencyInfo = getCurrencyInfo(sale.currency);
    
    // Usar o valor efetivamente pago pelo cliente (amount da ordem)
    const paidAmount = parseFloat(sale.amount);
    
    return (
      <div className="text-right">
        <div className="font-bold text-checkout-green">
          {formatPriceForSeller(paidAmount, sale.currency)}
        </div>
        {sale.currency !== 'KZ' && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>{currencyInfo.flag}</span>
            <span>{currencyInfo.name}</span>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string, paymentMethod: string) => {
    const methodText = getPaymentMethodName(paymentMethod);
    
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Pago via {methodText}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente via {methodText}</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelado via {methodText}</Badge>;
      case 'recovered':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Recuperado via {methodText}</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status} via {methodText}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    return <><CreditCard className="w-3 h-3 mr-1" />{getPaymentMethodName(method)}</>;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {sale.products?.cover && (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={getProductImage(sale.products.cover)}
                  alt={sale.products.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{sale.products?.name || 'Produto'}</h3>
              <p className="text-xs text-gray-500 truncate">#{sale.order_id}</p>
            </div>
          </div>
          {getStatusBadge(sale.status, sale.payment_method)}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                <span>{sale.customer_name}</span>
                {sale.customer_email && (
                  <span className="text-muted-foreground"> • {sale.customer_email}</span>
                )}
                {sale.customer_phone && (
                  <span className="text-muted-foreground"> • {sale.customer_phone}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs flex items-center gap-1">
              {(() => {
                const countryInfo = getCountryByPaymentMethod(sale.payment_method);
                return (
                  <>
                    <span>{countryInfo.flag}</span>
                    <span>{countryInfo.name}</span>
                  </>
                );
              })()}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            {formatPrice(sale)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SaleCard.displayName = 'SaleCard';