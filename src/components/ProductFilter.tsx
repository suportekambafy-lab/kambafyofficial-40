
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
}

interface ProductFilterProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function ProductFilter({ value, onValueChange }: ProductFilterProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts(products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full h-9 sm:h-10 rounded-lg text-xs sm:text-sm bg-card text-card-foreground border-border">
        <SelectValue placeholder="Todos os produtos" className="text-card-foreground" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os produtos</SelectItem>
        {products.map(product => (
          <SelectItem key={product.id} value={product.id}>
            {product.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
