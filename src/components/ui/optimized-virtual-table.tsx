import { memo, useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VirtualTableItem {
  id: string;
  name: string;
  sales: number;
  price: number;
  status: string;
  created_at: string;
}

interface VirtualTableRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: VirtualTableItem[];
    onView: (id: string) => void;
  };
}

// Componente de linha otimizado com memo
const VirtualTableRow = memo(({ index, style, data }: VirtualTableRowProps) => {
  const item = data.items[index];
  
  const statusVariant = useMemo(() => {
    switch (item.status) {
      case 'Ativo': return 'default';
      case 'Inativo': return 'secondary';
      case 'Pendente': return 'outline';
      default: return 'secondary';
    }
  }, [item.status]);

  return (
    <div style={style} className="px-6 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="p-2 bg-muted rounded-md">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{item.name}</h3>
            <p className="text-sm text-muted-foreground">
              {item.sales} vendas • {item.price.toLocaleString('pt-BR')} KZ
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={statusVariant as any}>{item.status}</Badge>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => data.onView(item.id)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
        </div>
      </div>
    </div>
  );
});

interface OptimizedVirtualTableProps {
  items: VirtualTableItem[];
  loading?: boolean;
  onView: (id: string) => void;
  searchPlaceholder?: string;
  title?: string;
  height?: number;
}

// Tabela virtual otimizada para listas grandes
export const OptimizedVirtualTable = memo(({ 
  items, 
  loading = false, 
  onView,
  searchPlaceholder = "Buscar...",
  title = "Lista",
  height = 400
}: OptimizedVirtualTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const tableData = useMemo(() => ({
    items: filteredItems,
    onView
  }), [filteredItems, onView]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <Skeleton className="h-9 w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum item encontrado'}
          </div>
        ) : (
          <List
            height={height}
            width="100%"
            itemCount={filteredItems.length}
            itemSize={80}
            itemData={tableData}
            className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          >
            {VirtualTableRow}
          </List>
        )}
      </CardContent>
    </Card>
  );
});

VirtualTableRow.displayName = 'VirtualTableRow';
OptimizedVirtualTable.displayName = 'OptimizedVirtualTable';