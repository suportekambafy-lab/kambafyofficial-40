
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Mail, Calendar, MoreHorizontal, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Student {
  id: string;
  student_name: string;
  student_email: string;
  access_granted_at: string;
  created_at: string;
}

interface StudentsManagerProps {
  memberAreaId: string;
  memberAreaName?: string;
}

export default function StudentsManager({ memberAreaId, memberAreaName }: StudentsManagerProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Carregar estudantes da área de membros
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user || !memberAreaId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('member_area_students')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching students:', error);
          toast.error("Erro ao carregar estudantes");
        } else {
          setStudents(data || []);
        }
      } catch (error) {
        console.error('Exception fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, memberAreaId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !memberAreaId) return;

    setIsSubmitting(true);
    try {
      // 1. Primeiro, verificar se o usuário já existe consultando a tabela profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', formData.email)
        .single();
      
      let isNewAccount = false;
      let temporaryPassword = '';
      
      // 2. Se o usuário não existe, criar uma conta
      if (!existingProfile) {
        // Gerar senha temporária mais robusta (8 caracteres + 4 maiúsculos)
        temporaryPassword = Math.random().toString(36).slice(-8) + 
                           Math.random().toString(36).slice(-4).toUpperCase() +
                           Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        // Criar conta via edge function
        const { data: registrationData, error: registrationError } = await supabase.functions.invoke('add-member-area-student', {
          body: {
            customerEmail: formData.email,
            customerName: formData.name,
            temporaryPassword: temporaryPassword
          }
        });

        if (registrationError) {
          console.error('Error creating user account:', registrationError);
          // Continue mesmo se houver erro na criação da conta
        } else {
          isNewAccount = registrationData?.isNewAccount || false;
          console.log('User registration result:', registrationData);
        }
      }

      // 3. Adicionar estudante à área de membros
      const { error } = await supabase
        .from('member_area_students')
        .insert({
          member_area_id: memberAreaId,
          student_name: formData.name,
          student_email: formData.email
        });

      if (error) {
        console.error('Error adding student:', error);
        toast.error("Erro ao adicionar estudante");
        return;
      }

      // 4. Buscar dados da área de membros para o email
      const { data: memberAreaData, error: memberAreaError } = await supabase
        .from('member_areas')
        .select('name, url')
        .eq('id', memberAreaId)
        .single();

      if (memberAreaError) {
        console.error('Error fetching member area:', memberAreaError);
      }

      // 5. Buscar dados do vendedor
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (sellerError) {
        console.error('Error fetching seller data:', sellerError);
      }

      // 6. Enviar email de acesso
      if (memberAreaData) {
        // Usar a estrutura correta de URLs para áreas de membros
        const memberAreaUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
        
        const { error: emailError } = await supabase.functions.invoke('send-member-access-email', {
          body: {
            studentName: formData.name,
            studentEmail: formData.email,
            memberAreaName: memberAreaData.name,
            memberAreaUrl: memberAreaUrl,
            sellerName: sellerData?.full_name,
            isNewAccount: isNewAccount,
            temporaryPassword: isNewAccount ? temporaryPassword : undefined
          }
        });

        if (emailError) {
          console.error('Error sending access email:', emailError);
          toast.warning("Estudante adicionado, mas houve erro ao enviar email de acesso");
        }
      }

      toast.success(
        isNewAccount 
          ? "✅ Conta criada com sucesso! Email de acesso enviado com credenciais."
          : "✅ Estudante adicionado! Email de acesso enviado."
      );
      
      setFormData({ name: '', email: '' });
      setDialogOpen(false);
      
      // Recarregar lista de estudantes
      const { data } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .order('created_at', { ascending: false });
        
      if (data) {
        setStudents(data);
      }

    } catch (error) {
      console.error('Exception adding student:', error);
      toast.error("Erro inesperado ao adicionar estudante");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendAccess = async (student: Student) => {
    try {
      // 1. Verificar se o usuário já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', student.student_email)
        .single();
      
      let isNewAccount = false;
      let temporaryPassword = '';
      
      // 2. Se o usuário não existe, criar uma conta
      if (!existingProfile) {
        // Gerar senha temporária mais robusta (8 caracteres + 4 maiúsculos + 2 números)
        temporaryPassword = Math.random().toString(36).slice(-8) + 
                           Math.random().toString(36).slice(-4).toUpperCase() +
                           Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        // Criar conta via edge function
        const { data: registrationData, error: registrationError } = await supabase.functions.invoke('add-member-area-student', {
          body: {
            customerEmail: student.student_email,
            customerName: student.student_name,
            temporaryPassword: temporaryPassword
          }
        });

        if (registrationError) {
          console.error('Error creating user account:', registrationError);
          // Continue mesmo se houver erro na criação da conta
        } else {
          isNewAccount = registrationData?.isNewAccount || false;
          console.log('User registration result:', registrationData);
        }
      }

      // 3. Buscar dados da área de membros
      const { data: memberAreaData, error: memberAreaError } = await supabase
        .from('member_areas')
        .select('name, url')
        .eq('id', memberAreaId)
        .single();

      if (memberAreaError) {
        console.error('Error fetching member area:', memberAreaError);
        toast.error("Erro ao buscar dados da área de membros");
        return;
      }

      // 4. Buscar dados do vendedor
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      if (sellerError) {
        console.error('Error fetching seller data:', sellerError);
      }

      // 5. Enviar email de acesso
      const memberAreaUrl = `https://membros.kambafy.com/login/${memberAreaId}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-member-access-email', {
        body: {
          studentName: student.student_name,
          studentEmail: student.student_email,
          memberAreaName: memberAreaData.name,
          memberAreaUrl: memberAreaUrl,
          sellerName: sellerData?.full_name,
          isNewAccount: isNewAccount,
          temporaryPassword: isNewAccount ? temporaryPassword : undefined
        }
      });

      if (emailError) {
        console.error('Error sending access email:', emailError);
        toast.error("Erro ao reenviar email de acesso");
      } else {
        toast.success(
          isNewAccount 
            ? "Conta criada e email de acesso enviado com senha temporária!"
            : "Email de acesso reenviado com sucesso!"
        );
      }
    } catch (error) {
      console.error('Exception resending access:', error);
      toast.error("Erro inesperado ao reenviar acesso");
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Tem certeza que deseja remover este estudante?')) return;

    try {
      const { error } = await supabase
        .from('member_area_students')
        .delete()
        .eq('id', studentId);

      if (error) {
        console.error('Error removing student:', error);
        toast.error("Erro ao remover estudante");
      } else {
        toast.success("Estudante removido com sucesso");
        setStudents(prev => prev.filter(s => s.id !== studentId));
      }
    } catch (error) {
      console.error('Exception removing student:', error);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com busca e botão adicionar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estudantes</h2>
          {memberAreaName && (
            <p className="text-muted-foreground">Área: {memberAreaName}</p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Estudante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Estudante</DialogTitle>
              <DialogDescription>
                Adicione um novo estudante à área de membros
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-name">Nome</Label>
                <Input
                  id="student-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="student-email">Email</Label>
                <Input
                  id="student-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Adicionando..." : "Adicionar Estudante"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar estudantes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-sm text-gray-600">Total de Estudantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {students.filter(s => new Date(s.access_granted_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-sm text-gray-600">Novos (7 dias)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {students.filter(s => new Date(s.access_granted_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
            </div>
            <p className="text-sm text-gray-600">Novos (30 dias)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de estudantes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Estudantes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum estudante encontrado</p>
              {students.length === 0 && (
                <p className="text-sm mt-2">
                  Estudantes serão adicionados automaticamente quando comprarem cursos associados a esta área.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Acesso Liberado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell>{student.student_email}</TableCell>
                    <TableCell>
                      {new Date(student.access_granted_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => handleResendAccess(student)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Reenviar Acesso
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleRemoveStudent(student.id)}
                          >
                            Remover Estudante
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
