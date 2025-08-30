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
  HelpCircle,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemberAreaAuth } from '@/contexts/MemberAreaAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import VideoPlayer from '@/components/ui/video-player';
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
  const [currentVideo, setCurrentVideo] = useState<{ lesson: Lesson; isPlaying: boolean } | null>(null);

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
    // Mostrar primeiro vídeo do módulo
    const moduleLesson = lessons.find(l => l.module_id === module.id && l.status === 'published');
    if (moduleLesson?.video_url) {
      setCurrentVideo({ lesson: moduleLesson, isPlaying: true });
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (lesson.video_url) {
      setCurrentVideo({ lesson, isPlaying: true });
    }
  };

  const closeVideo = () => {
    setCurrentVideo(null);
  };

  const NavigationSidebar = ({ isMobileSidebar = false }: { isMobileSidebar?: boolean }) => (
    <div className={`${isMobileSidebar ? 'w-full' : 'w-64'} bg-black border-r border-gray-800 h-full flex flex-col`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          {memberArea.logo_url ? (
            <img src={memberArea.logo_url} alt={memberArea.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white truncate">{memberArea.name}</h2>
            <p className="text-xs text-gray-400">Área de Membros</p>
          </div>
        </div>

        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
            <Home className="w-4 h-4" />
            Início
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-white/10">
            <BookOpen className="w-4 h-4" />
            Meus Cursos
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-white/10">
            <MessageCircle className="w-4 h-4" />
            Suporte
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-300 hover:text-white hover:bg-white/10">
            <HelpCircle className="w-4 h-4" />
            Ajuda
          </Button>
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {student?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{student?.name}</p>
            <p className="text-xs text-gray-400 truncate">{student?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="w-full bg-transparent border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-black">
        {/* Mobile Header */}
        <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 bg-black border-gray-800">
                <NavigationSidebar isMobileSidebar />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              {memberArea.logo_url ? (
                <img src={memberArea.logo_url} alt={memberArea.name} className="w-6 h-6 rounded object-cover" />
              ) : (
                <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-white" />
                </div>
              )}
              <h1 className="font-semibold text-white truncate">{memberArea.name}</h1>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile Hero Section */}
        <div className="relative h-64 bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          {memberArea.hero_image_url && (
            <img 
              src={memberArea.hero_image_url} 
              alt={memberArea.hero_title || memberArea.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="relative h-full flex flex-col justify-end p-4">
            <h1 className="text-2xl font-bold text-white mb-2">
              {memberArea.hero_title || memberArea.name}
            </h1>
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">
              {memberArea.hero_description || memberArea.description}
            </p>
            <Button className="w-fit bg-white text-black hover:bg-gray-200">
              <Play className="w-4 h-4 mr-2" />
              Continuar Assistindo
            </Button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar títulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 text-white rounded-lg border-0 focus:ring-2 focus:ring-red-500 transition-all placeholder-gray-400"
            />
          </div>

          {/* Modules Grid */}
          {publishedModules.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Módulos</h3>
              <div className="grid grid-cols-3 gap-3">
                {publishedModules.map((module) => (
                  <div
                    key={module.id}
                    className="cursor-pointer group"
                    onClick={() => handleModuleClick(module)}
                  >
                    <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-gray-800">
                      {module.cover_image_url ? (
                        <img 
                          src={module.cover_image_url} 
                          alt={module.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-700 to-gray-900">
                          <Play className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Play className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-white mt-2 line-clamp-2">{module.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Individual Lessons */}
          {publishedLessons.filter(l => !l.module_id).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Aulas</h3>
              <div className="grid grid-cols-3 gap-3">
                {publishedLessons.filter(l => !l.module_id).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="cursor-pointer group"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-gray-800">
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-700 to-gray-900">
                        <Play className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Play className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-white mt-2 line-clamp-2">{lesson.title}</h4>
                    <p className="text-xs text-gray-400">{lesson.duration || 5} min</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Video Player Modal */}
        {currentVideo && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            <div className="relative w-full max-w-4xl mx-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeVideo}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </Button>
              <div className="bg-black rounded-lg overflow-hidden">
                <VideoPlayer src={currentVideo.lesson.video_url!} />
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-2">{currentVideo.lesson.title}</h3>
                  {currentVideo.lesson.description && (
                    <p className="text-gray-300 text-sm">{currentVideo.lesson.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Desktop Sidebar */}
      <NavigationSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-black">
        {/* Hero Section - Netflix Style Video Player */}
        <div className="relative h-[70vh] bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          {memberArea.hero_image_url && (
            <img 
              src={memberArea.hero_image_url} 
              alt={memberArea.hero_title || memberArea.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          
          {/* Top Navigation */}
          <div className="absolute top-0 left-0 right-0 p-6 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <h1 className="text-white font-bold text-xl">{memberArea.name}</h1>
                <nav className="hidden md:flex items-center gap-6 text-sm">
                  <span className="text-white font-medium border-b-2 border-white pb-1">Continuar Assistindo</span>
                  <span className="text-gray-300 hover:text-white cursor-pointer">Conteúdos</span>
                  <span className="text-gray-300 hover:text-white cursor-pointer">Materiais de apoio</span>
                  <span className="text-gray-300 hover:text-white cursor-pointer">Sobre</span>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {student?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {memberArea.hero_title || memberArea.name}
              </h1>
              <p className="text-lg text-gray-300 mb-6 line-clamp-3">
                {memberArea.hero_description || memberArea.description || 'A melhor estratégia para atingir seus objetivos'}
              </p>
              <div className="flex items-center gap-4 mb-6">
                <Button className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg font-semibold">
                  <Play className="w-5 h-5 mr-2" />
                  Assistir agora
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="p-6 space-y-8">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar títulos, pessoas, gêneros"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 text-white rounded-lg border-0 focus:ring-2 focus:ring-red-500 transition-all placeholder-gray-500"
            />
          </div>

          {/* Modules Section */}
          {publishedModules.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Módulos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {publishedModules.map((module) => (
                  <div
                    key={module.id}
                    className="cursor-pointer group"
                    onClick={() => handleModuleClick(module)}
                  >
                    <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-gray-800">
                      {module.cover_image_url ? (
                        <img 
                          src={module.cover_image_url} 
                          alt={module.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                          <Play className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition-colors duration-300"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <h3 className="text-white font-medium mt-2 text-sm group-hover:text-gray-300 transition-colors line-clamp-2">
                      {module.title}
                    </h3>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Individual Lessons */}
          {publishedLessons.filter(l => !l.module_id).length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Aulas Avulsas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {publishedLessons.filter(l => !l.module_id).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="cursor-pointer group"
                    onClick={() => handleLessonClick(lesson)}
                  >
                    <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-gray-800">
                      <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-900 flex items-center justify-center">
                        <Play className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition-colors duration-300"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <h3 className="text-white font-medium mt-2 text-sm group-hover:text-gray-300 transition-colors line-clamp-2">
                      {lesson.title}
                    </h3>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {currentVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-4xl mx-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeVideo}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="bg-black rounded-lg overflow-hidden">
              <VideoPlayer src={currentVideo.lesson.video_url!} />
              <div className="p-4">
                <h3 className="text-xl font-bold text-white mb-2">{currentVideo.lesson.title}</h3>
                {currentVideo.lesson.description && (
                  <p className="text-gray-300 text-sm">{currentVideo.lesson.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}