
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowLeft } from "lucide-react";

interface ProtectedMemberAreaProps {
  children: React.ReactNode;
}

export default function ProtectedMemberArea({ children }: ProtectedMemberAreaProps) {
  const { areaId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [memberAreaName, setMemberAreaName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      console.log('ProtectedMemberArea - Checking access for user:', user?.id, 'areaId:', areaId);
      
      if (!user) {
        console.log('ProtectedMemberArea - No user found');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (!areaId) {
        console.log('ProtectedMemberArea - No areaId found');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Primeiro, verificar se a área de membros existe
        const { data: memberArea, error: memberAreaError } = await supabase
          .from('member_areas')
          .select('id, name, user_id')
          .eq('id', areaId)
          .maybeSingle();

        if (memberAreaError) {
          console.error('Error fetching member area:', memberAreaError);
          
          // Se não encontrar por ID, tentar por URL
          const { data: memberAreaByUrl, error: memberAreaByUrlError } = await supabase
            .from('member_areas')
            .select('id, name, user_id')
            .eq('url', areaId)
            .maybeSingle();
            
          if (memberAreaByUrlError || !memberAreaByUrl) {
            console.error('Error fetching member area by URL:', memberAreaByUrlError);
            setHasAccess(false);
            setLoading(false);
            return;
          }
          
          // Usar dados da busca por URL
          const isCreator = memberAreaByUrl.user_id === user.id;
          console.log('ProtectedMemberArea - Is creator (by URL):', isCreator);
          
          if (isCreator) {
            setHasAccess(true);
            setMemberAreaName(memberAreaByUrl.name);
            setLoading(false);
            return;
          }
        } else if (memberArea) {
          // Verificar se é o criador da área de membros
          const isCreator = memberArea.user_id === user.id;
          console.log('ProtectedMemberArea - Is creator:', isCreator);
          
          if (isCreator) {
            setHasAccess(true);
            setMemberAreaName(memberArea.name);
            setLoading(false);
            return;
          }
          
          setMemberAreaName(memberArea.name);
        }

        // Se não é o criador, verificar se comprou algum produto relacionado
        console.log('ProtectedMemberArea - Checking purchases for user:', user.id);
        
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            products!inner (
              member_area_id,
              member_areas!inner (
                id,
                name
              )
            )
          `)
          .eq('customer_email', user.email)
          .eq('status', 'completed')
          .eq('products.member_areas.id', areaId);

        if (ordersError) {
          console.error('Error checking orders:', ordersError);
        }

        console.log('ProtectedMemberArea - Found orders:', orders);
        
        const hasPurchased = orders && orders.length > 0;
        
        if (hasPurchased) {
          console.log('ProtectedMemberArea - User has purchased access');
          setHasAccess(true);
          if (orders[0]?.products?.member_areas?.name) {
            setMemberAreaName(orders[0].products.member_areas.name);
          }
        } else {
          console.log('ProtectedMemberArea - User does not have access');
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, areaId, authLoading]);

  // Se chegou até aqui, renderizar diretamente a área
  return <>{children}</>;
}
