import { useState, useEffect, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogIn, Mail, BookOpen, Lock } from 'lucide-react';
import { useModernMembersAuth } from './ModernMembersAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import kambafyLogo from '@/assets/kambafy-logo-gray.svg';

export default function ModernMembersLogin() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const { login, isLoading } = useModernMembersAuth();
  const { toast } = useCustomToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [emailValidated, setEmailValidated] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const id = useId();

  useEffect(() => {
    const fetchMemberArea = async () => {
      if (!memberAreaId) return;
      
      const { data } = await supabase
        .from('member_areas')
        .select('name, login_logo_url, logo_url, primary_color, accent_color, background_style')
        .eq('id', memberAreaId)
        .single();
      
      if (data) {
        setMemberArea(data);
      }
    };
    
    fetchMemberArea();
  }, [memberAreaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validações com toasts específicos
    if (!email.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        message: "Por favor, digite seu email",
        variant: "error",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "⚠️ Campo obrigatório", 
        message: "Por favor, digite sua senha",
        variant: "error",
      });
      return;
    }

    if (!memberAreaId) {
      toast({
        title: "❌ Erro de configuração",
        message: "ID da área de membros não encontrado",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Toast de carregamento
    toast({
      title: "🔄 Fazendo login...",
      message: "Por favor, aguarde",
      variant: "default",
    });
    
    // Aguardar um pouco mais para dar tempo da verificação
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = await login(email, password);
    
    if (success) {
      // Aguardar mais um pouco antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 800));
      // Redirecionar diretamente sem páginas intermediárias
      window.location.href = `/members/area/${memberAreaId}?verified=true&email=${encodeURIComponent(email)}`;
    }
    
    setIsSubmitting(false);
  };

  const handleEmailValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidatingEmail) return;

    if (!resetEmail.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        message: "Por favor, digite seu email",
        variant: "error",
      });
      return;
    }

    if (!memberAreaId) {
      toast({
        title: "❌ Erro de configuração",
        message: "ID da área de membros não encontrado",
        variant: "error",
      });
      return;
    }

    setIsValidatingEmail(true);
    
    toast({
      title: "🔄 Verificando acesso...",
      message: "Validando se o email tem acesso a esta área",
      variant: "default",
    });

    try {
      // Verificar se o email tem acesso à área de membros
      const { data: studentAccess, error } = await supabase
        .from('member_area_students')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', resetEmail.trim())
        .single();

      if (error || !studentAccess) {
        toast({
          title: "❌ Acesso negado",
          message: "Este email não tem acesso a esta área de membros",
          variant: "error",
        });
        return;
      }

      toast({
        title: "✅ Email validado",
        message: "Agora você pode definir uma nova senha",
        variant: "success",
      });

      setEmailValidated(true);

    } catch (error: any) {
      console.error('Erro ao validar email:', error);
      toast({
        title: "❌ Erro na validação",
        message: "Erro ao verificar acesso do email",
        variant: "error",
      });
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetting) return;

    console.log('🔄 Iniciando reset de senha...', { 
      email: resetEmail, 
      password: newPassword ? 'PROVIDED' : 'NOT_PROVIDED',
      memberAreaId 
    });

    // Validações no frontend com toasts específicos
    if (!resetEmail.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        message: "Por favor, digite seu email",
        variant: "error",
      });
      return;
    }

    if (!newPassword.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        message: "Por favor, digite uma nova senha",
        variant: "error",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "⚠️ Senha muito curta",
        message: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "error",
      });
      return;
    }

    if (!memberAreaId) {
      toast({
        title: "❌ Erro de configuração",
        message: "ID da área de membros não encontrado",
        variant: "error",
      });
      return;
    }

    setIsResetting(true);
    
    // Toast de início do processo
    toast({
      title: "🔄 Redefinindo senha...",
      message: "Por favor, aguarde",
      variant: "default",
    });
    
    try {
      console.log('📤 Enviando dados para edge function:', {
        studentEmail: resetEmail.trim(),
        memberAreaId: memberAreaId,
        newPassword: newPassword.trim() ? 'PROVIDED' : 'EMPTY',
        payload: {
          studentEmail: resetEmail.trim(),
          memberAreaId: memberAreaId,
          newPassword: newPassword.trim()
        }
      });

      const { data, error } = await supabase.functions.invoke('member-area-reset-password', {
        body: {
          studentEmail: resetEmail.trim(),
          memberAreaId: memberAreaId,
          newPassword: newPassword.trim()
        }
      });

      console.log('🔄 Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro ao definir nova senha:', error);
        let errorMessage = "Erro ao processar solicitação";
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        toast({
          title: "❌ Erro",
          message: errorMessage,
          variant: "error",
        });
        return;
      }

      if (data && !data.success) {
        toast({
          title: "❌ Erro",
          message: data.error || "Erro desconhecido",
          variant: "error",
        });
        return;
      }

      toast({
        title: "✅ Sucesso",
        message: "Nova senha definida com sucesso! Agora você pode fazer login.",
        variant: "success",
      });

      setShowResetModal(false);
      setResetEmail('');
      setNewPassword('');
      setEmailValidated(false);
      
      // Toast adicional de confirmação
      setTimeout(() => {
        toast({
          title: "🎉 Senha atualizada!",
          message: "Agora você pode usar sua nova senha para fazer login.",
          variant: "success",
        });
      }, 1000);
      
    } catch (error: any) {
      console.error('Erro inesperado:', error);
      let errorMessage = "Erro inesperado ao processar solicitação";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "❌ Erro Inesperado",
        message: errorMessage,
        variant: "error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Remover completamente a tela de loading/verificando acesso
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  //       <motion.div
  //         initial={{ scale: 0.8, opacity: 0 }}
  //         animate={{ scale: 1, opacity: 1 }}
  //         className="text-center space-y-4"
  //       >
  //         <motion.div
  //           animate={{ rotate: 360 }}
  //           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
  //           className="w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto"
  //         />
  //         <p className="text-gray-300">Verificando acesso...</p>
  //       </motion.div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Logo do Kambafy */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <img 
          src={kambafyLogo} 
          alt="Kambafy" 
          className="h-20 w-auto opacity-60"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-2 mb-6">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 overflow-hidden"
              aria-hidden="true"
            >
              {memberArea?.login_logo_url || memberArea?.logo_url ? (
                <img 
                  src={memberArea.login_logo_url || memberArea.logo_url} 
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="h-6 w-6 text-zinc-300" />
              )}
            </motion.div>
            <div className="text-center">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                {memberArea?.name || 'Área de Membros'}
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Entre com suas credenciais de acesso
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor={`${id}-email`} className="text-zinc-200">Email</Label>
                <Input
                  id={`${id}-email`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-zinc-500"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor={`${id}-password`} className="text-zinc-200">Senha</Label>
                <Input
                  id={`${id}-password`}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-zinc-500"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium" 
                disabled={isSubmitting || !email || !password}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Entrando...' : 'Acessar'}
              </Button>
            </motion.div>

            {/* Link para reset de senha */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-4"
            >
              <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors underline"
                  >
                    Esqueci minha senha
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      {!emailValidated ? 'Verificar Acesso' : 'Definir Nova Senha'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      {!emailValidated 
                        ? 'Digite seu email para verificar se você tem acesso a esta área'
                        : 'Digite sua nova senha para sua conta'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  {!emailValidated ? (
                    <form onSubmit={handleEmailValidation} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email" className="text-zinc-200">
                          Email
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                          required
                          disabled={isValidatingEmail}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowResetModal(false);
                            setResetEmail('');
                            setEmailValidated(false);
                          }}
                          disabled={isValidatingEmail}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isValidatingEmail || !resetEmail.trim()}
                          className="flex-1 bg-white text-black hover:bg-zinc-100"
                        >
                          {isValidatingEmail ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                              />
                              Verificando...
                            </>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Verificar Email
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="verified-email" className="text-zinc-200">
                          Email (Verificado)
                        </Label>
                        <Input
                          id="verified-email"
                          type="email"
                          value={resetEmail}
                          disabled
                          className="bg-zinc-800 border-zinc-600 text-zinc-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-zinc-200">
                          Nova Senha
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Digite sua nova senha (mín. 6 caracteres)"
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                          required
                          disabled={isResetting}
                          minLength={6}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEmailValidated(false);
                            setNewPassword('');
                          }}
                          disabled={isResetting}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isResetting || !newPassword.trim()}
                          className="flex-1 bg-white text-black hover:bg-zinc-100"
                        >
                          {isResetting ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                              />
                              Definindo...
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Definir Nova Senha
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </motion.div>
          </form>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-1 text-xs text-zinc-600">
            <span>Plataforma desenvolvida por</span>
            <a 
              href="https://kambafy.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300 font-medium transition-colors"
            >
              Kambafy
            </a>
          </div>
          <p className="text-xs text-zinc-700 mt-1">
            Criação e gestão de áreas de membros profissionais
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}