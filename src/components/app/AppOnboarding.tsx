import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles, Shield, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import kambafyIcon from '@/assets/kambafy-icon.png';

interface OnboardingSlide {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    icon: <Sparkles className="w-16 h-16 text-primary" />,
    title: "Bem-vindo ao Kambafy",
    description: "A plataforma completa para gerenciar seu negócio digital de forma simples e eficiente."
  },
  {
    icon: <Zap className="w-16 h-16 text-primary" />,
    title: "Gestão Simplificada",
    description: "Controle vendas, produtos e clientes em um único lugar, com interface intuitiva."
  },
  {
    icon: <Shield className="w-16 h-16 text-primary" />,
    title: "Seguro e Confiável",
    description: "Seus dados protegidos com a mais alta tecnologia de segurança."
  }
];

interface AppOnboardingProps {
  onComplete: () => void;
}

export function AppOnboarding({ onComplete }: AppOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-checkout-green via-checkout-green/95 to-checkout-green/90" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-12 flex items-center justify-center"
        >
          <img src={kambafyIcon} alt="Kambafy" className="h-full w-auto drop-shadow-lg" />
        </motion.div>
        {!isLastSlide && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-sm"
            >
              Pular
            </Button>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center space-y-8 max-w-md"
          >
            {/* Icon Container */}
            <motion.div 
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-[32px] blur-xl" />
                <div className="relative w-28 h-28 bg-white rounded-[32px] flex items-center justify-center shadow-2xl backdrop-blur-sm">
                  {slides[currentSlide].icon}
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white leading-tight"
            >
              {slides[currentSlide].title}
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/90 leading-relaxed px-4"
            >
              {slides[currentSlide].description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-6 space-y-6">
        {/* Dots Indicator */}
        <div className="flex justify-center gap-2.5">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-10 bg-white shadow-lg' 
                  : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Next Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleNext}
            style={{
              width: '100%',
              height: '56px',
              backgroundColor: 'white',
              color: 'hsl(152, 57%, 40%)',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '17px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
          >
            {isLastSlide ? (
              <>
                <Check className="w-5 h-5" />
                <span>Começar</span>
              </>
            ) : (
              <>
                <span>Próximo</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
