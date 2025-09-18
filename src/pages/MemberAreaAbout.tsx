import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Star, Award, BookOpen, Target } from 'lucide-react';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { SEO } from '@/components/SEO';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MemberAreaAbout() {
  const { student, memberArea, loading } = useMemberAreaAuth();
  const navigate = useNavigate();
  const { id: areaId } = useParams();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!student || !memberArea) {
    navigate(`/login/${areaId}`);
    return null;
  }

  const courseStats = [
    { label: "Duração Total", value: "12 horas", icon: Clock },
    { label: "Alunos Ativos", value: "2.847", icon: Users },
    { label: "Avaliação", value: "4.9/5", icon: Star },
    { label: "Certificado", value: "Disponível", icon: Award }
  ];

  const learningObjectives = [
    "Dominar os conceitos fundamentais",
    "Aplicar técnicas avançadas na prática",
    "Desenvolver projetos reais",
    "Preparar-se para o mercado de trabalho",
    "Construir um portfólio profissional"
  ];

  const courseModules = [
    "Introdução e Fundamentos",
    "Conceitos Intermediários", 
    "Técnicas Avançadas",
    "Projetos Práticos",
    "Casos de Estudo",
    "Conclusão e Próximos Passos"
  ];

  return (
    <>
      <SEO 
        title={`Sobre - ${memberArea?.name || 'Área de Membros'}`}
        description={`Conheça mais sobre ${memberArea?.name || 'este curso'} e seus objetivos de aprendizado`}
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">{memberArea?.name || 'Sobre o Curso'}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <span>Transforme sua carreira com conhecimento prático e aplicável no mercado atual</span>
            </p>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {courseStats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <stat.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Learning Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  O que você vai aprender
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {learningObjectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <p>{objective}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Course Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Estrutura do Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {courseModules.map((module, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {String(index + 1).padStart(2, '0')}
                    </Badge>
                    <p>{module}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Description */}
          <Card>
            <CardHeader>
              <CardTitle>Sobre este curso</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Este é um curso completo e prático, desenvolvido para profissionais que desejam se destacar 
                no mercado atual. Com uma abordagem hands-on, você aprenderá não apenas a teoria, mas também 
                como aplicar os conhecimentos em projetos reais.
              </p>
              
              <p className="text-muted-foreground leading-relaxed mt-4">
                O conteúdo foi cuidadosamente estruturado para proporcionar uma jornada de aprendizado 
                progressiva, desde os conceitos fundamentais até técnicas avançadas utilizadas por 
                profissionais experientes da área.
              </p>

              <p className="text-muted-foreground leading-relaxed mt-4">
                Ao final do curso, você terá desenvolvido projetos práticos que poderão compor seu 
                portfólio profissional, além de receber um certificado de conclusão reconhecido no mercado.
              </p>
            </CardContent>
          </Card>

          {/* Prerequisites */}
          <Card>
            <CardHeader>
              <CardTitle>Pré-requisitos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Conhecimentos básicos de informática</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Vontade de aprender e dedicação aos estudos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Computador com acesso à internet</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}