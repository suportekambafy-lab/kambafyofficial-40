import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus, Trash2, ArrowUp, ArrowDown, Eye, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'single-choice' | 'text' | 'email' | 'phone';
  title: string;
  description?: string;
  options?: string[];
  required: boolean;
  order: number;
}

interface QuizSettings {
  title: string;
  description: string;
  resultMessage: string;
  leadCapture: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  collectName: boolean;
  redirectUrl?: string;
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
}

interface QuizBuilderProps {
  productId: string;
  onSaveSuccess: () => void;
}

export function QuizBuilder({ productId, onSaveSuccess }: QuizBuilderProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('builder');
  const [loading, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<QuizSettings>({
    title: 'Descubra o Produto Ideal para Você',
    description: 'Responda algumas perguntas e encontre a solução perfeita.',
    resultMessage: 'Parabéns! Baseado nas suas respostas, este produto é perfeito para você.',
    leadCapture: true,
    collectEmail: true,
    collectPhone: false,
    collectName: true,
    backgroundColor: '#ffffff',
    textColor: '#000000',
    primaryColor: '#3b82f6'
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      type: 'single-choice',
      title: 'Qual é o seu principal objetivo?',
      description: 'Selecione a opção que melhor descreve seu objetivo',
      options: ['Aprender algo novo', 'Resolver um problema', 'Melhorar performance', 'Outros'],
      required: true,
      order: 1
    }
  ]);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Date.now().toString(),
      type: 'single-choice',
      title: 'Nova Pergunta',
      description: '',
      options: ['Opção 1', 'Opção 2'],
      required: false,
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (id: string) => {
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
    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), `Opção ${(questions.find(q => q.id === questionId)?.options?.length || 0) + 1}`]
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const saveQuiz = async () => {
    setSaving(true);
    try {
      const quizData = {
        product_id: productId,
        settings,
        questions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to Supabase (we'll need to create this table)
      const { error } = await supabase
        .from('quiz_configurations')
        .upsert(quizData, { onConflict: 'product_id' });

      if (error) throw error;

      toast({
        title: "Quiz salvo com sucesso!",
        description: "Seu quiz está pronto para ser usado.",
      });

      onSaveSuccess();
    } catch (error) {
      console.error('Erro ao salvar quiz:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o quiz. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const QuestionEditor = ({ question }: { question: QuizQuestion }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">#{question.order}</Badge>
            <Badge variant={question.required ? "default" : "secondary"}>
              {question.required ? "Obrigatória" : "Opcional"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveQuestion(question.id, 'up')}
              disabled={question.order === 1}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveQuestion(question.id, 'down')}
              disabled={question.order === questions.length}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteQuestion(question.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label>Tipo de Pergunta</Label>
            <Select 
              value={question.type} 
              onValueChange={(value) => updateQuestion(question.id, { type: value as QuizQuestion['type'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-choice">Escolha Única</SelectItem>
                <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                <SelectItem value="text">Texto Livre</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título da Pergunta</Label>
            <Input
              value={question.title}
              onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
              placeholder="Digite a pergunta..."
            />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={question.description || ''}
              onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
              placeholder="Adicione uma descrição para ajudar o usuário..."
              rows={2}
            />
          </div>

          {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Opções de Resposta</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(question.id)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Opção
                </Button>
              </div>
              <div className="space-y-2">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(question.id, index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                    />
                    {question.options!.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(question.id, index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={question.required}
              onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
            />
            <Label>Pergunta obrigatória</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Quiz Builder</h3>
          <p className="text-muted-foreground">
            Crie um quiz interativo para qualificar leads e aumentar conversões
          </p>
        </div>
        <Button onClick={saveQuiz} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Quiz'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Construtor</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Perguntas do Quiz</h4>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </div>

          <div className="space-y-4">
            {questions
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <QuestionEditor key={question.id} question={question} />
              ))}
          </div>

          {questions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma pergunta adicionada ainda.</p>
              <p className="text-sm">Clique em "Adicionar Pergunta" para começar.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título do Quiz</Label>
                <Input
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  placeholder="Digite o título do quiz..."
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Descreva o propósito do quiz..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Mensagem de Resultado</Label>
                <Textarea
                  value={settings.resultMessage}
                  onChange={(e) => setSettings({ ...settings, resultMessage: e.target.value })}
                  placeholder="Mensagem exibida após completar o quiz..."
                  rows={3}
                />
              </div>

              <div>
                <Label>URL de Redirecionamento (opcional)</Label>
                <Input
                  value={settings.redirectUrl || ''}
                  onChange={(e) => setSettings({ ...settings, redirectUrl: e.target.value })}
                  placeholder="https://exemplo.com/obrigado"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Captura de Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.leadCapture}
                  onCheckedChange={(checked) => setSettings({ ...settings, leadCapture: checked })}
                />
                <Label>Ativar captura de leads</Label>
              </div>

              {settings.leadCapture && (
                <div className="space-y-3 ml-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.collectName}
                      onCheckedChange={(checked) => setSettings({ ...settings, collectName: checked })}
                    />
                    <Label>Coletar nome</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.collectEmail}
                      onCheckedChange={(checked) => setSettings({ ...settings, collectEmail: checked })}
                    />
                    <Label>Coletar email</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.collectPhone}
                      onCheckedChange={(checked) => setSettings({ ...settings, collectPhone: checked })}
                    />
                    <Label>Coletar telefone</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalização Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Cor de Fundo</Label>
                  <Input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Cor do Texto</Label>
                  <Input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Cor Primária</Label>
                  <Input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="border rounded-lg p-6" style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}>
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-4">{settings.title}</h2>
                <p className="text-lg opacity-80">{settings.description}</p>
              </div>

              {questions.length > 0 && (
                <div className="space-y-6">
                  {questions.slice(0, 1).map((question) => (
                    <Card key={question.id} className="border-2" style={{ borderColor: settings.primaryColor }}>
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg mb-2">{question.title}</h3>
                          {question.description && (
                            <p className="text-sm opacity-70">{question.description}</p>
                          )}
                        </div>

                        {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
                          <div className="space-y-2">
                            {question.options?.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <input
                                  type={question.type === 'single-choice' ? 'radio' : 'checkbox'}
                                  name={`question-${question.id}`}
                                  className="w-4 h-4"
                                  style={{ accentColor: settings.primaryColor }}
                                />
                                <label className="text-sm">{option}</label>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'text' && (
                          <textarea
                            className="w-full p-3 border rounded-md"
                            placeholder="Digite sua resposta..."
                            rows={3}
                          />
                        )}

                        {question.type === 'email' && (
                          <input
                            type="email"
                            className="w-full p-3 border rounded-md"
                            placeholder="Digite seu email..."
                          />
                        )}

                        {question.type === 'phone' && (
                          <input
                            type="tel"
                            className="w-full p-3 border rounded-md"
                            placeholder="Digite seu telefone..."
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {questions.length > 1 && (
                    <div className="text-center text-sm opacity-60">
                      ... e mais {questions.length - 1} pergunta(s)
                    </div>
                  )}

                  <div className="text-center">
                    <Button 
                      style={{ backgroundColor: settings.primaryColor, color: '#ffffff' }}
                      className="px-8 py-3"
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}