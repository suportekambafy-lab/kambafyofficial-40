import React, { memo } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Package, CheckCircle, Clock, XCircle, CreditCard, Banknote, Building } from "lucide-react";
import { getPaymentMethodName } from "@/utils/paymentMethods";

interface Sale {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
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
  } | null;
}

interface SaleCardProps {
  sale: Sale;
}

export const SaleCard = memo(({ sale }: SaleCardProps) => {
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

  const formatPrice = (amount: string, currency: string) => {
    return `${parseFloat(amount).toLocaleString('pt-BR')} ${currency}`;
  };

  const getStatusBadge = (status: string, paymentMethod: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
      case 'recovered':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><CheckCircle className="w-3 h-3 mr-1" />Recuperado</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
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
            <span className="truncate">{sale.customer_name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs flex items-center">
              {getPaymentMethodText(sale.payment_method)}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-checkout-green">
              {formatPrice(sale.amount, sale.currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SaleCard.displayName = 'SaleCard';