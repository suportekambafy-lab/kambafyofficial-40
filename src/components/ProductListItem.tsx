import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Share, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  type: string;
  status: string;
  admin_approved: boolean;
  cover: string;
  sales: number;
  created_at: string;
  user_id: string;
  commission?: string;
  is_affiliate?: boolean;
  affiliate_commission?: string;
  affiliate_code?: string;
  revision_requested?: boolean;
  revision_requested_at?: string;
}

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onShare: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onRequestRevision: (product: Product) => void;
}

export const ProductListItem = memo(({
  product,
  onEdit,
  onShare,
  onDelete,
  onToggleStatus,
  onRequestRevision
}: ProductListItemProps) => {
  const getStatusBadge = () => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      'Ativo': { variant: 'default', label: 'Ativo' },
      'Inativo': { variant: 'secondary', label: 'Inativo' },
      'Pendente': { variant: 'outline', label: 'Pendente' },
      'Banido': { variant: 'destructive', label: 'Banido' },
      'Rascunho': { variant: 'outline', label: 'Rascunho' },
    };
    const config = statusConfig[product.status] || { variant: 'secondary', label: product.status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1');
  };

  const isAffiliate = product.is_affiliate;
  const isBanned = product.status === 'Banido';
  const canRequestRevision = isBanned && !product.revision_requested;

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-card rounded-lg border transition-all hover:shadow-md",
      isAffiliate && "border-l-4 border-l-blue-500"
    )}>
      {/* Mobile: Image + Info row */}
      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          {product.cover ? (
            <img
              src={product.cover}
              alt={product.name}
              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground text-xs">Sem imagem</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start sm:items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-medium text-foreground text-sm sm:text-base line-clamp-1">{product.name}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge()}
              {isAffiliate && (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  Afiliado
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium">{formatPrice(product.price)} KZ</span>
            <span>{product.sales} vendas</span>
            <span className="capitalize">{product.type}</span>
          </div>
        </div>
      </div>

      {/* Actions - Full width on mobile, inline on desktop */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
        {canRequestRevision && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRequestRevision(product)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50 h-8 w-8 p-0"
          >
            <AlertCircle className="w-4 h-4" />
          </Button>
        )}
        
        {!isAffiliate && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleStatus(product)}
              disabled={product.status === 'Pendente' || product.status === 'Banido' || product.status === 'Rascunho'}
              className="h-8 w-8 p-0"
            >
              {product.status === 'Ativo' ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(product)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onShare(product)}
          className="h-8 w-8 p-0"
        >
          <Share className="w-4 h-4" />
        </Button>
        
        {!isAffiliate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(product)}
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

ProductListItem.displayName = 'ProductListItem';
