import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Users, BookOpen, CheckCircle, Clock, BarChart3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  id: string;
  student_name: string;
  student_email: string;
  access_granted_at: string;
  cohort_id?: string;
}

interface LessonProgress {
  id: string;
  lesson_id: string;
  user_email: string;
  progress_percentage: number;
  completed: boolean;
  last_watched_at: string;
  video_current_time: number | null;
}

interface Lesson {
  id: string;
  title: string;
  module_id: string | null;
  order_number: number;
  duration: number;
}

interface Module {
  id: string;
  title: string;
  order_number: number;
}

interface QuizResponse {
  id: string;
  quiz_id: string;
  student_email: string;
  score: number;
  total_questions: number;
  passed: boolean;
  completed_at: string;
}

interface StudentDetail {
  student: Student;
  lessonsCompleted: number;
  totalLessons: number;
  progressPercentage: number;
  lastActivity: string | null;
  moduleProgress: { moduleId: string; moduleName: string; completed: number; total: number }[];
  quizResults: QuizResponse[];
}

interface StudentProgressPanelProps {
  memberAreaId: string;
}

export default function StudentProgressPanel({ memberAreaId }: StudentProgressPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [allProgress, setAllProgress] = useState<LessonProgress[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberAreaId) return;
      
      setLoading(true);
      try {
        // Fetch students
        const { data: studentsData } = await supabase
          .from('member_area_students')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .neq('student_email', 'validar@kambafy.com')
          .order('created_at', { ascending: false });

        // Fetch lessons
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, title, module_id, order_number, duration')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        // Fetch modules
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id, title, order_number')
          .eq('member_area_id', memberAreaId)
          .eq('status', 'published')
          .order('order_number');

        // Fetch all progress for this member area
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('member_area_id', memberAreaId);

        // Fetch quiz responses
        const { data: quizData } = await supabase
          .from('member_area_quiz_responses')
          .select('*')
          .eq('member_area_id', memberAreaId);

        setStudents(studentsData || []);
        setLessons(lessonsData || []);
        setModules(modulesData || []);
        setAllProgress(progressData || []);
        setQuizResponses(quizData || []);
      } catch (error) {
        console.error('Error fetching progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberAreaId]);

  // Calculate student progress
  const studentProgressData = useMemo(() => {
    return students.map(student => {
      const normalizedEmail = student.student_email.toLowerCase().trim();
      const studentProgress = allProgress.filter(p => 
        p.user_email?.toLowerCase().trim() === normalizedEmail
      );

      const completedLessons = studentProgress.filter(p => p.completed).length;
      const progressPercentage = lessons.length > 0 
        ? Math.round((completedLessons / lessons.length) * 100) 
        : 0;

      const lastActivity = studentProgress.length > 0
        ? studentProgress.sort((a, b) => 
            new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()
          )[0]?.last_watched_at
        : null;

      const studentQuizzes = quizResponses.filter(q => 
        q.student_email?.toLowerCase().trim() === normalizedEmail
      );

      return {
        ...student,
        lessonsCompleted: completedLessons,
        totalLessons: lessons.length,
        progressPercentage,
        lastActivity,
        quizzesCompleted: studentQuizzes.length,
        avgQuizScore: studentQuizzes.length > 0
          ? Math.round(studentQuizzes.reduce((acc, q) => acc + (q.score / q.total_questions * 100), 0) / studentQuizzes.length)
          : 0
      };
    });
  }, [students, allProgress, lessons, quizResponses]);

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return studentProgressData;
    const term = searchTerm.toLowerCase();
    return studentProgressData.filter(s => 
      s.student_name.toLowerCase().includes(term) ||
      s.student_email.toLowerCase().includes(term)
    );
  }, [studentProgressData, searchTerm]);

  // Overall stats
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const avgProgress = studentProgressData.length > 0
      ? Math.round(studentProgressData.reduce((acc, s) => acc + s.progressPercentage, 0) / studentProgressData.length)
      : 0;
    const completedCount = studentProgressData.filter(s => s.progressPercentage === 100).length;
    const activeCount = studentProgressData.filter(s => {
      if (!s.lastActivity) return false;
      const lastActive = new Date(s.lastActivity);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastActive > weekAgo;
    }).length;

    return { totalStudents, avgProgress, completedCount, activeCount };
  }, [students, studentProgressData]);

  const openStudentDetail = (student: typeof studentProgressData[0]) => {
    const normalizedEmail = student.student_email.toLowerCase().trim();
    const studentProgress = allProgress.filter(p => 
      p.user_email?.toLowerCase().trim() === normalizedEmail
    );

    // Calculate module progress
    const moduleProgress = modules.map(mod => {
      const moduleLessons = lessons.filter(l => l.module_id === mod.id);
      const completedInModule = moduleLessons.filter(l => 
        studentProgress.some(p => p.lesson_id === l.id && p.completed)
      ).length;

      return {
        moduleId: mod.id,
        moduleName: mod.title,
        completed: completedInModule,
        total: moduleLessons.length
      };
    });

    // Add standalone lessons
    const standaloneLessons = lessons.filter(l => !l.module_id);
    if (standaloneLessons.length > 0) {
      const completedStandalone = standaloneLessons.filter(l =>
        studentProgress.some(p => p.lesson_id === l.id && p.completed)
      ).length;

      moduleProgress.push({
        moduleId: 'standalone',
        moduleName: 'Aulas Avulsas',
        completed: completedStandalone,
        total: standaloneLessons.length
      });
    }

    const studentQuizzes = quizResponses.filter(q => 
      q.student_email?.toLowerCase().trim() === normalizedEmail
    );

    setSelectedStudent({
      student: student,
      lessonsCompleted: student.lessonsCompleted,
      totalLessons: student.totalLessons,
      progressPercentage: student.progressPercentage,
      lastActivity: student.lastActivity,
      moduleProgress,
      quizResults: studentQuizzes
    });
    setDetailOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Curso Completo</p>
                <p className="text-2xl font-bold">{stats.completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar aluno por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Progresso Individual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Aulas Concluídas</TableHead>
                <TableHead>Quizzes</TableHead>
                <TableHead>Última Atividade</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-sm text-muted-foreground">{student.student_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <Progress value={student.progressPercentage} className="flex-1" />
                        <span className="text-sm font-medium w-12">{student.progressPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.lessonsCompleted === student.totalLessons ? "default" : "secondary"}>
                        {student.lessonsCompleted}/{student.totalLessons}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.quizzesCompleted > 0 ? (
                        <Badge variant="outline">
                          {student.quizzesCompleted} ({student.avgQuizScore}%)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(student.lastActivity)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openStudentDetail(student)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Progresso de {selectedStudent?.student.student_name}
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <Tabs defaultValue="progress" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">Progresso</TabsTrigger>
                <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              </TabsList>

              <TabsContent value="progress" className="space-y-4">
                {/* Overall Progress */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">Progresso Geral</span>
                      <span className="text-2xl font-bold">{selectedStudent.progressPercentage}%</span>
                    </div>
                    <Progress value={selectedStudent.progressPercentage} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedStudent.lessonsCompleted} de {selectedStudent.totalLessons} aulas concluídas
                    </p>
                  </CardContent>
                </Card>

                {/* Module Progress */}
                <div className="space-y-3">
                  <h4 className="font-medium">Progresso por Módulo</h4>
                  {selectedStudent.moduleProgress.map(mod => (
                    <div key={mod.moduleId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{mod.moduleName}</span>
                        <Badge variant={mod.completed === mod.total ? "default" : "outline"}>
                          {mod.completed}/{mod.total}
                        </Badge>
                      </div>
                      <Progress 
                        value={mod.total > 0 ? (mod.completed / mod.total) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>

                {/* Last Activity */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Última atividade:</span>
                  <span>{formatDate(selectedStudent.lastActivity)}</span>
                </div>
              </TabsContent>

              <TabsContent value="quizzes" className="space-y-4">
                {selectedStudent.quizResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum quiz respondido ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedStudent.quizResults.map(quiz => (
                      <Card key={quiz.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(quiz.completed_at)}
                              </p>
                              <p className="font-medium">
                                Pontuação: {quiz.score}/{quiz.total_questions}
                              </p>
                            </div>
                            <Badge variant={quiz.passed ? "default" : "destructive"}>
                              {Math.round((quiz.score / quiz.total_questions) * 100)}%
                              {quiz.passed ? " - Aprovado" : " - Reprovado"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
