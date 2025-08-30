import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  BookOpen, 
  Clock, 
  Users,
  Search,
  Settings,
  LogOut,
  ChevronRight,
  Star,
  Menu,
  Home,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Lesson, Module, MemberArea } from '@/types/memberArea';

interface ModernMemberDashboardProps {
  memberArea: MemberArea;
  lessons: Lesson[];
  modules: Module[];
}

export default function ModernMemberDashboard({ memberArea, lessons, modules }: ModernMemberDashboardProps) {
  const navigate = useNavigate();
  const { student, logout } = useMemberAreaAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');

  const publishedLessons = lessons.filter(lesson => lesson.status === 'published').sort((a, b) => a.order_number - b.order_number);
  const publishedModules = modules.filter(module => module.status === 'published').sort((a, b) => a.order_number - b.order_number);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
      navigate(`/login/${memberArea.id}`);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  const handleModuleClick = (module: Module) => {
    navigate(`/area/${memberArea.id}/module/${module.id}`);
  };

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/area/${memberArea.id}/lesson/${lesson.id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="bg-black/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              {memberArea.logo_url ? (
                <img 
                  src={memberArea.logo_url} 
                  alt={memberArea.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{memberArea.name}</h1>
                {student && (
                  <p className="text-sm text-gray-400">Bem-vindo, {student.name}</p>
                )}
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {memberArea.hero_image_url && (
        <div className="relative h-96 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${memberArea.hero_image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl">
              {memberArea.hero_title && (
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                  {memberArea.hero_title}
                </h1>
              )}
              {memberArea.hero_description && (
                <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
                  {memberArea.hero_description}
                </p>
              )}
              {publishedModules.length > 0 && (
                <Button 
                  onClick={() => handleModuleClick(publishedModules[0])}
                  className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-3 h-auto font-semibold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Começar Agora
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Overview */}
        {memberArea.description && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Sobre o Curso</h2>
              <p className="text-gray-300 text-lg leading-relaxed">{memberArea.description}</p>
            </div>
          </div>
        )}

        {/* Course Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mr-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{publishedModules.length}</p>
                <p className="text-gray-400">Módulos</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{publishedLessons.length}</p>
                <p className="text-gray-400">Aulas</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">∞</p>
                <p className="text-gray-400">Acesso Vitalício</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section - Netflix Style */}
        {publishedModules.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Meu Primeiro Produto Digital</h2>
              <div className="text-sm text-gray-400">
                {publishedModules.length} {publishedModules.length === 1 ? 'módulo' : 'módulos'}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {publishedModules.map((module, index) => (
                <div 
                  key={module.id}
                  onClick={() => handleModuleClick(module)}
                  className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
                >
                  <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-yellow-600 transition-all duration-300">
                    <div className="relative aspect-video">
                      {module.cover_image_url ? (
                        <img 
                          src={module.cover_image_url} 
                          alt={module.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                          <div className="text-center">
                            <BookOpen className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <span className="text-xs text-gray-400">MÓDULO {index + 1}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-xs text-yellow-500 font-semibold mb-1">MÓDULO {module.order_number}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-yellow-500 transition-colors">
                        {module.title}
                      </h3>
                      {module.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                          {module.description}
                        </p>
                      )}
                      <div className="flex items-center text-xs text-gray-500">
                        <Play className="w-3 h-3 mr-1" />
                        <span>{module.lessons_count || 0} aulas</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Journey Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-6 h-6 bg-yellow-600 rounded flex items-center justify-center">
              <span className="text-xs font-bold text-white">📍</span>
            </div>
            <h2 className="text-xl font-bold text-white">Sua jornada começa aqui</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publishedModules.slice(0, 3).map((module, index) => (
              <div key={module.id} className="bg-gray-900/50 rounded-lg p-6 border border-gray-700 hover:border-yellow-600 transition-all duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{module.title}</h3>
                </div>
                {module.description && (
                  <p className="text-gray-400 mb-4">{module.description}</p>
                )}
                <Button 
                  onClick={() => handleModuleClick(module)}
                  variant="outline" 
                  className="w-full border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-black"
                >
                  {index === 0 ? 'Começar' : 'Acessar'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Lessons if any exist outside modules */}
        {publishedLessons.filter(lesson => !lesson.module_id).length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Aulas Avulsas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedLessons.filter(lesson => !lesson.module_id).map((lesson) => (
                <Card 
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  className="bg-gray-800 border-gray-700 hover:border-yellow-600 cursor-pointer transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-2">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{lesson.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{Math.floor(lesson.duration / 60)} min</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}