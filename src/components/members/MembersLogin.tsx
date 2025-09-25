import { useState, useEffect, useId } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useMembersAuth } from './MembersAuth';
import { useInternalMembersNavigation } from '@/utils/internalMembersLinks';
import { supabase } from '@/integrations/supabase/client';

export default function MembersLogin() {
  const { id: memberAreaId } = useParams();
  const { goToArea } = useInternalMembersNavigation();
  const { login } = useMembersAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memberArea, setMemberArea] = useState<any>(null);
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
    if (!memberAreaId || !email) return;

    setIsLoading(true);
    
    // Usar o email como nome temporariamente - o nome real virá da compra
    const success = await login(memberAreaId, email, email.split('@')[0]);
    
    if (success) {
      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para a área de membros...'
      });
      goToArea(memberAreaId);
    } else {
      toast.error('Erro no login', {
        description: 'Verifique seus dados ou entre em contato com o suporte.'
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-2 mb-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
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
                Entre com seu email de acesso
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
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Entrando...' : 'Acessar'}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}