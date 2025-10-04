import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles, Shield, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center">
        <div className="h-12 flex items-center justify-center">
          <img src="/lovable-uploads/kambafy-logo.svg" alt="Kambafy" className="h-full w-auto" />
        </div>
        {!isLastSlide && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Pular
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6 max-w-sm"
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center">
                {slides[currentSlide].icon}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground">
              {slides[currentSlide].title}
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 space-y-4">
        {/* Dots Indicator */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-primary/30'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          size="lg"
          className="w-full h-14 text-lg font-semibold"
        >
          {isLastSlide ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Começar
            </>
          ) : (
            <>
              Próximo
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
