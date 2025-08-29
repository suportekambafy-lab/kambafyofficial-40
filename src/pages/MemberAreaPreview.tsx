
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MemberAreaFullPage from "@/components/MemberAreaFullPage";
import ProtectedMemberArea from "@/components/ProtectedMemberArea";
import { MemberAreaAuthProvider } from "@/contexts/MemberAreaAuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Lesson, Module, MemberArea } from "@/types/memberArea";

export default function MemberAreaPreviewPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const { toast } = useToast();

  console.log('MemberAreaPreviewPage - areaId:', areaId);

  const { data: memberArea, isLoading: memberAreaLoading } = useQuery({
    queryKey: ['member-area', areaId],
    queryFn: async () => {
      if (!areaId) return null;

      console.log('Fetching member area with ID:', areaId);
      
      // Buscar por ID da área de membros
      const { data, error } = await supabase
        .from('member_areas')
        .select('*')
        .eq('id', areaId)
        .single();
      
      if (error) {
        console.error('Error fetching member area:', error);
        
        // Se não encontrar por ID, tentar buscar por URL
        const { data: dataByUrl, error: errorByUrl } = await supabase
          .from('member_areas')
          .select('*')
          .eq('url', areaId)
          .single();
          
        if (errorByUrl) {
          console.error('Error fetching member area by URL:', errorByUrl);
          toast({
            title: "Erro",
            description: "Área de membros não encontrada",
            variant: "destructive"
          });
          return null;
        }
        
        return dataByUrl as MemberArea;
      }
      
      return data as MemberArea;
    },
    enabled: !!areaId
  });

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', memberArea?.id],
    queryFn: async () => {
      if (!memberArea?.id) return [];
      
      console.log('Fetching lessons for member area:', memberArea.id);
      
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching lessons:', error);
        return [];
      }
      
      console.log('Fetched lessons:', data);
      return data as Lesson[];
    },
    enabled: !!memberArea?.id
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', memberArea?.id],
    queryFn: async () => {
      if (!memberArea?.id) return [];
      
      console.log('Fetching modules for member area:', memberArea.id);
      
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('member_area_id', memberArea.id)
        .eq('status', 'published')
        .order('order_number');
      
      if (error) {
        console.error('Error fetching modules:', error);
        return [];
      }
      
      console.log('Fetched modules:', data);
      return data as Module[];
    },
    enabled: !!memberArea?.id
  });

  if (memberAreaLoading || lessonsLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando área de membros...</p>
        </div>
      </div>
    );
  }

  if (!memberArea) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Área de membros não encontrada</h1>
          <p className="text-gray-600">A área de membros solicitada não existe ou não está disponível.</p>
          <p className="text-sm text-gray-500 mt-2">ID/URL: {areaId}</p>
        </div>
      </div>
    );
  }

  return (
    <MemberAreaAuthProvider memberAreaId={memberArea.id}>
      <ProtectedMemberArea>
        <MemberAreaFullPage
          memberArea={memberArea}
          lessons={lessons}
          modules={modules}
        />
      </ProtectedMemberArea>
    </MemberAreaAuthProvider>
  );
}
