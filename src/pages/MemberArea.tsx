import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import MemberAreaContent from "@/components/MemberAreaContent";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { MemberArea } from "@/types/memberArea";

export default function MemberAreaPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('MemberAreaPage - areaId:', areaId);

  const { data: memberArea, isLoading: memberAreaLoading } = useQuery({
    queryKey: ['member-area', areaId],
    queryFn: async () => {
      if (!areaId) {
        navigate('/');
        return null;
      }

      console.log('Fetching member area with ID:', areaId);
      
      // Try by ID first
      let { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', areaId)
        .single();
      
      // If not found by ID, try by URL
      if (error || !data) {
        console.log('Not found by ID, trying by URL...');
        const { data: dataByUrl, error: errorByUrl } = await supabase
          .from('member_areas')
          .select('*')
          .eq('url', areaId)
          .single();
          
        if (errorByUrl || !dataByUrl) {
          console.error('Member area not found:', errorByUrl);
          toast({
            title: "Erro",
            description: "Área de membros não encontrada",
            variant: "destructive"
          });
          navigate('/');
          return null;
        }
        
        data = dataByUrl;
      }
      
      console.log('Member area found:', data);
      return data as MemberArea;
    },
    enabled: !!areaId
  });

  if (memberAreaLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Carregando área de membros..." />
      </div>
    );
  }

  if (!memberArea) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Área de membros não encontrada</h1>
          <p className="text-gray-600">A área de membros solicitada não existe ou não está disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <MemberAreaAuthProvider memberAreaId={memberArea.id}>
      <MemberAreaContent memberArea={memberArea} />
    </MemberAreaAuthProvider>
  );
}