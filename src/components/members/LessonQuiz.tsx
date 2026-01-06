import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, HelpCircle, RotateCcw, ArrowRight, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  passing_score: number;
  show_correct_answers: boolean;
  allow_retake: boolean;
  max_attempts: number | null;
  questions: QuizQuestion[];
}

interface QuizResponse {
  questionId: string;
  selectedAnswers: number[];
  isCorrect: boolean;
}

interface LessonQuizProps {
  lessonId?: string;
  moduleId?: string;
  memberAreaId: string;
  studentEmail: string;
  studentName?: string;
  onComplete?: (passed: boolean, score: number) => void;
}

export default function LessonQuiz({ 
  lessonId, 
  moduleId, 
  memberAreaId, 
  studentEmail, 
  studentName,
  onComplete 
}: LessonQuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Map<string, number[]>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResponse[]>([]);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [previousAttempts, setPreviousAttempts] = useState(0);
  const [startTime] = useState(new Date());

  useEffect(() => {
    fetchQuiz();
  }, [lessonId, moduleId, memberAreaId]);

  const fetchQuiz = async () => {
    if (!memberAreaId || (!lessonId && !moduleId)) {
      setLoading(false);
      return;
    }

    try {
      // Build query based on lesson or module
      let query = supabase
        .from('member_area_quizzes')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('is_active', true);

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      } else if (moduleId) {
        query = query.eq('module_id', moduleId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching quiz:', error);
      }

      if (data) {
        setQuiz({
          ...data,
          questions: (data.questions as unknown as QuizQuestion[]) || []
        });

        // Check previous attempts
        const { data: attempts } = await supabase
          .from('member_area_quiz_responses')
          .select('attempt_number')
          .eq('quiz_id', data.id)
          .eq('student_email', studentEmail.toLowerCase())
          .order('attempt_number', { ascending: false })
          .limit(1);

        if (attempts && attempts.length > 0) {
          setPreviousAttempts(attempts[0].attempt_number);
          setAttemptNumber(attempts[0].attempt_number + 1);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleChoice = (questionId: string, optionIndex: number) => {
    const newResponses = new Map(responses);
    newResponses.set(questionId, [optionIndex]);
    setResponses(newResponses);
  };

  const handleMultipleChoice = (questionId: string, optionIndex: number, checked: boolean) => {
    const newResponses = new Map(responses);
    const current = newResponses.get(questionId) || [];
    
    if (checked) {
      newResponses.set(questionId, [...current, optionIndex].sort((a, b) => a - b));
    } else {
      newResponses.set(questionId, current.filter(i => i !== optionIndex));
    }
    
    setResponses(newResponses);
  };

  const submitQuiz = async () => {
    if (!quiz) return;

    // Calculate results
    const quizResults: QuizResponse[] = quiz.questions.map(question => {
      const selectedAnswers = responses.get(question.id) || [];
      const isCorrect = 
        selectedAnswers.length === question.correctAnswers.length &&
        selectedAnswers.every(a => question.correctAnswers.includes(a));

      return {
        questionId: question.id,
        selectedAnswers,
        isCorrect
      };
    });

    const correctCount = quizResults.filter(r => r.isCorrect).length;
    const totalQuestions = quiz.questions.length;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const didPass = scorePercent >= quiz.passing_score;

    setResults(quizResults);
    setScore(scorePercent);
    setPassed(didPass);
    setSubmitted(true);

    // Save to database
    try {
      const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

      await supabase.from('member_area_quiz_responses').insert([{
        quiz_id: quiz.id,
        member_area_id: memberAreaId,
        student_email: studentEmail.toLowerCase(),
        student_name: studentName,
        responses: quizResults as unknown as import('@/integrations/supabase/types').Json,
        score: correctCount,
        total_questions: totalQuestions,
        passed: didPass,
        attempt_number: attemptNumber,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpent
      }]);

      onComplete?.(didPass, scorePercent);
    } catch (error) {
      console.error('Error saving quiz response:', error);
    }
  };

  const retakeQuiz = () => {
    if (quiz?.max_attempts && attemptNumber >= quiz.max_attempts) {
      toast.error("Número máximo de tentativas atingido");
      return;
    }
    
    setResponses(new Map());
    setSubmitted(false);
    setResults([]);
    setCurrentQuestion(0);
    setAttemptNumber(prev => prev + 1);
  };

  const nextQuestion = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return null;
  }

  // Check if max attempts reached
  if (!quiz.allow_retake && previousAttempts > 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <HelpCircle className="h-5 w-5 mr-2" />
          Quiz já foi respondido
        </CardContent>
      </Card>
    );
  }

  if (quiz.max_attempts && previousAttempts >= quiz.max_attempts) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <HelpCircle className="h-5 w-5 mr-2" />
          Número máximo de tentativas atingido
        </CardContent>
      </Card>
    );
  }

  // Results view
  if (submitted) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {passed ? (
              <Trophy className="h-6 w-6 text-yellow-500" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
            Resultado do Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">{score}%</div>
            <Badge variant={passed ? "default" : "destructive"} className="text-lg px-4 py-1">
              {passed ? "Aprovado!" : "Tente Novamente"}
            </Badge>
            <p className="text-muted-foreground mt-2">
              {results.filter(r => r.isCorrect).length} de {quiz.questions.length} corretas
              {quiz.passing_score > 0 && ` (mínimo: ${quiz.passing_score}%)`}
            </p>
          </div>

          {/* Show answers if enabled */}
          {quiz.show_correct_answers && (
            <div className="space-y-4 mt-6">
              <h4 className="font-medium">Revisão das Respostas</h4>
              {quiz.questions.map((question, index) => {
                const result = results.find(r => r.questionId === question.id);
                return (
                  <Card key={question.id} className={result?.isCorrect ? "border-green-500/50" : "border-destructive/50"}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2 mb-3">
                        {result?.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        )}
                        <p className="font-medium">{index + 1}. {question.question}</p>
                      </div>
                      <div className="ml-7 space-y-1">
                        {question.options.map((option, oIndex) => {
                          const isCorrect = question.correctAnswers.includes(oIndex);
                          const wasSelected = result?.selectedAnswers.includes(oIndex);
                          return (
                            <div 
                              key={oIndex}
                              className={`text-sm py-1 px-2 rounded ${
                                isCorrect 
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                                  : wasSelected 
                                    ? 'bg-destructive/10 text-destructive line-through' 
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {option} {isCorrect && '✓'}
                            </div>
                          );
                        })}
                      </div>
                      {question.explanation && (
                        <p className="ml-7 mt-3 text-sm text-muted-foreground bg-muted p-2 rounded">
                          💡 {question.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Retake button */}
          {quiz.allow_retake && (!quiz.max_attempts || attemptNumber < quiz.max_attempts) && (
            <Button onClick={retakeQuiz} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Quiz view
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isAnswered = (responses.get(question.id)?.length || 0) > 0;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {quiz.title}
          </CardTitle>
          <Badge variant="outline">
            {currentQuestion + 1}/{quiz.questions.length}
          </Badge>
        </div>
        {quiz.description && (
          <CardDescription>{quiz.description}</CardDescription>
        )}
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-lg font-medium">{question.question}</p>

            {question.type === 'single-choice' ? (
              <RadioGroup
                value={responses.get(question.id)?.[0]?.toString()}
                onValueChange={(value) => handleSingleChoice(question.id, parseInt(value))}
              >
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={index.toString()} id={`${question.id}-${index}`} />
                    <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`${question.id}-${index}`}
                      checked={responses.get(question.id)?.includes(index) || false}
                      onCheckedChange={(checked) => 
                        handleMultipleChoice(question.id, index, checked as boolean)
                      }
                    />
                    <Label htmlFor={`${question.id}-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
                <p className="text-sm text-muted-foreground">Selecione todas as opções corretas</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
          >
            Anterior
          </Button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <Button 
              onClick={submitQuiz}
              disabled={!isAnswered || responses.size < quiz.questions.length}
            >
              Finalizar Quiz
            </Button>
          ) : (
            <Button onClick={nextQuestion} disabled={!isAnswered}>
              Próxima
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question indicators */}
        <div className="flex gap-2 justify-center mt-4">
          {quiz.questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentQuestion
                  ? 'bg-primary'
                  : responses.has(q.id)
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
