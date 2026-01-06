import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, BookOpen, HelpCircle, Edit2, Eye, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface QuizQuestion {
  id: string;
  type: 'single-choice' | 'multiple-choice';
  question: string;
  options: string[];
  correctAnswers: number[];
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  lesson_id: string | null;
  module_id: string | null;
  passing_score: number;
  show_correct_answers: boolean;
  allow_retake: boolean;
  max_attempts: number | null;
  is_active: boolean;
  questions: QuizQuestion[];
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  module_id: string | null;
}

interface Module {
  id: string;
  title: string;
}

interface QuizManagerProps {
  memberAreaId: string;
}

export default function QuizManager({ memberAreaId }: QuizManagerProps) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetType: 'lesson' as 'lesson' | 'module',
    targetId: '',
    passingScore: 70,
    showCorrectAnswers: true,
    allowRetake: true,
    maxAttempts: null as number | null,
    isActive: true
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    fetchData();
  }, [memberAreaId]);

  const fetchData = async () => {
    if (!memberAreaId) return;
    
    setLoading(true);
    try {
      // Fetch quizzes
      const { data: quizzesData } = await supabase
        .from('member_area_quizzes')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .order('created_at', { ascending: false });

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, module_id')
        .eq('member_area_id', memberAreaId)
        .eq('status', 'published')
        .order('order_number');

      // Fetch modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('id, title')
        .eq('member_area_id', memberAreaId)
        .eq('status', 'published')
        .order('order_number');

      setQuizzes((quizzesData || []).map(q => ({
        ...q,
        questions: (q.questions as unknown as QuizQuestion[]) || []
      })));
      setLessons(lessonsData || []);
      setModules(modulesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openNewQuiz = () => {
    setEditingQuiz(null);
    setFormData({
      title: '',
      description: '',
      targetType: 'lesson',
      targetId: '',
      passingScore: 70,
      showCorrectAnswers: true,
      allowRetake: true,
      maxAttempts: null,
      isActive: true
    });
    setQuestions([{
      id: Date.now().toString(),
      type: 'single-choice',
      question: '',
      options: ['', ''],
      correctAnswers: [0],
      explanation: ''
    }]);
    setDialogOpen(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      description: quiz.description || '',
      targetType: quiz.lesson_id ? 'lesson' : 'module',
      targetId: quiz.lesson_id || quiz.module_id || '',
      passingScore: quiz.passing_score,
      showCorrectAnswers: quiz.show_correct_answers,
      allowRetake: quiz.allow_retake,
      maxAttempts: quiz.max_attempts,
      isActive: quiz.is_active
    });
    setQuestions(quiz.questions.length > 0 ? quiz.questions : [{
      id: Date.now().toString(),
      type: 'single-choice',
      question: '',
      options: ['', ''],
      correctAnswers: [0],
      explanation: ''
    }]);
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(),
      type: 'single-choice',
      question: '',
      options: ['', ''],
      correctAnswers: [0],
      explanation: ''
    }]);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      toast.error("O quiz precisa ter pelo menos uma pergunta");
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === id);
    if (direction === 'up' && index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
      setQuestions(newQuestions);
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options.length < 6) {
      updateQuestion(questionId, { options: [...question.options, ''] });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const newOptions = [...question.options];
      newOptions[index] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      const newCorrectAnswers = question.correctAnswers
        .filter(a => a !== index)
        .map(a => a > index ? a - 1 : a);
      updateQuestion(questionId, { 
        options: newOptions,
        correctAnswers: newCorrectAnswers.length > 0 ? newCorrectAnswers : [0]
      });
    }
  };

  const toggleCorrectAnswer = (questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    if (question.type === 'single-choice') {
      updateQuestion(questionId, { correctAnswers: [index] });
    } else {
      const isSelected = question.correctAnswers.includes(index);
      if (isSelected && question.correctAnswers.length === 1) {
        toast.error("Pelo menos uma resposta deve ser correta");
        return;
      }
      const newCorrectAnswers = isSelected
        ? question.correctAnswers.filter(a => a !== index)
        : [...question.correctAnswers, index].sort((a, b) => a - b);
      updateQuestion(questionId, { correctAnswers: newCorrectAnswers });
    }
  };

  const saveQuiz = async () => {
    if (!user || !memberAreaId) return;

    // Validate
    if (!formData.title.trim()) {
      toast.error("Digite um título para o quiz");
      return;
    }
    if (!formData.targetId) {
      toast.error(`Selecione ${formData.targetType === 'lesson' ? 'uma aula' : 'um módulo'}`);
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        toast.error("Todas as perguntas devem ter um texto");
        return;
      }
      if (q.options.some(o => !o.trim())) {
        toast.error("Todas as opções devem ser preenchidas");
        return;
      }
    }

    setSaving(true);
    try {
      const quizData = {
        member_area_id: memberAreaId,
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        lesson_id: formData.targetType === 'lesson' ? formData.targetId : null,
        module_id: formData.targetType === 'module' ? formData.targetId : null,
        passing_score: formData.passingScore,
        show_correct_answers: formData.showCorrectAnswers,
        allow_retake: formData.allowRetake,
        max_attempts: formData.maxAttempts,
        is_active: formData.isActive,
        questions: questions as unknown as import('@/integrations/supabase/types').Json
      };

      if (editingQuiz) {
        const { error } = await supabase
          .from('member_area_quizzes')
          .update(quizData)
          .eq('id', editingQuiz.id);

        if (error) throw error;
        toast.success("Quiz atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('member_area_quizzes')
          .insert(quizData);

        if (error) throw error;
        toast.success("Quiz criado com sucesso!");
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast.error("Erro ao salvar quiz");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;

    try {
      const { error } = await supabase
        .from('member_area_quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
      toast.success("Quiz excluído com sucesso!");
      fetchData();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error("Erro ao excluir quiz");
    }
  };

  const getTargetName = (quiz: Quiz) => {
    if (quiz.lesson_id) {
      const lesson = lessons.find(l => l.id === quiz.lesson_id);
      return lesson ? `Aula: ${lesson.title}` : 'Aula não encontrada';
    }
    if (quiz.module_id) {
      const module = modules.find(m => m.id === quiz.module_id);
      return module ? `Módulo: ${module.title}` : 'Módulo não encontrado';
    }
    return 'Sem destino';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quizzes
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie quizzes para validar o aprendizado dos alunos
          </p>
        </div>
        <Button onClick={openNewQuiz}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Quiz
        </Button>
      </div>

      {/* Quizzes List */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum quiz criado ainda</p>
            <Button variant="outline" className="mt-4" onClick={openNewQuiz}>
              Criar Primeiro Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map(quiz => (
            <Card key={quiz.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{quiz.title}</h4>
                    <Badge variant={quiz.is_active ? "default" : "secondary"}>
                      {quiz.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTargetName(quiz)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quiz.questions.length} pergunta{quiz.questions.length !== 1 ? 's' : ''} • Nota mínima: {quiz.passing_score}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditQuiz(quiz)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuiz(quiz.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuiz ? 'Editar Quiz' : 'Novo Quiz'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="settings" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Configurações</TabsTrigger>
              <TabsTrigger value="questions">Perguntas ({questions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div>
                  <Label>Título do Quiz *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Quiz de revisão do módulo 1"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o propósito deste quiz..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Destino</Label>
                    <Select 
                      value={formData.targetType} 
                      onValueChange={(v: 'lesson' | 'module') => setFormData({ ...formData, targetType: v, targetId: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lesson">Aula</SelectItem>
                        <SelectItem value="module">Módulo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{formData.targetType === 'lesson' ? 'Aula' : 'Módulo'} *</Label>
                    <Select 
                      value={formData.targetId} 
                      onValueChange={(v) => setFormData({ ...formData, targetId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.targetType === 'lesson' ? (
                          lessons.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))
                        ) : (
                          modules.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Nota Mínima para Aprovação (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Mostrar respostas corretas após conclusão</Label>
                    <Switch
                      checked={formData.showCorrectAnswers}
                      onCheckedChange={(v) => setFormData({ ...formData, showCorrectAnswers: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Permitir refazer o quiz</Label>
                    <Switch
                      checked={formData.allowRetake}
                      onCheckedChange={(v) => setFormData({ ...formData, allowRetake: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Quiz ativo</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pergunta
                </Button>
              </div>

              {questions.map((question, qIndex) => (
                <Card key={question.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Pergunta {qIndex + 1}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestion(question.id, 'up')}
                          disabled={qIndex === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveQuestion(question.id, 'down')}
                          disabled={qIndex === questions.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={question.type}
                        onValueChange={(v: 'single-choice' | 'multiple-choice') => 
                          updateQuestion(question.id, { 
                            type: v,
                            correctAnswers: v === 'single-choice' ? [question.correctAnswers[0] || 0] : question.correctAnswers
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single-choice">Escolha Única</SelectItem>
                          <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Pergunta *</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder="Digite a pergunta..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Opções (clique para marcar como correta)</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addOption(question.id)}
                          disabled={question.options.length >= 6}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Opção
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant={question.correctAnswers.includes(oIndex) ? "default" : "outline"}
                              size="icon"
                              className="shrink-0"
                              onClick={() => toggleCorrectAnswer(question.id, oIndex)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Input
                              value={option}
                              onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                              placeholder={`Opção ${oIndex + 1}`}
                            />
                            {question.options.length > 2 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(question.id, oIndex)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {question.type === 'single-choice' 
                          ? 'Clique no ícone para marcar a resposta correta'
                          : 'Clique nos ícones para marcar as respostas corretas'}
                      </p>
                    </div>

                    <div>
                      <Label>Explicação (opcional)</Label>
                      <Textarea
                        value={question.explanation || ''}
                        onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                        placeholder="Explicação mostrada após responder..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveQuiz} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
