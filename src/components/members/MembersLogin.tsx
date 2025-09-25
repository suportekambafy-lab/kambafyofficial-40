import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="bg-gray-800 shadow-2xl border border-gray-700">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
            >
              {memberArea?.login_logo_url || memberArea?.logo_url ? (
                <img 
                  src={memberArea.login_logo_url || memberArea.logo_url} 
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
              )}
            </motion.div>
            <CardTitle className="text-2xl font-bold text-white">
              {memberArea?.name || 'Área de Membros'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="flex items-center gap-2 text-gray-200">
                  <Mail className="h-4 w-4 text-blue-400" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 bg-gray-700 border-gray-600 focus:border-blue-500 text-white placeholder:text-gray-400"
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Entrar na Área
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}