import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, Image } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';

export default function MemberAreaSupportMaterials() {
  const { memberArea } = useMemberAreaAuth();

  // Simulando materiais de apoio - em produção viriam do banco
  const supportMaterials = [
    {
      id: 1,
      title: "Guia Completo em PDF",
      description: "Material completo com todos os conceitos abordados no curso",
      type: "pdf",
      size: "2.5 MB",
      downloadUrl: "#"
    },
    {
      id: 2,
      title: "Planilha de Exercícios",
      description: "Planilha prática para aplicar os conhecimentos",
      type: "excel",
      size: "890 KB",
      downloadUrl: "#"
    },
    {
      id: 3,
      title: "Infográfico Resumo",
      description: "Resumo visual dos principais pontos",
      type: "image",
      size: "1.2 MB",
      downloadUrl: "#"
    },
    {
      id: 4,
      title: "Links Úteis",
      description: "Coleção de recursos externos recomendados",
      type: "link",
      size: "",
      downloadUrl: "#"
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'excel':
        return <FileText className="w-6 h-6 text-green-500" />;
      case 'image':
        return <Image className="w-6 h-6 text-blue-500" />;
      case 'link':
        return <ExternalLink className="w-6 h-6 text-purple-500" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  return (
    <>
      <SEO 
        title={`Materiais de Apoio - ${memberArea?.name || 'Área de Membros'}`}
        description="Acesse materiais complementares para seus estudos"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Materiais de Apoio</h1>
            <p className="text-muted-foreground">Recursos complementares para potencializar seu aprendizado</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getIcon(material.type)}
                    <div className="flex-1">
                      <div className="font-semibold">{material.title}</div>
                      {material.size && (
                        <div className="text-sm text-muted-foreground font-normal">{material.size}</div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{material.description}</p>
                  
                  <Button className="w-full" variant="outline">
                    {material.type === 'link' ? (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Acessar
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {supportMaterials.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum material disponível</h3>
              <p className="text-muted-foreground">Novos materiais de apoio serão adicionados em breve!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}