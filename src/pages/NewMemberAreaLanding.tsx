import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Users, Sparkles, Monitor, Smartphone, Shield, Zap, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NewMemberAreaLanding = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: "Design Premium",
      description: "Interface moderna inspirada nas melhores plataformas de streaming"
    },
    {
      icon: Monitor,
      title: "Player Avançado",
      description: "Controle de velocidade, qualidade HD e experiência cinematográfica"
    },
    {
      icon: Smartphone,
      title: "100% Responsivo",
      description: "Acesse de qualquer dispositivo com a mesma qualidade"
    },
    {
      icon: Shield,
      title: "Segurança Máxima",
      description: "Proteção anti-pirataria e acesso seguro aos conteúdos"
    },
    {
      icon: Zap,
      title: "Ultra Rápido",
      description: "Carregamento instantâneo e navegação fluida"
    },
    {
      icon: Users,
      title: "Gestão de Alunos",
      description: "Acompanhe o progresso e engajamento dos seus estudantes"
    }
  ];

  const screenshots = [
    {
      title: "Tela de Login",
      description: "Login elegante com animações e efeitos visuais modernos"
    },
    {
      title: "Página Inicial",
      description: "Hero cinematográfico com seu curso em destaque estilo Netflix"
    },
    {
      title: "Módulos",
      description: "Visualização de módulos com capas atrativas e progresso visual"
    },
    {
      title: "Player de Vídeo",
      description: "Player profissional com controles avançados e lista de aulas"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-zinc-900/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl">Kambafy</span>
          </div>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Começar Agora
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Novo Visual 2025</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              A <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary">Nova Área</span> de Membros
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
              Uma experiência premium para seus alunos. Design cinematográfico, player profissional e interface intuitiva que impressiona.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-white text-black hover:bg-white/90 gap-2 text-lg px-8 py-6"
              >
                <Play className="w-5 h-5 fill-current" />
                Criar Minha Área
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 gap-2 text-lg px-8 py-6"
              >
                <Star className="w-5 h-5" />
                Ver Demonstração
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Screenshots Preview */}
      <section className="relative z-10 py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Visualize a Experiência</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Cada detalhe foi pensado para oferecer a melhor experiência de aprendizado
            </p>
          </motion.div>

          {/* Mockup Browser */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-zinc-800 rounded-xl overflow-hidden shadow-2xl border border-white/10">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-zinc-700/50 rounded-md px-4 py-1.5 text-sm text-zinc-400 text-center max-w-md mx-auto">
                    membros.kambafy.com/area/seu-curso
                  </div>
                </div>
              </div>
              
              {/* Content Preview */}
              <div className="aspect-video bg-gradient-to-br from-zinc-800 via-zinc-900 to-black relative">
                {/* Navbar Mock */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/50 to-transparent flex items-center px-8 gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded" />
                    <span className="font-semibold text-white/90">Kambafy</span>
                  </div>
                  <div className="hidden md:flex items-center gap-6">
                    <span className="text-sm bg-primary/20 px-3 py-1 rounded-full text-primary">Home</span>
                    <span className="text-sm text-white/60">Módulos</span>
                    <span className="text-sm text-white/60">Ofertas</span>
                  </div>
                </div>

                {/* Hero Mock */}
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-full bg-gradient-to-r from-black/80 via-black/50 to-transparent p-8 md:p-16 flex flex-col justify-center">
                    <div className="max-w-lg">
                      <div className="text-xs text-yellow-500 font-bold mb-2">MARCA MILIONÁRIA</div>
                      <h3 className="text-2xl md:text-4xl font-bold text-white mb-3">BEM VINDO A MARCA MILIONÁRIA</h3>
                      <div className="flex items-center gap-3 text-xs md:text-sm text-white/60 mb-4">
                        <span>2024</span>
                        <span className="px-2 py-0.5 border border-white/30 rounded text-xs">PREMIUM</span>
                        <span>26 Módulos</span>
                        <span>⏱ 5 min</span>
                      </div>
                      <p className="text-sm text-white/70 mb-4 hidden md:block">
                        A profissão do futuro, que transformou milhares de vidas, agora é sua vez
                      </p>
                      <div className="w-32 h-1 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-green-500 rounded-full" />
                      </div>
                      <span className="text-xs text-white/50 mt-1">38% concluído</span>
                      <div className="flex gap-3 mt-4">
                        <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium">
                          <Play className="w-4 h-4 fill-current" />
                          Play
                        </div>
                        <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                          <Users className="w-4 h-4" />
                          Ver Currículo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gradient overlay on right side for image effect */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-700/30 to-transparent" />
              </div>
            </div>
          </motion.div>

          {/* Screenshot Labels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            {screenshots.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 mx-auto mb-3 bg-primary/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-zinc-500">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Recursos premium para criar uma experiência de aprendizado única
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/10 hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative z-10 py-16 md:py-24 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Antes vs Depois
            </h2>
            <p className="text-zinc-400">
              A evolução que seus alunos vão adorar
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-zinc-500" />
                <span className="text-zinc-500 font-medium">Antes</span>
              </div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">✕</span>
                  Design básico e genérico
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">✕</span>
                  Player de vídeo simples
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">✕</span>
                  Navegação confusa
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">✕</span>
                  Sem personalização
                </li>
              </ul>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl border border-primary/30"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-primary font-medium">Depois</span>
              </div>
              <ul className="space-y-3 text-sm text-white">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Design premium estilo Netflix
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Player profissional com controles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Navegação intuitiva e fluida
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Totalmente personalizável
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 md:p-12 rounded-3xl border border-primary/30"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para impressionar seus alunos?
            </h2>
            <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
              Comece agora e transforme a experiência do seu curso com a nova área de membros da Kambafy.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-lg px-8 py-6"
            >
              <Sparkles className="w-5 h-5" />
              Começar Gratuitamente
            </Button>
            <p className="text-xs text-zinc-500 mt-4">
              Sem cartão de crédito • Configure em minutos
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">K</span>
            </div>
            <span className="font-semibold">Kambafy</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2025 Kambafy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NewMemberAreaLanding;
