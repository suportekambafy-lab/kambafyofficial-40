
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  cohort_id?: string;
}

interface StudentStats {
  total: number;
  last7Days: number;
  last30Days: number;
}

interface Cohort {
  id: string;
  name: string;
  status: string;
  current_students: number;
  max_students: number | null;
}

interface StudentsManagerProps {
  memberAreaId: string;
  memberAreaName?: string;
  externalDialogOpen?: boolean;
  onExternalDialogChange?: (open: boolean) => void;
}

export default function StudentsManager({ memberAreaId, memberAreaName, externalDialogOpen, onExternalDialogChange }: StudentsManagerProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentStats, setStudentStats] = useState<StudentStats>({ total: 0, last7Days: 0, last30Days: 0 });
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setDialogOpen = onExternalDialogChange || setInternalDialogOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cohortId: ''
  });
  const [changeCohortDialog, setChangeCohortDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newCohortId, setNewCohortId] = useState('');

  // Função para buscar todos os estudantes com paginação (bypass limite de 1000)
  const fetchAllStudents = async (memberAreaId: string): Promise<Student[]> => {
    const allStudents: Student[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching students page:', error);
        break;
      }

      if (data && data.length > 0) {
        allStudents.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return allStudents;
  };

  // Carregar estudantes e turmas da área de membros
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !memberAreaId) return;
      
      setLoading(true);
      try {
        // Buscar total de estudantes usando count (preciso para estatísticas)
        const { count: totalCount, error: countError } = await supabase
          .from('member_area_students')
          .select('*', { count: 'exact', head: true })
          .eq('member_area_id', memberAreaId)
          .neq('student_email', 'validar@kambafy.com');

        if (countError) {
          console.error('Error counting students:', countError);
        }

        // Buscar contagem dos últimos 7 dias
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: count7Days } = await supabase
          .from('member_area_students')
          .select('*', { count: 'exact', head: true })
          .eq('member_area_id', memberAreaId)
          .neq('student_email', 'validar@kambafy.com')
          .gte('access_granted_at', last7Days);

        // Buscar contagem dos últimos 30 dias
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: count30Days } = await supabase
          .from('member_area_students')
          .select('*', { count: 'exact', head: true })
          .eq('member_area_id', memberAreaId)
          .neq('student_email', 'validar@kambafy.com')
          .gte('access_granted_at', last30Days);

        setStudentStats({
          total: totalCount || 0,
          last7Days: count7Days || 0,
          last30Days: count30Days || 0
        });

        // Buscar todos os estudantes (com paginação para ultrapassar limite de 1000)
        const studentsData = await fetchAllStudents(memberAreaId);
        setStudents(studentsData);

        // Buscar turmas ativas
        const { data: cohortsData, error: cohortsError } = await supabase
          .from('member_area_cohorts')
          .select('id, name, status, current_students, max_students')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (cohortsError) {
          console.error('Error fetching cohorts:', cohortsError);
        } else {
          setCohorts(cohortsData || []);
        }
      } catch (error) {
        console.error('Exception fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, memberAreaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !memberAreaId) return;

    // Validar que uma turma foi selecionada se houver turmas disponíveis
    if (cohorts.length > 0 && !formData.cohortId) {
      toast.error("Por favor, selecione uma turma");
      return;
    }

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
          student_email: formData.email,
          cohort_id: formData.cohortId
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
        
        console.log('📧 Sending access email with data:', {
          studentName: formData.name,
          studentEmail: formData.email,
          memberAreaName: memberAreaData.name,
          memberAreaUrl: memberAreaUrl,
          sellerName: sellerData?.full_name,
          isNewAccount: isNewAccount,
          hasTemporaryPassword: !!temporaryPassword
        });
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-member-access-email', {
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
          console.error('❌ Error sending access email:', emailError);
          console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
          toast.warning("Estudante adicionado, mas houve erro ao enviar email de acesso");
        } else {
          console.log('✅ Access email sent successfully:', emailData);
        }
      }

      // Incrementar contador da turma se selecionada
      if (formData.cohortId) {
        // Buscar contador atual
        const { data: cohortData } = await supabase
          .from('member_area_cohorts')
          .select('current_students')
          .eq('id', formData.cohortId)
          .single();

        if (cohortData) {
          // Incrementar contador
          await supabase
            .from('member_area_cohorts')
            .update({ current_students: cohortData.current_students + 1 })
            .eq('id', formData.cohortId);

          // Atualizar lista de turmas localmente
          setCohorts(prev => prev.map(c => 
            c.id === formData.cohortId 
              ? { ...c, current_students: c.current_students + 1 }
              : c
          ));
        }
      }

      toast.success(
        isNewAccount 
          ? "✅ Conta criada com sucesso! Email de acesso enviado com credenciais."
          : "✅ Estudante adicionado! Email de acesso enviado."
      );
      
      setFormData({ name: '', email: '', cohortId: '' });
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
      
      console.log('📧 Resending access email with data:', {
        studentName: student.student_name,
        studentEmail: student.student_email,
        memberAreaName: memberAreaData.name,
        memberAreaUrl: memberAreaUrl,
        sellerName: sellerData?.full_name,
        isNewAccount: isNewAccount,
        hasTemporaryPassword: !!temporaryPassword
      });
      
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-member-access-email', {
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
        console.error('❌ Error sending access email:', emailError);
        console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
        toast.error("Erro ao reenviar email de acesso");
      } else {
        console.log('✅ Access email sent successfully:', emailData);
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

  const handleChangeCohort = async () => {
    if (!selectedStudent || !newCohortId) return;

    try {
      const oldCohortId = selectedStudent.cohort_id;

      // Atualizar turma do aluno
      const { error: updateError } = await supabase
        .from('member_area_students')
        .update({ cohort_id: newCohortId })
        .eq('id', selectedStudent.id);

      if (updateError) {
        console.error('Error updating student cohort:', updateError);
        toast.error("Erro ao alterar turma do aluno");
        return;
      }

      // Decrementar contador da turma antiga (se existir)
      if (oldCohortId) {
        const { data: oldCohortData } = await supabase
          .from('member_area_cohorts')
          .select('current_students')
          .eq('id', oldCohortId)
          .single();

        if (oldCohortData) {
          await supabase
            .from('member_area_cohorts')
            .update({ current_students: Math.max(0, oldCohortData.current_students - 1) })
            .eq('id', oldCohortId);
        }
      }

      // Incrementar contador da nova turma
      const { data: newCohortData } = await supabase
        .from('member_area_cohorts')
        .select('current_students')
        .eq('id', newCohortId)
        .single();

      if (newCohortData) {
        await supabase
          .from('member_area_cohorts')
          .update({ current_students: newCohortData.current_students + 1 })
          .eq('id', newCohortId);
      }

      // Atualizar estados locais
      setStudents(prev => prev.map(s => 
        s.id === selectedStudent.id 
          ? { ...s, cohort_id: newCohortId }
          : s
      ));

      setCohorts(prev => prev.map(c => {
        if (c.id === oldCohortId) {
          return { ...c, current_students: Math.max(0, c.current_students - 1) };
        }
        if (c.id === newCohortId) {
          return { ...c, current_students: c.current_students + 1 };
        }
        return c;
      }));

      toast.success("Turma alterada com sucesso!");
      setChangeCohortDialog(false);
      setSelectedStudent(null);
      setNewCohortId('');
    } catch (error) {
      console.error('Exception changing cohort:', error);
      toast.error("Erro inesperado ao alterar turma");
    }
  };

  const filteredStudents = students.filter(student =>
    // Filtrar email de validação da Kambafy
    student.student_email !== 'validar@kambafy.com' &&
    (student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header com busca - botão movido para dropdown menu da página principal */}
      <div className="flex flex-col gap-4 max-w-full">
        <div>
          <h2 className="text-2xl font-bold">Estudantes</h2>
          {memberAreaName && (
            <p className="text-muted-foreground">Área: {memberAreaName}</p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

              {cohorts.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="student-cohort">Turma *</Label>
                  <Select
                    value={formData.cohortId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cohortId: value }))}
                    required
                  >
                    <SelectTrigger id="student-cohort">
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts.map((cohort) => (
                        <SelectItem 
                          key={cohort.id} 
                          value={cohort.id}
                          disabled={cohort.max_students !== null && cohort.current_students >= cohort.max_students}
                        >
                          {cohort.name}
                          {cohort.max_students !== null && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({cohort.current_students}/{cohort.max_students})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Escolha uma turma para adicionar o aluno
                  </p>
                </div>
              )}
              
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-full">
        <Card className="w-full max-w-full">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {studentStats.total}
            </div>
            <p className="text-sm text-gray-600">Total de Estudantes</p>
          </CardContent>
        </Card>
        <Card className="w-full max-w-full">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {studentStats.last7Days}
            </div>
            <p className="text-sm text-gray-600">Novos (7 dias)</p>
          </CardContent>
        </Card>
        <Card className="w-full max-w-full">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {studentStats.last30Days}
            </div>
            <p className="text-sm text-gray-600">Novos (30 dias)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de estudantes */}
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Lista de Estudantes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4">
              <p>Nenhum estudante encontrado</p>
              {students.length === 0 && (
                <p className="text-sm mt-2">
                  Estudantes serão adicionados automaticamente quando comprarem cursos associados a esta área.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Layout Desktop - Tabela */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nome</TableHead>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      <TableHead className="whitespace-nowrap">Turma</TableHead>
                      <TableHead className="whitespace-nowrap">Acesso Liberado</TableHead>
                      <TableHead className="whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const cohort = cohorts.find(c => c.id === student.cohort_id);
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium whitespace-nowrap">{student.student_name}</TableCell>
                          <TableCell className="whitespace-nowrap">{student.student_email}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {cohort ? (
                              <span className="text-sm font-medium">
                                {cohort.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sem turma</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(student.access_granted_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setNewCohortId(student.cohort_id || '');
                                    setChangeCohortDialog(true);
                                  }}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Alterar Turma
                                </DropdownMenuItem>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Layout Mobile - Cards Empilhados */}
              <div className="md:hidden space-y-3 p-4">
                {filteredStudents.map((student) => {
                  const cohort = cohorts.find(c => c.id === student.cohort_id);
                  return (
                    <div key={student.id} className="border rounded-lg p-4 space-y-3 bg-card">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{student.student_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.student_email}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedStudent(student);
                                setNewCohortId(student.cohort_id || '');
                                setChangeCohortDialog(true);
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Alterar Turma
                            </DropdownMenuItem>
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
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div className="flex-1">
                          <p className="text-muted-foreground">Turma</p>
                          <p className="font-medium mt-0.5">
                            {cohort ? cohort.name : "Sem turma"}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-muted-foreground">Acesso</p>
                          <p className="font-medium mt-0.5">
                            {new Date(student.access_granted_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para alterar turma */}
      <Dialog open={changeCohortDialog} onOpenChange={setChangeCohortDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alterar Turma</DialogTitle>
            <DialogDescription>
              Altere a turma de {selectedStudent?.student_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-cohort">Nova Turma</Label>
              <Select
                value={newCohortId}
                onValueChange={setNewCohortId}
              >
                <SelectTrigger id="new-cohort">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort) => (
                    <SelectItem 
                      key={cohort.id} 
                      value={cohort.id}
                      disabled={
                        cohort.id === selectedStudent?.cohort_id ||
                        (cohort.max_students !== null && cohort.current_students >= cohort.max_students)
                      }
                    >
                      {cohort.name}
                      {cohort.max_students !== null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({cohort.current_students}/{cohort.max_students})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setChangeCohortDialog(false);
                setSelectedStudent(null);
                setNewCohortId('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleChangeCohort}
              disabled={!newCohortId || newCohortId === selectedStudent?.cohort_id}
            >
              Alterar Turma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
