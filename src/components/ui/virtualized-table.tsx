import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedTableProps {
  items: any[];
  height: number;
  itemHeight: number;
  renderItem: (index: number, style: any, item: any) => React.ReactNode;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const VirtualizedTable = memo(({
  items,
  height,
  itemHeight,
  renderItem,
  loading = false,
  onLoadMore,
  hasMore = false
}: VirtualizedTableProps) => {
  const listRef = useRef<List>(null);
  const [overscan, setOverscan] = useState(5);

  // Otimizar overscan baseado na performance
  useEffect(() => {
    const updateOverscan = () => {
      const perfNow = performance.now();
      const start = perfNow;
      
      // Teste rápido de performance
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      
      const elapsed = performance.now() - start;
      
      // Ajustar overscan baseado na performance
      if (elapsed > 5) {
        setOverscan(2); // Performance baixa
      } else if (elapsed > 2) {
        setOverscan(3); // Performance média  
      } else {
        setOverscan(5); // Performance alta
      }
    };

    updateOverscan();
  }, []);

  const Row = useCallback(({ index, style }: any) => {
    const item = items[index];
    
    // Carregar mais quando chegar perto do fim
    if (hasMore && !loading && index >= items.length - 10 && onLoadMore) {
      onLoadMore();
    }

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center">
          <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      );
    }

    return renderItem(index, style, item);
  }, [items, hasMore, loading, onLoadMore, renderItem]);

  return (
    <div className="relative">
      <List
        ref={listRef}
        height={height}
        itemCount={items.length + (loading ? 5 : 0)}
        itemSize={itemHeight}
        overscanCount={overscan}
        width="100%"
      >
        {Row}
      </List>
      
      {loading && (
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          <div className="animate-spin h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </div>
      )}
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';