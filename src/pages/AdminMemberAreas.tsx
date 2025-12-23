import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  BookOpen, 
  Users, 
  Eye, 
  ExternalLink,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

interface MemberArea {
  id: string;
  name: string;
  description: string | null;
  url: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  user_id: string;
  owner_email?: string;
  owner_name?: string;
  students_count?: number;
  lessons_count?: number;
  modules_count?: number;
}

export default function AdminMemberAreas() {
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMemberAreas();
  }, []);

  const loadMemberAreas = async () => {
    try {
      setIsLoading(true);

      // Buscar todas as áreas de membros
      const { data: areas, error } = await supabase
        .from('member_areas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar áreas de membros:', error);
        toast.error('Erro ao carregar áreas de membros');
        return;
      }

      // Buscar perfis e contagens para cada área
      const areasWithCounts = await Promise.all(
        (areas || []).map(async (area: any) => {
          // Buscar perfil do dono
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', area.user_id)
            .maybeSingle();

          // Contar estudantes
          const { count: studentsCount } = await supabase
            .from('member_area_students')
            .select('*', { count: 'exact', head: true })
            .eq('member_area_id', area.id);

          // Contar módulos
          const { count: modulesCount } = await supabase
            .from('modules')
            .select('*', { count: 'exact', head: true })
            .eq('member_area_id', area.id);

          // Contar aulas
          const { count: lessonsCount } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('member_area_id', area.id);

          return {
            ...area,
            owner_email: profile?.email,
            owner_name: profile?.full_name,
            students_count: studentsCount || 0,
            modules_count: modulesCount || 0,
            lessons_count: lessonsCount || 0,
          };
        })
      );

      setMemberAreas(areasWithCounts);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro ao carregar áreas de membros');
    } finally {
      setIsLoading(false);
    }
  };

  const openMemberArea = (memberAreaId: string, memberAreaName: string) => {
    // Marcar acesso como admin no localStorage para bypass de login
    const adminAccessKey = `admin_member_area_access_${memberAreaId}`;
    localStorage.setItem(adminAccessKey, JSON.stringify({
      accessedAt: new Date().toISOString(),
      isAdmin: true
    }));

    // Abrir área de membros em nova aba
    const url = `/members/area/${memberAreaId}?admin_access=true`;
    window.open(url, '_blank');
    
    toast.success(`Abrindo área: ${memberAreaName}`);
  };

  const filteredAreas = memberAreas.filter(area => {
    const searchLower = searchTerm.toLowerCase();
    return (
      area.name.toLowerCase().includes(searchLower) ||
      area.owner_email?.toLowerCase().includes(searchLower) ||
      area.owner_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout
      title="Áreas de Membros"
      description="Gerencie e visualize todas as áreas de membros da plataforma"
    >
      <div className="space-y-6">
        {/* Header com busca */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email do dono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-sm">
            {filteredAreas.length} áreas encontradas
          </Badge>
        </div>

        {/* Lista de áreas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAreas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma área encontrada com esse termo' : 'Nenhuma área de membros cadastrada'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map((area) => (
              <Card key={area.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {area.logo_url ? (
                        <img 
                          src={area.logo_url} 
                          alt={area.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: area.primary_color || '#6366f1' }}
                        >
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base line-clamp-1">
                          {area.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {area.owner_name || area.owner_email || 'Proprietário desconhecido'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{area.students_count} alunos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{area.modules_count} módulos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{area.lessons_count} aulas</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => openMemberArea(area.id, area.name)}
                    className="w-full"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Acessar Área
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
