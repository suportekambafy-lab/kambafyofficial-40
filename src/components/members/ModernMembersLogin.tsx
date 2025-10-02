import { useState, useEffect, useId } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useDebounced } from '@/hooks/useDebounced';
import { useTheme } from '@/hooks/useTheme';
import kambafyLogo from '@/assets/kambafy-logo-gray.svg';

export default function ModernMembersLogin() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useCustomToast();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
  const id = useId();
  
  useEffect(() => {
    console.log('🎨 ModernMembersLogin - Current theme:', theme);
    console.log('🎨 ModernMembersLogin - HTML classes:', document.documentElement.classList.toString());
    console.log('🎨 ModernMembersLogin - localStorage theme:', localStorage.getItem('kambafy-ui-theme'));
  }, [theme]);
  
  // Extrair email da URL se disponível
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      // Normalizar email para lowercase
      setEmail(decodeURIComponent(emailFromUrl).toLowerCase().trim());
    }
  }, [location.search]);
  
  // Debounced function para validação e acesso
  const { debouncedFunc: debouncedAccess } = useDebounced(
    async (email: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      
      try {
        // Normalizar email para lowercase
        const normalizedEmail = email.toLowerCase().trim();
        
        // Verificar se é o email de validação especial
        if (normalizedEmail === 'validar@kambafy.com') {
          // Email de validação tem acesso a todas as áreas
          toast({
            title: "✅ Acesso de validação autorizado!",
            message: "Bem-vindo à área de membros",
            variant: "success",
          });
          
          setTimeout(() => {
            window.location.href = `/members/area/${memberAreaId}?verified=true&email=${encodeURIComponent(normalizedEmail)}`;
          }, 800);
          return;
        }
        
        // Para outros emails, verificar se tem acesso à área de membros
        const { data: studentAccess, error } = await supabase
          .from('member_area_students')
          .select('*')
          .eq('member_area_id', memberAreaId)
          .ilike('student_email', normalizedEmail)
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
          title: "✅ Acesso autorizado!",
          message: "Bem-vindo à área de membros",
          variant: "success",
        });
        
        // Redirecionar para a área de membros com acesso verificado
        setTimeout(() => {
          window.location.href = `/members/area/${memberAreaId}?verified=true&email=${encodeURIComponent(normalizedEmail)}`;
        }, 800);
        
      } catch (error: any) {
        console.error('Erro ao verificar acesso:', error);
        toast({
          title: "❌ Erro na verificação",
          message: "Erro ao verificar acesso do email",
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    1000
  );

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
    
    // Validações rápidas
    if (!email.trim()) {
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

    // Usar função debounced para evitar múltiplas chamadas
    debouncedAccess(email.trim());
  };

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
                Digite seu email para acessar o conteúdo
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor={`${id}-email`} className="text-zinc-200">Email de Acesso</Label>
              <Input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-zinc-500"
                required
                disabled={isSubmitting}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-100 font-medium disabled:bg-zinc-700 disabled:text-zinc-300" 
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Processando...' : 'Acessar Área'}
              </Button>
            </motion.div>

            {/* Informação sobre portal de clientes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-6 pt-4 border-t border-zinc-800"
            >
              <p className="text-xs text-zinc-500 mb-2">
                Precisa acessar o portal de clientes?
              </p>
              <a
                href="/auth"
                className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors underline"
              >
                Clique aqui para fazer login no portal
              </a>
            </motion.div>
          </form>
        </div>
        
        {/* Footer com mensagem da Kambafy */}
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