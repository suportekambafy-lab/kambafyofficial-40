"use client";

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useMemo,
    type ReactNode,
    type MouseEvent as ReactMouseEvent,
    type SVGProps,
} from 'react';
import {
    motion,
    AnimatePresence,
    useScroll,
    useMotionValueEvent,
    type Transition,
    type VariantLabels,
    type Target,
    type TargetAndTransition,
    type Variants,
} from 'framer-motion';
import { Button } from "@/components/ui/button";
import { PlayStoreButton } from "@/components/ui/play-store-button";
import { AppStoreButton } from "@/components/ui/app-store-button";
import { BookOpen, DollarSign, Users, Shield, Star, Play, ArrowRight, Check, Globe, Zap, Lock, CreditCard, Smartphone, TrendingUp, Award, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubdomainLink } from "@/components/SubdomainLink";
import kambafy_icon from "@/assets/kambafy-icon-gray.png";

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

interface RotatingTextProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof motion.span>,
    "children" | "transition" | "initial" | "animate" | "exit"
  > {
  texts: string[];
  transition?: Transition;
  initial?: boolean | Target | VariantLabels;
  animate?: boolean | VariantLabels | TargetAndTransition;
  exit?: Target | VariantLabels;
  animatePresenceMode?: "sync" | "wait";
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "characters" | "words" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(
  (
    {
      texts,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2200,
      staggerDuration = 0.01,
      staggerFrom = "last",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...rest
    },
    ref
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState<number>(0);

    const splitIntoCharacters = (text: string): string[] => {
      if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
        try {
           const segmenter = new (Intl as any).Segmenter("en", { granularity: "grapheme" });
           return Array.from(segmenter.segment(text), (segment: any) => segment.segment);
        } catch (error) {
           console.error("Intl.Segmenter failed, falling back to simple split:", error);
           return text.split('');
        }
      }
      return text.split('');
    };

    const elements = useMemo(() => {
        const currentText: string = texts[currentTextIndex] ?? '';
        if (splitBy === "characters") {
            const words = currentText.split(/(\s+)/);
            let charCount = 0;
            return words.filter(part => part.length > 0).map((part) => {
                const isSpace = /^\s+$/.test(part);
                const chars = isSpace ? [part] : splitIntoCharacters(part);
                const startIndex = charCount;
                charCount += chars.length;
                return { characters: chars, isSpace: isSpace, startIndex: startIndex };
            });
        }
        if (splitBy === "words") {
            return currentText.split(/(\s+)/).filter(word => word.length > 0).map((word, i) => ({
                characters: [word], isSpace: /^\s+$/.test(word), startIndex: i
            }));
        }
        if (splitBy === "lines") {
            return currentText.split('\n').map((line, i) => ({
                characters: [line], isSpace: false, startIndex: i
            }));
        }
        return currentText.split(splitBy).map((part, i) => ({
            characters: [part], isSpace: false, startIndex: i
        }));
    }, [texts, currentTextIndex, splitBy]);

    const totalElements = useMemo(() => elements.reduce((sum, el) => sum + el.characters.length, 0), [elements]);

    const getStaggerDelay = useCallback(
      (index: number, total: number): number => {
        if (total <= 1 || !staggerDuration) return 0;
        const stagger = staggerDuration;
        switch (staggerFrom) {
          case "first": return index * stagger;
          case "last": return (total - 1 - index) * stagger;
          case "center":
            const center = (total - 1) / 2;
            return Math.abs(center - index) * stagger;
          case "random": return Math.random() * (total - 1) * stagger;
          default:
            if (typeof staggerFrom === 'number') {
              const fromIndex = Math.max(0, Math.min(staggerFrom, total - 1));
              return Math.abs(fromIndex - index) * stagger;
            }
            return index * stagger;
        }
      },
      [staggerFrom, staggerDuration]
    );

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex);
        onNext?.(newIndex);
      },
      [onNext]
    );

    const next = useCallback(() => {
      const nextIndex = currentTextIndex === texts.length - 1 ? (loop ? 0 : currentTextIndex) : currentTextIndex + 1;
      if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex = currentTextIndex === 0 ? (loop ? texts.length - 1 : currentTextIndex) : currentTextIndex - 1;
      if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1));
        if (validIndex !== currentTextIndex) handleIndexChange(validIndex);
      },
      [texts.length, currentTextIndex, handleIndexChange]
    );

     const reset = useCallback(() => {
        if (currentTextIndex !== 0) handleIndexChange(0);
     }, [currentTextIndex, handleIndexChange]);

    useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [next, previous, jumpTo, reset]);

    useEffect(() => {
      if (!auto || texts.length <= 1) return;
      const intervalId = setInterval(next, rotationInterval);
      return () => clearInterval(intervalId);
    }, [next, rotationInterval, auto, texts.length]);

    return (
      <motion.span
        className={cn("inline-flex flex-wrap whitespace-pre-wrap relative align-bottom pb-[10px]", mainClassName)}
        {...rest}
        layout
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>
        <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
          <motion.div
            key={currentTextIndex}
            className={cn(
               "inline-flex flex-wrap relative",
               splitBy === "lines" ? "flex-col items-start w-full" : "flex-row items-baseline"
            )}
            layout
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
          >
             {elements.map((elementObj, elementIndex) => (
                <span
                    key={elementIndex}
                    className={cn("inline-flex", splitBy === 'lines' ? 'w-full' : '', splitLevelClassName)}
                    style={{ whiteSpace: 'pre' }}
                >
                    {elementObj.characters.map((char, charIndex) => {
                        const globalIndex = elementObj.startIndex + charIndex;
                        return (
                            <motion.span
                                key={`${char}-${charIndex}`}
                                initial={initial}
                                animate={animate}
                                exit={exit}
                                transition={{
                                    ...transition,
                                    delay: getStaggerDelay(globalIndex, totalElements),
                                }}
                                className={cn("inline-block leading-none tracking-tight", elementLevelClassName)}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        );
                     })}
                </span>
             ))}
          </motion.div>
        </AnimatePresence>
      </motion.span>
    );
  }
);
RotatingText.displayName = "RotatingText";

const MenuIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const CloseIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

// Floating 3D-style element component
const FloatingElement: React.FC<{ className?: string; children: ReactNode; delay?: number }> = ({ className, children, delay = 0 }) => (
  <motion.div
    className={className}
    animate={{
      y: [0, -10, 0],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  >
    {children}
  </motion.div>
);

// Feature Card Component
const FeatureCard: React.FC<{
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  delay?: number;
}> = ({ icon, title, description, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
  >
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-4`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </motion.div>
);

// Stat Card Component  
const StatCard: React.FC<{ number: string; label: string; delay?: number }> = ({ number, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="text-center"
  >
    <div className="text-4xl md:text-5xl font-bold text-[#9AE66E] mb-2">{number}</div>
    <div className="text-gray-600 font-medium">{label}</div>
  </motion.div>
);

// FAQ Item Component
const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onToggle: () => void }> = ({ 
  question, 
  answer, 
  isOpen, 
  onToggle 
}) => (
  <motion.div 
    className="border-b border-gray-200"
    initial={false}
  >
    <button
      onClick={onToggle}
      className="w-full py-6 flex items-center justify-between text-left hover:text-[#9AE66E] transition-colors"
    >
      <span className="text-lg font-semibold text-gray-900 pr-4">{question}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </motion.div>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <p className="pb-6 text-gray-600 leading-relaxed">{answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const InteractiveHero: React.FC = () => {
   const navigate = useNavigate();
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
   const [isScrolled, setIsScrolled] = useState<boolean>(false);
   const [openFAQ, setOpenFAQ] = useState<number | null>(null);

   const { scrollY } = useScroll();
   useMotionValueEvent(scrollY, "change", (latest) => {
       setIsScrolled(latest > 10);
   });

   const handleAuthNavigation = (mode: 'login' | 'signup') => {
     navigate(`/auth?mode=${mode}`);
   };

   useEffect(() => {
       if (isMobileMenuOpen) {
           document.body.style.overflow = 'hidden';
       } else {
           document.body.style.overflow = 'unset';
       }
       return () => { document.body.style.overflow = 'unset'; };
   }, [isMobileMenuOpen]);

   const headerVariants: Variants = {
       top: {
           backgroundColor: "rgba(255, 255, 255, 0)",
           boxShadow: 'none',
       },
       scrolled: {
           backgroundColor: "rgba(255, 255, 255, 0.98)",
           boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
       }
   };

   const mobileMenuVariants: Variants = {
       hidden: { opacity: 0, y: -20 },
       visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
       exit: { opacity: 0, y: -20, transition: { duration: 0.15, ease: "easeIn" } }
   };

   const faqs = [
     {
       question: "Como começar a vender na Kambafy?",
       answer: "Para começar, crie sua conta gratuita, configure seu perfil de criador e publique seu primeiro produto. Nossa equipe está disponível para ajudar em cada passo. É rápido, simples e você pode começar a vender em minutos."
     },
     {
       question: "Quanto custa usar a plataforma?",
       answer: "Zero custos fixos! Cobramos apenas 8,99% de comissão sobre cada venda realizada. Sem mensalidades, sem taxas de adesão, sem surpresas. Você só paga quando ganha."
     },
     {
       question: "Quais tipos de produtos posso vender?",
       answer: "Você pode vender cursos online, e-books, mentorias, templates, consultorias, podcasts, comunidades pagas e muito mais. A plataforma é flexível para qualquer tipo de produto digital."
     },
     {
       question: "Como recebo meus pagamentos?",
       answer: "Os pagamentos são processados automaticamente e transferidos para sua conta em até 3 dias úteis. Aceitamos múltiplas moedas e métodos de pagamento incluindo cartão, Multicaixa Express e transferência."
     },
     {
       question: "Preciso saber programar?",
       answer: "Absolutamente não! Nossa plataforma foi desenvolvida para ser intuitiva e fácil de usar. Qualquer pessoa pode criar e vender seus produtos digitais sem qualquer conhecimento técnico."
     }
   ];

  return (
    <div className="relative bg-white text-gray-900 overflow-x-hidden">
      {/* Header */}
      <motion.header
        variants={headerVariants}
        initial="top"
        animate={isScrolled ? "scrolled" : "top"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed w-full top-0 z-50 backdrop-blur-sm"
      >
        <nav className="flex justify-between items-center max-w-screen-xl mx-auto h-[70px] px-6 md:px-10 lg:px-16">
          <div className="flex items-center flex-shrink-0">
            <img 
              src="/kambafy-logo-green.png" 
              alt="Kambafy" 
              className="h-12 w-auto"
            />
          </div>

          <div className="hidden md:flex items-center justify-center flex-grow space-x-8 px-4">
            <a href="#recursos" className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Recursos</a>
            <a href="#como-funciona" className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Como Funciona</a>
            <a href="#precos" className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Preços</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">FAQ</a>
          </div>

          <div className="flex items-center flex-shrink-0 space-x-4">
            <button 
              onClick={() => handleAuthNavigation('login')} 
              className="hidden md:inline-block text-sm font-medium text-gray-700 hover:text-[#9AE66E] transition-colors"
            >
              Entrar
            </button>

            <motion.button
              onClick={() => handleAuthNavigation('signup')}
              className="bg-[#9AE66E] text-gray-900 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#8AD65E] transition-all duration-200 shadow-sm hover:shadow-md"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Começar Grátis
            </motion.button>

            <motion.button
              className="md:hidden text-gray-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              whileHover={{ scale: 1.1 }} 
              whileTap={{ scale: 0.9 }}
            >
              {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </motion.button>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              key="mobile-menu"
              variants={mobileMenuVariants} 
              initial="hidden" 
              animate="visible" 
              exit="exit"
              className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg py-4 border-t border-gray-100"
            >
              <div className="flex flex-col items-center space-y-4 px-6">
                <a href="#recursos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Recursos</a>
                <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Como Funciona</a>
                <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Preços</a>
                <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">FAQ</a>
                <hr className="w-full border-t border-gray-200 my-2"/>
                <button onClick={() => handleAuthNavigation('login')} className="text-sm font-medium text-gray-600 hover:text-[#9AE66E] transition-colors">Entrar</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-[#9AE66E] via-[#9AE66E] to-[#7CC652] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium text-white">+1000 criadores já vendem na Kambafy</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-6">
                Venda seus
                <br />
                <span className="inline-block h-[1.2em] overflow-hidden align-bottom">
                  <RotatingText
                    texts={['cursos', 'e-books', 'mentorias', 'templates']}
                    mainClassName="text-white mx-1"
                    staggerFrom="last"
                    initial={{ y: "-100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "110%", opacity: 0 }}
                    staggerDuration={0.02}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    rotationInterval={2500}
                    splitBy="characters"
                    auto={true}
                    loop={true}
                  />
                </span>
                <br />
                sem complicações
              </h1>

              <p className="text-lg lg:text-xl text-gray-800 max-w-lg mx-auto lg:mx-0 mb-8">
                A plataforma completa para criadores digitais em Angola e países lusófonos. Zero custos fixos, apenas sucesso.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <motion.button
                  onClick={() => handleAuthNavigation('signup')}
                  className="bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Começar a Vender
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  className="bg-white/20 backdrop-blur-sm text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/30 transition-all duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-5 h-5" />
                  Ver Demo
                </motion.button>
              </div>

              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Sem mensalidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Suporte 24/7</span>
                </div>
              </div>
            </motion.div>

            {/* Right Content - Floating Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <FloatingElement className="relative z-10">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md ml-auto">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-[#9AE66E] rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Vendas do mês</div>
                      <div className="text-2xl font-bold text-gray-900">Kz 2.450.000</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Curso de Marketing</div>
                          <div className="text-sm text-gray-500">45 vendas</div>
                        </div>
                      </div>
                      <div className="text-[#9AE66E] font-semibold">+12%</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Mentoria Premium</div>
                          <div className="text-sm text-gray-500">23 alunos</div>
                        </div>
                      </div>
                      <div className="text-[#9AE66E] font-semibold">+28%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Próximo saque disponível</span>
                    <span className="font-semibold text-gray-900">3 dias</span>
                  </div>
                </div>
              </FloatingElement>

              {/* Decorative floating elements */}
              <FloatingElement delay={0.5} className="absolute -top-4 -left-4">
                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="text-sm font-medium">4.9 Avaliação</div>
                </div>
              </FloatingElement>

              <FloatingElement delay={1} className="absolute -bottom-4 left-8">
                <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-sm font-medium">Pagamento confirmado!</div>
                </div>
              </FloatingElement>
            </motion.div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="1000+" label="Criadores Ativos" delay={0} />
            <StatCard number="15k+" label="Produtos Vendidos" delay={0.1} />
            <StatCard number="Kz 50M+" label="Em Vendas" delay={0.2} />
            <StatCard number="98%" label="Satisfação" delay={0.3} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-24 bg-gray-50">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Tudo que você precisa para
              <span className="text-[#9AE66E]"> vender mais</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas para transformar seu conhecimento em um negócio próspero
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<CreditCard className="w-7 h-7 text-blue-600" />}
              title="Checkout Otimizado"
              description="Página de pagamento personalizada com alta conversão e múltiplos métodos de pagamento."
              color="bg-blue-100"
              delay={0}
            />
            <FeatureCard
              icon={<Users className="w-7 h-7 text-purple-600" />}
              title="Sistema de Afiliados"
              description="Expanda suas vendas com afiliados. Eles vendem, você paga comissão."
              color="bg-purple-100"
              delay={0.1}
            />
            <FeatureCard
              icon={<Zap className="w-7 h-7 text-yellow-600" />}
              title="Order Bump"
              description="Aumente o ticket médio oferecendo produtos complementares no checkout."
              color="bg-yellow-100"
              delay={0.2}
            />
            <FeatureCard
              icon={<Globe className="w-7 h-7 text-green-600" />}
              title="Área de Membros"
              description="Entregue seus cursos com uma área de membros moderna e profissional."
              color="bg-green-100"
              delay={0.3}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <FeatureCard
              icon={<Lock className="w-7 h-7 text-red-600" />}
              title="Pagamentos Seguros"
              description="Transações protegidas com criptografia. Multicaixa, cartões e mais."
              color="bg-red-100"
              delay={0.4}
            />
            <FeatureCard
              icon={<Smartphone className="w-7 h-7 text-indigo-600" />}
              title="App Nativo"
              description="Gerencie suas vendas pelo celular com nosso app para iOS e Android."
              color="bg-indigo-100"
              delay={0.5}
            />
            <FeatureCard
              icon={<TrendingUp className="w-7 h-7 text-teal-600" />}
              title="Analytics Completo"
              description="Dashboards detalhados para acompanhar vendas, conversões e receita."
              color="bg-teal-100"
              delay={0.6}
            />
            <FeatureCard
              icon={<Award className="w-7 h-7 text-orange-600" />}
              title="Certificados"
              description="Emita certificados automáticos para seus alunos ao final dos cursos."
              color="bg-orange-100"
              delay={0.7}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Comece a vender em
              <span className="text-[#9AE66E]"> 3 passos</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simples, rápido e sem complicações
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Crie sua conta",
                description: "Cadastre-se gratuitamente em menos de 2 minutos. Sem cartão de crédito."
              },
              {
                step: "02", 
                title: "Publique seu produto",
                description: "Upload do seu curso, e-book ou serviço. Configure preços e checkout."
              },
              {
                step: "03",
                title: "Receba pagamentos",
                description: "Compartilhe seu link e receba pagamentos de forma automática."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative text-center"
              >
                <div className="text-8xl font-bold text-[#9AE66E]/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 -mt-12">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/4 -right-4 transform translate-x-1/2">
                    <ChevronRight className="w-8 h-8 text-[#9AE66E]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-24 bg-gray-900 text-white">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Preço simples,
              <span className="text-[#9AE66E]"> sem surpresas</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Sem mensalidade. Sem custos fixos. Pague apenas quando vender.
            </p>
          </motion.div>

          <div className="max-w-xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gray-800 rounded-3xl p-8 md:p-12 border border-gray-700 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-[#9AE66E] text-gray-900 px-4 py-1 text-sm font-semibold rounded-bl-xl">
                Mais Popular
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-4">Plano Comissão</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-6xl font-bold text-[#9AE66E]">8,99%</span>
                  <span className="text-gray-400">por venda</span>
                </div>
                <p className="text-gray-400">Comece grátis, pague só quando vender</p>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Sem mensalidade ou taxa de adesão",
                  "Checkout personalizado profissional",
                  "Sistema completo de afiliados",
                  "Order Bump para aumentar vendas",
                  "Integração com Facebook Pixel",
                  "Área de membros ilimitada",
                  "Pagamento em até 3 dias úteis",
                  "Suporte prioritário via WhatsApp"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9AE66E]/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#9AE66E]" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <motion.button
                onClick={() => handleAuthNavigation('signup')}
                className="w-full bg-[#9AE66E] text-gray-900 py-4 rounded-full text-lg font-semibold hover:bg-[#8AD65E] transition-all duration-200 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Começar Agora Grátis
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-24 bg-[#9AE66E]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
                Gerencie suas vendas de qualquer lugar
              </h2>
              <p className="text-lg text-gray-800 mb-8">
                Baixe o app Kambafy e tenha controle total do seu negócio na palma da mão. Acompanhe vendas, gerencie produtos e receba notificações em tempo real.
              </p>
              <div className="flex flex-wrap gap-4">
                <PlayStoreButton 
                  onClick={() => window.open('https://play.google.com/store/apps/details?id=com.converta.kambafy', '_blank')}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                />
                <AppStoreButton 
                  onClick={() => window.open('https://apps.apple.com/pt/app/kambafy/id6752709065', '_blank')}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative flex justify-center"
            >
              <FloatingElement>
                <div className="bg-gray-900 rounded-[3rem] p-4 shadow-2xl max-w-[280px]">
                  <div className="bg-gray-800 rounded-[2.5rem] p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-semibold">Vendas Hoje</span>
                        <span className="text-[#9AE66E] text-sm">+23%</span>
                      </div>
                      <div className="text-3xl font-bold text-white">Kz 145.000</div>
                      <div className="h-20 flex items-end gap-1">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div 
                            key={i} 
                            className="flex-1 bg-[#9AE66E] rounded-t"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">5 novos pedidos</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FloatingElement>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Perguntas
              <span className="text-[#9AE66E]"> frequentes</span>
            </h2>
            <p className="text-lg text-gray-600">
              Tire suas dúvidas sobre a plataforma
            </p>
          </motion.div>

          <div>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600 mb-4">Ainda tem dúvidas?</p>
            <Button 
              variant="outline" 
              className="border-[#9AE66E] text-gray-900 hover:bg-[#9AE66E]/10" 
              asChild
            >
              <SubdomainLink to="/ajuda">
                Falar com Suporte
              </SubdomainLink>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6">
              Pronto para transformar seu conhecimento em
              <span className="text-[#9AE66E]"> renda?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Junte-se a mais de 1000 criadores que já estão vendendo seus produtos digitais na Kambafy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => handleAuthNavigation('signup')}
                className="bg-[#9AE66E] text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#8AD65E] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Criar Conta Grátis
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-300 text-gray-700 hover:bg-gray-100 px-8 rounded-full" 
                onClick={() => navigate('/contato')}
              >
                Falar com Especialista
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <img src={kambafy_icon} alt="Kambafy" className="h-12 w-auto mb-4 brightness-200" />
              <p className="text-gray-500 text-sm">A maior plataforma lusófona de infoprodutos</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm">
                <li><SubdomainLink to="/como-funciona" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Como Funciona</SubdomainLink></li>
                <li><SubdomainLink to="/precos" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Preços</SubdomainLink></li>
                <li><SubdomainLink to="/recursos" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Recursos</SubdomainLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><SubdomainLink to="/ajuda" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Central de Ajuda</SubdomainLink></li>
                <li><SubdomainLink to="/contato" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Contacto</SubdomainLink></li>
                <li><SubdomainLink to="/denuncie" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Denuncie</SubdomainLink></li>
                <li><SubdomainLink to="/status" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Status</SubdomainLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><SubdomainLink to="/privacidade" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Privacidade</SubdomainLink></li>
                <li><SubdomainLink to="/termos" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Termos</SubdomainLink></li>
                <li><SubdomainLink to="/cookies" className="text-gray-500 hover:text-[#9AE66E] transition-colors">Cookies</SubdomainLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">© 2025 Kambafy. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InteractiveHero;
