import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Users, Sparkles, Monitor, Smartphone, Shield, Zap, Star, CheckCircle2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Import screenshots
import memberAreaLogin from "@/assets/member-area-login.png";
import memberAreaHero from "@/assets/member-area-hero.png";
import memberAreaModules from "@/assets/member-area-modules.png";
import memberAreaPlayer from "@/assets/member-area-player.png";

const NewMemberAreaLanding = () => {
  const navigate = useNavigate();
  const [activeScreenshot, setActiveScreenshot] = useState(0);

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
      description: "Login elegante com animações e efeitos visuais modernos",
      image: memberAreaLogin
    },
    {
      title: "Página Inicial",
      description: "Hero cinematográfico com seu curso em destaque estilo Netflix",
      image: memberAreaHero
    },
    {
      title: "Módulos do Curso",
      description: "Visualização de módulos com capas atrativas e progresso visual",
      image: memberAreaModules
    },
    {
      title: "Player de Vídeo",
      description: "Player profissional com controles avançados e lista de aulas",
      image: memberAreaPlayer
    }
  ];

  const nextScreenshot = () => {
    setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
  };

  const prevScreenshot = () => {
    setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

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
      <section className="relative z-10 py-16 md:py-24">
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

      {/* Screenshots Gallery */}
      <section className="relative z-10 py-12 md:py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Visualize a Experiência</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Cada detalhe foi pensado para oferecer a melhor experiência de aprendizado
            </p>
          </motion.div>

          {/* Main Screenshot Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto relative"
          >
            {/* Browser Mockup */}
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
              
              {/* Screenshot Content */}
              <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
                {screenshots.map((screenshot, index) => (
                  <motion.img
                    key={index}
                    src={screenshot.image}
                    alt={screenshot.title}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: activeScreenshot === index ? 1 : 0,
                      scale: activeScreenshot === index ? 1 : 1.05
                    }}
                    transition={{ duration: 0.5 }}
                  />
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevScreenshot}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextScreenshot}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Screenshot Info */}
            <motion.div 
              key={activeScreenshot}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-6"
            >
              <h3 className="text-xl font-semibold mb-2">{screenshots[activeScreenshot].title}</h3>
              <p className="text-zinc-400">{screenshots[activeScreenshot].description}</p>
            </motion.div>

            {/* Dots Navigation */}
            <div className="flex justify-center gap-2 mt-6">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveScreenshot(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    activeScreenshot === index 
                      ? 'bg-primary w-8' 
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-5xl mx-auto">
            {screenshots.map((item, index) => (
              <motion.button
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setActiveScreenshot(index)}
                className={`text-left overflow-hidden rounded-xl border transition-all ${
                  activeScreenshot === index 
                    ? 'border-primary ring-2 ring-primary/50' 
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 bg-zinc-800/50">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                </div>
              </motion.button>
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
