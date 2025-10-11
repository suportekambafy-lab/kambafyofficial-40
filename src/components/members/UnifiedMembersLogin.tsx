import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2 } from 'lucide-react';
import { useUnifiedMembersAuth } from './UnifiedMembersAuth';

export default function UnifiedMembersLogin() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, memberAreas } = useUnifiedMembersAuth();
  const navigate = useNavigate();
  const { id: memberAreaId } = useParams(); // Captura ID da URL se for login de área específica

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email);
      
      if (success) {
        // Aguardar um momento para carregar as áreas
        setTimeout(() => {
          const baseUrl = window.location.hostname.includes('localhost') 
            ? window.location.origin 
            : 'https://membros.kambafy.com';
            
          // PRIORIDADE 1: Se veio de URL específica (/login/:id), redirecionar para essa área
          if (memberAreaId) {
            console.log('🎯 Redirecionando para área específica:', memberAreaId);
            window.location.href = `${baseUrl}/area/${memberAreaId}`;
          } 
          // PRIORIDADE 2: Se tiver apenas 1 curso, redirecionar direto
          else if (memberAreas.length === 1) {
            console.log('📚 Redirecionando para única área:', memberAreas[0].memberAreaId);
            window.location.href = `${baseUrl}/area/${memberAreas[0].memberAreaId}`;
          } 
          // PRIORIDADE 3: Se tiver múltiplos, ir para dashboard do hub
          else {
            console.log('🏠 Redirecionando para hub com múltiplas áreas');
            window.location.href = `${baseUrl}/hub/dashboard`;
          }
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background with grid */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00A651]/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#00A651]/5 rounded-full blur-[120px]" />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,166,81,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,166,81,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-2"
        >
          <img 
            src="/kambafy-logo-light-green.png" 
            alt="Kambafy" 
            className="h-16 w-auto mx-auto mb-2"
          />
          <p className="text-zinc-500 text-sm">
            Área de Membros
          </p>
        </motion.div>

        {/* Card de Login */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative group"
        >
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-[#00A651]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative bg-[#18181b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold text-white">Acessar Meus Cursos</h2>
              <p className="text-zinc-500 text-sm">
                Entre com seu email para acessar todos os seus cursos
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="email" className="text-sm font-medium text-zinc-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-12 h-12 bg-zinc-900/50 backdrop-blur-xl border-white/5 text-white placeholder:text-zinc-600 focus:border-[#00A651]/50 transition-all rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#00A651] hover:bg-[#00A651]/90 text-white font-semibold rounded-xl shadow-lg shadow-[#00A651]/20 hover:shadow-[#00A651]/40 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Acessar Meus Cursos'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-center text-sm text-zinc-500">
                Primeiro acesso? Use o email da sua compra
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-zinc-600"
        >
          <p>© 2024 Kambafy. Todos os direitos reservados.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
