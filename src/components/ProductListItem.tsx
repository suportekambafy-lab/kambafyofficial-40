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
      "flex items-center gap-4 p-4 bg-card rounded-lg border transition-all hover:shadow-md",
      isAffiliate && "border-l-4 border-l-blue-500"
    )}>
      {/* Cover Image */}
      <div className="flex-shrink-0">
        {product.cover ? (
          <img
            src={product.cover}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg"
          />
        ) : (
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-xs">Sem imagem</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-foreground truncate">{product.name}</h3>
          {isAffiliate && (
            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              Afiliado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{formatPrice(product.price)} KZ</span>
          <span>{product.sales} vendas</span>
          <span className="capitalize">{product.type}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {getStatusBadge()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {canRequestRevision && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRequestRevision(product)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
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
            >
              <Edit className="w-4 h-4" />
            </Button>
          </>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onShare(product)}
        >
          <Share className="w-4 h-4" />
        </Button>
        
        {!isAffiliate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(product)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

ProductListItem.displayName = 'ProductListItem';
