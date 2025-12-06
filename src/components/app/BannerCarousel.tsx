import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import personPhoneSmiling from '@/assets/person-phone-smiling.png';

const banners = [
  {
    id: 1,
    title: 'Dica para vender mais',
    description: 'Compartilhe o link do seu produto nas redes sociais para alcançar mais clientes.',
    gradient: 'from-primary to-primary/80',
    image: personPhoneSmiling,
  },
  {
    id: 2,
    title: 'Aumente suas conversões',
    description: 'Use imagens de alta qualidade e descrições detalhadas nos seus produtos.',
    gradient: 'from-blue-600 to-blue-500',
    image: personPhoneSmiling,
  },
  {
    id: 3,
    title: 'Fidelize seus clientes',
    description: 'Responda rapidamente às dúvidas e ofereça um excelente atendimento.',
    gradient: 'from-purple-600 to-purple-500',
    image: personPhoneSmiling,
  },
];

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${currentBanner.gradient} p-4`}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0 z-10">
              <p className="text-base font-semibold text-white">{currentBanner.title}</p>
              <p className="text-sm text-white/80 mt-1">
                {currentBanner.description}
              </p>
            </div>
            <div className="relative shrink-0">
              <img 
                src={currentBanner.image}
                alt="Profissional"
                className="w-24 h-24 object-cover object-top rounded-xl border-2 border-white/20"
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-primary w-4' 
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
