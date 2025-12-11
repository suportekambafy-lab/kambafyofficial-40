import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Users, Monitor, Smartphone, Shield, Zap, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useState } from "react";

// Import screenshots
import memberAreaLogin from "@/assets/member-area-login.png";
import memberAreaHero from "@/assets/member-area-hero.png";
import memberAreaModules from "@/assets/member-area-modules.png";
import memberAreaLessons from "@/assets/member-area-lessons.png";
import memberAreaPlayer from "@/assets/member-area-player.png";

const NewMemberAreaLanding = () => {
  const navigate = useNavigate();
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const features = [
    {
      icon: Monitor,
      title: "Design Premium",
      description: "Interface moderna inspirada nas melhores plataformas de streaming"
    },
    {
      icon: Play,
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
      image: memberAreaLogin,
      objectFit: "cover" as const
    },
    {
      title: "Página Inicial",
      description: "Hero cinematográfico com seu curso em destaque estilo Netflix",
      image: memberAreaHero,
      objectFit: "cover" as const
    },
    {
      title: "Continuar Assistindo",
      description: "Seção de progresso com aulas em andamento e módulos organizados",
      image: memberAreaModules,
      objectFit: "cover" as const
    },
    {
      title: "Todos os Módulos",
      description: "Visualização completa dos módulos com capas atrativas e aulas recentes",
      image: memberAreaLessons,
      objectFit: "cover" as const
    },
    {
      title: "Player de Vídeo",
      description: "Player profissional com controles avançados e lista de aulas",
      image: memberAreaPlayer,
      objectFit: "cover" as const
    }
  ];

  const nextScreenshot = () => {
    setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
  };

  const prevScreenshot = () => {
    setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <div className="relative bg-[#111111] text-gray-300 min-h-screen overflow-x-hidden">
      {/* Background dots pattern - same as landing */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, rgba(129, 231, 106, 0.3) 1px, transparent 1px)',
        backgroundSize: '25px 25px'
      }} />
      <div className="fixed inset-0 z-1 pointer-events-none" style={{
        background: 'linear-gradient(to bottom, transparent 0%, #111111 90%), radial-gradient(ellipse at center, transparent 40%, #111111 95%)'
      }} />

      {/* Header */}
      <header className="w-full sticky top-0 z-30 backdrop-blur-md border-b border-gray-800/50 bg-[#111111]/80">
        <nav className="flex justify-between items-center max-w-screen-xl mx-auto h-[60px] sm:h-[70px] px-4 sm:px-6 md:px-10 lg:px-16">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm">Voltar</span>
          </button>
          
          <div className="flex items-center">
            <img 
              src="/kambafy-logo-white.png" 
              alt="Kambafy" 
              className="h-8 sm:h-10 w-auto"
            />
          </div>
          
          <motion.button
            onClick={() => navigate('/auth')}
            className="bg-[#81e76a] text-[#111111] px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold hover:bg-opacity-90 transition-colors duration-200"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Começar
          </motion.button>
        </nav>
      </header>

      {/* Screenshots Gallery */}
      <section className="relative z-10 pt-6 pb-8 sm:pt-10 sm:pb-12 md:pt-16 md:pb-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-10"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">Visualize a Experiência</h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto px-2">
              Cada detalhe foi pensado para oferecer a melhor experiência de aprendizado
            </p>
          </motion.div>

          {/* Main Screenshot Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto relative"
          >
            {/* Browser Mockup */}
            <div className="bg-[#1a1a1a] rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border border-gray-800">
              {/* Browser Header - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-gray-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-[#2a2a2a] rounded-md px-4 py-1.5 text-sm text-gray-500 text-center max-w-md mx-auto">
                    membros.kambafy.com/area/seu-curso
                  </div>
                </div>
              </div>
              
              {/* Screenshot Content */}
              <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-[#0a0a0a]">
                {screenshots.map((screenshot, index) => (
                  <motion.img
                    key={index}
                    src={screenshot.image}
                    alt={screenshot.title}
                    className={`absolute inset-0 w-full h-full object-cover object-top`}
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
              className="absolute left-1 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-2 md:-translate-x-14 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#1a1a1a]/90 sm:bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-full flex items-center justify-center transition-all border border-gray-700"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={nextScreenshot}
              className="absolute right-1 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-2 md:translate-x-14 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#1a1a1a]/90 sm:bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded-full flex items-center justify-center transition-all border border-gray-700"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>

            {/* Screenshot Info */}
            <motion.div 
              key={activeScreenshot}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-4 sm:mt-6 px-2"
            >
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">{screenshots[activeScreenshot].title}</h3>
              <p className="text-sm sm:text-base text-gray-400">{screenshots[activeScreenshot].description}</p>
            </motion.div>

            {/* Dots Navigation */}
            <div className="flex justify-center gap-2 mt-4 sm:mt-6">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveScreenshot(index)}
                  className={`h-2 sm:h-2.5 rounded-full transition-all ${
                    activeScreenshot === index 
                      ? 'bg-[#81e76a] w-6 sm:w-8' 
                      : 'bg-gray-600 hover:bg-gray-500 w-2 sm:w-2.5'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Thumbnail Carousel */}
          <div className="mt-8 sm:mt-12 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 sm:gap-4 pb-4 px-2 min-w-max mx-auto justify-center">
              {screenshots.map((item, index) => (
                <motion.button
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setActiveScreenshot(index)}
                  className={`text-left overflow-hidden rounded-md sm:rounded-lg border transition-all flex-shrink-0 w-[180px] sm:w-[200px] md:w-[220px] ${
                    activeScreenshot === index 
                      ? 'border-[#81e76a] ring-2 ring-[#81e76a]/30' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 sm:p-2.5 bg-[#1a1a1a]">
                    <h3 className="font-medium text-[10px] sm:text-xs text-white truncate">{item.title}</h3>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto px-2">
              Recursos premium para criar uma experiência de aprendizado única
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 sm:p-5 md:p-6 bg-[#1a1a1a] rounded-lg sm:rounded-xl border border-gray-800 hover:border-[#81e76a]/50 transition-all duration-300"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#81e76a]/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#81e76a]/20 transition-colors">
                  <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#81e76a]" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-none">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
              Antes vs Depois
            </h2>
            <p className="text-sm sm:text-base text-gray-400">
              A evolução que seus alunos vão adorar
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-4 sm:p-6 bg-[#1a1a1a] rounded-lg sm:rounded-xl border border-gray-800"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-gray-500" />
                <span className="text-sm sm:text-base text-gray-500 font-medium">Antes</span>
              </div>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-500">
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-red-400">✕</span>
                  Design básico e genérico
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-red-400">✕</span>
                  Player de vídeo simples
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-red-400">✕</span>
                  Navegação confusa
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-red-400">✕</span>
                  Sem personalização
                </li>
              </ul>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-4 sm:p-6 bg-[#81e76a]/5 rounded-lg sm:rounded-xl border border-[#81e76a]/30"
            >
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#81e76a]" />
                <span className="text-sm sm:text-base text-[#81e76a] font-medium">Depois</span>
              </div>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-white">
                <li className="flex items-center gap-2 sm:gap-3">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#81e76a] flex-shrink-0" />
                  Design premium estilo Netflix
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#81e76a] flex-shrink-0" />
                  Player profissional com controles
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#81e76a] flex-shrink-0" />
                  Navegação intuitiva e fluida
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#81e76a] flex-shrink-0" />
                  Totalmente personalizável
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center bg-[#1a1a1a] p-6 sm:p-8 md:p-12 rounded-xl sm:rounded-2xl border border-gray-800"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
              Pronto para impressionar seus alunos?
            </h2>
            <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 max-w-lg mx-auto">
              Comece agora e transforme a experiência do seu curso com a nova área de membros da Kambafy.
            </p>
            <motion.button 
              onClick={() => navigate('/auth')}
              className="bg-[#81e76a] text-[#111111] px-6 sm:px-8 py-2.5 sm:py-3 rounded-md text-sm sm:text-base font-semibold hover:bg-opacity-90 transition-colors w-full sm:w-auto"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Começar Gratuitamente
            </motion.button>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4">
              Sem cartão de crédito • Configure em minutos
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-6 sm:py-8">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16 text-center">
          <img 
            src="/kambafy-logo-white.png" 
            alt="Kambafy" 
            className="h-6 sm:h-8 w-auto mx-auto mb-3 sm:mb-4"
          />
          <p className="text-xs sm:text-sm text-gray-500">
            © 2025 Kambafy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NewMemberAreaLanding;
