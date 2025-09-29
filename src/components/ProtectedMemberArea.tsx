
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
          // MUDANÇA: Não bloquear mais automaticamente, deixar que a área de membros decida
          setHasAccess(true); // Permitir sempre e deixar a verificação para a área
        }
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setHasAccess(true); // Em caso de erro, permitir acesso e deixar área decidir
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, areaId, authLoading]);

  // Não mostrar tela de loading - fazer verificação silenciosamente
  if (authLoading || loading) {
    return null; // Não mostrar nada enquanto carrega
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Card className="max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4 text-white">Acesso Restrito</h2>
            <p className="text-gray-300 mb-6">
              Você precisa estar logado para acessar esta área de membros.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full bg-checkout-green hover:bg-checkout-green/90"
              >
                Fazer Login
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <Card className="max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4 text-white">Acesso Negado</h2>
            <p className="text-gray-300 mb-2">
              Você não tem acesso a <strong>{memberAreaName || "esta área de membros"}</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Para acessar este conteúdo, você precisa comprar o curso relacionado.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/meus-acessos')}
                className="w-full bg-checkout-green hover:bg-checkout-green/90"
              >
                Ver Minhas Compras
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
