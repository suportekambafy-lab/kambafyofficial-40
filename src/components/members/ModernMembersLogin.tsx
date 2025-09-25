import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, User, Sparkles, BookOpen } from 'lucide-react';
import { useModernMembersAuth } from './ModernMembersAuth';

export default function ModernMembersLogin() {
  const { id: memberAreaId } = useParams();
  const navigate = useNavigate();
  const { login, isLoading } = useModernMembersAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberAreaId || !email || !name || isSubmitting) return;

    setIsSubmitting(true);
    
    const success = await login(memberAreaId, email, name);
    
    if (success) {
      // Navegar usando React Router
      navigate(`/members/area/${memberAreaId}`, { replace: true });
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="backdrop-blur-sm bg-card/95 shadow-2xl border border-primary/10">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-2xl flex items-center justify-center shadow-lg"
            >
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent">
              Área de Membros
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Acesse suas aulas exclusivas e conteúdo premium
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" />
                  Seu email de acesso
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" />
                  Seu nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all"
                  required
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2"
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={isSubmitting || !email || !name}
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"
                    />
                  ) : (
                    <LogIn className="h-5 w-5 mr-2" />
                  )}
                  {isSubmitting ? 'Entrando...' : 'Acessar Área de Membros'}
                </Button>
              </motion.div>
            </form>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Conteúdo exclusivo e seguro</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground/80">
                Seus dados estão protegidos com criptografia de ponta a ponta
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}