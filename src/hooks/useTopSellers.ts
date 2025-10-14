import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TopSeller {
  full_name: string;
  avatar_url: string | null;
  total_sales: number;
  total_revenue: number;
}

export const useTopSellers = () => {
  return useQuery({
    queryKey: ['top-sellers', new Date().getMonth()],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_top_sellers_of_month');
      
      if (error) throw error;
      return data as TopSeller[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
