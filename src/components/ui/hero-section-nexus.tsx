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
    type FormEvent,
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
import { BookOpen, DollarSign, Users, Shield, Star, Play, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubdomainLink } from "@/components/SubdomainLink";

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

const professionalWoman = '/lovable-uploads/09933f06-0001-46b9-9e43-62a0ebdd9868.png';
const professionalMan = '/lovable-uploads/730e6c93-f015-4eb9-a5cb-a980f00fcde0.png';

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

const ShinyText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => (
    <span className={cn("relative overflow-hidden inline-block", className)}>
        {text}
        <span style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'shine 2s infinite linear',
            opacity: 0.5,
            pointerEvents: 'none'
        }}></span>
        <style>{`
            @keyframes shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </span>
);

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

interface NavLinkProps {
    href?: string;
    children: ReactNode;
    className?: string;
    onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ href = "#", children, className = "", onClick }) => (
   <a
     href={href}
     onClick={onClick}
     className={cn("relative group text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 flex items-center py-1", className)}
   >
     {children}
     <span className="absolute bottom-[-2px] left-0 right-0 h-[1px] bg-[#0CF2A0] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
   </a>
);

interface Dot {
    x: number;
    y: number;
    baseColor: string;
    targetOpacity: number;
    currentOpacity: number;
    opacitySpeed: number;
    baseRadius: number;
    currentRadius: number;
}

const InteractiveHero: React.FC = () => {
   const navigate = useNavigate();
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const animationFrameId = useRef<number | null>(null);
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
   const [openDropdown, setOpenDropdown] = useState<string | null>(null);
   const [isScrolled, setIsScrolled] = useState<boolean>(false);

   const { scrollY } = useScroll();
   useMotionValueEvent(scrollY, "change", (latest) => {
       setIsScrolled(latest > 10);
   });

   const handleAuthNavigation = (mode: 'login' | 'signup') => {
     navigate(`/auth?mode=${mode}`);
   };

   const dotsRef = useRef<Dot[]>([]);
   const gridRef = useRef<Record<string, number[]>>({});
   const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
   const mousePositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

   const DOT_SPACING = 25;
   const BASE_OPACITY_MIN = 0.40;
   const BASE_OPACITY_MAX = 0.50;
   const BASE_RADIUS = 1;
   const INTERACTION_RADIUS = 150;
   const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
   const OPACITY_BOOST = 0.6;
   const RADIUS_BOOST = 2.5;
   const GRID_CELL_SIZE = Math.max(50, Math.floor(INTERACTION_RADIUS / 1.5));

   const handleMouseMove = useCallback((event: globalThis.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            mousePositionRef.current = { x: null, y: null };
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        mousePositionRef.current = { x: canvasX, y: canvasY };
   }, []);

   const createDots = useCallback(() => {
       const { width, height } = canvasSizeRef.current;
       if (width === 0 || height === 0) return;

       const newDots: Dot[] = [];
       const newGrid: Record<string, number[]> = {};
       const cols = Math.ceil(width / DOT_SPACING);
       const rows = Math.ceil(height / DOT_SPACING);

       for (let i = 0; i < cols; i++) {
           for (let j = 0; j < rows; j++) {
               const x = i * DOT_SPACING + DOT_SPACING / 2;
               const y = j * DOT_SPACING + DOT_SPACING / 2;
               const cellX = Math.floor(x / GRID_CELL_SIZE);
               const cellY = Math.floor(y / GRID_CELL_SIZE);
               const cellKey = `${cellX}_${cellY}`;

               if (!newGrid[cellKey]) {
                   newGrid[cellKey] = [];
               }

               const dotIndex = newDots.length;
               newGrid[cellKey].push(dotIndex);

               const baseOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
               newDots.push({
                   x,
                   y,
                   baseColor: `rgba(87, 220, 205, ${BASE_OPACITY_MAX})`,
                   targetOpacity: baseOpacity,
                   currentOpacity: baseOpacity,
                   opacitySpeed: (Math.random() * 0.005) + 0.002,
                   baseRadius: BASE_RADIUS,
                   currentRadius: BASE_RADIUS,
               });
           }
       }
       dotsRef.current = newDots;
       gridRef.current = newGrid;
   }, [DOT_SPACING, GRID_CELL_SIZE, BASE_OPACITY_MIN, BASE_OPACITY_MAX, BASE_RADIUS]);

   const handleResize = useCallback(() => {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const container = canvas.parentElement;
       const width = container ? container.clientWidth : window.innerWidth;
       const height = container ? container.clientHeight : window.innerHeight;

       if (canvas.width !== width || canvas.height !== height ||
           canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height)
       {
           canvas.width = width;
           canvas.height = height;
           canvasSizeRef.current = { width, height };
           createDots();
       }
   }, [createDots]);

   const animateDots = useCallback(() => {
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d');
       const dots = dotsRef.current;
       const grid = gridRef.current;
       const { width, height } = canvasSizeRef.current;
       const { x: mouseX, y: mouseY } = mousePositionRef.current;

       if (!ctx || !dots || !grid || width === 0 || height === 0) {
           animationFrameId.current = requestAnimationFrame(animateDots);
           return;
       }

       ctx.clearRect(0, 0, width, height);

       const activeDotIndices = new Set<number>();
       if (mouseX !== null && mouseY !== null) {
           const mouseCellX = Math.floor(mouseX / GRID_CELL_SIZE);
           const mouseCellY = Math.floor(mouseY / GRID_CELL_SIZE);
           const searchRadius = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE);
           for (let i = -searchRadius; i <= searchRadius; i++) {
               for (let j = -searchRadius; j <= searchRadius; j++) {
                   const checkCellX = mouseCellX + i;
                   const checkCellY = mouseCellY + j;
                   const cellKey = `${checkCellX}_${checkCellY}`;
                   if (grid[cellKey]) {
                       grid[cellKey].forEach(dotIndex => activeDotIndices.add(dotIndex));
                   }
               }
           }
       }

       dots.forEach((dot, index) => {
           dot.currentOpacity += dot.opacitySpeed;
           if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
               dot.opacitySpeed = -dot.opacitySpeed;
               dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX));
               dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
           }

           let interactionFactor = 0;
           dot.currentRadius = dot.baseRadius;

           if (mouseX !== null && mouseY !== null && activeDotIndices.has(index)) {
               const dx = dot.x - mouseX;
               const dy = dot.y - mouseY;
               const distSq = dx * dx + dy * dy;

               if (distSq < INTERACTION_RADIUS_SQ) {
                   const distance = Math.sqrt(distSq);
                   interactionFactor = Math.max(0, 1 - distance / INTERACTION_RADIUS);
                   interactionFactor = interactionFactor * interactionFactor;
               }
           }

           const finalOpacity = Math.min(1, dot.currentOpacity + interactionFactor * OPACITY_BOOST);
           dot.currentRadius = dot.baseRadius + interactionFactor * RADIUS_BOOST;

           const colorMatch = dot.baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
           const r = colorMatch ? colorMatch[1] : '87';
           const g = colorMatch ? colorMatch[2] : '220';
           const b = colorMatch ? colorMatch[3] : '205';

           ctx.beginPath();
           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity.toFixed(3)})`;
           ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
           ctx.fill();
       });

       animationFrameId.current = requestAnimationFrame(animateDots);
   }, [GRID_CELL_SIZE, INTERACTION_RADIUS, INTERACTION_RADIUS_SQ, OPACITY_BOOST, RADIUS_BOOST, BASE_OPACITY_MIN, BASE_OPACITY_MAX, BASE_RADIUS]);

   useEffect(() => {
       handleResize();
       const canvasElement = canvasRef.current;
        const handleMouseLeave = () => {
            mousePositionRef.current = { x: null, y: null };
        };

       window.addEventListener('mousemove', handleMouseMove, { passive: true });
       window.addEventListener('resize', handleResize);
       document.documentElement.addEventListener('mouseleave', handleMouseLeave);


       animationFrameId.current = requestAnimationFrame(animateDots);

       return () => {
           window.removeEventListener('resize', handleResize);
           window.removeEventListener('mousemove', handleMouseMove);
           document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
           if (animationFrameId.current) {
               cancelAnimationFrame(animationFrameId.current);
           }
       };
   }, [handleResize, handleMouseMove, animateDots]);

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
           backgroundColor: "rgba(17, 17, 17, 0.8)",
           borderBottomColor: "rgba(55, 65, 81, 0.5)",
           position: 'fixed',
           boxShadow: 'none',
       },
       scrolled: {
           backgroundColor: "rgba(17, 17, 17, 0.95)",
           borderBottomColor: "rgba(75, 85, 99, 0.7)",
           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
           position: 'fixed'
       }
   };

   const mobileMenuVariants: Variants = {
       hidden: { opacity: 0, y: -20 },
       visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
       exit: { opacity: 0, y: -20, transition: { duration: 0.15, ease: "easeIn" } }
   };

    const contentDelay = 0.3;
    const itemDelayIncrement = 0.1;

    const bannerVariants: Variants = {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: contentDelay } }
    };
   const headlineVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement } }
    };
    const subHeadlineVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 2 } }
    };
    const formVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 3 } }
    };
    const trialTextVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 4 } }
    };
    const worksWithVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 5 } }
    };
    const imageVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, delay: contentDelay + itemDelayIncrement * 6, ease: [0.16, 1, 0.3, 1] } }
    };

  return (
    <div className="relative bg-[#111111] text-gray-300 overflow-x-hidden">
        <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-80" />
        <div className="fixed inset-0 z-1 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, transparent 0%, #111111 90%), radial-gradient(ellipse at center, transparent 40%, #111111 95%)'
        }}></div>

        {/* Header */}
        <motion.header
            variants={headerVariants}
            initial="top"
            animate={isScrolled ? "scrolled" : "top"}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-6 w-full md:px-10 lg:px-16 sticky top-0 z-30 backdrop-blur-md border-b"
        >
            <nav className="flex justify-between items-center max-w-screen-xl mx-auto h-[70px]">
                <div className="flex items-center flex-shrink-0">
                    <img 
                      src="/kambafy-logo-green.png" 
                      alt="Kambafy" 
                      className="h-12 w-auto"
                    />
                </div>

                <div className="hidden md:flex items-center justify-center flex-grow space-x-6 lg:space-x-8 px-4">
                    <NavLink href="#recursos">Recursos</NavLink>
                    <NavLink href="#como-funciona">Como Funciona</NavLink>
                    <NavLink href="#precos">Preços</NavLink>
                    <NavLink href="#sobre">Sobre</NavLink>
                </div>

                <div className="flex items-center flex-shrink-0 space-x-4 lg:space-x-6">
                    <button onClick={() => handleAuthNavigation('login')} className="hidden md:inline-block text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">Entrar</button>

                    <motion.button
                        onClick={() => handleAuthNavigation('signup')}
                        className="bg-[#0CF2A0] text-[#111111] px-4 py-[6px] rounded-md text-sm font-semibold hover:bg-opacity-90 transition-colors duration-200 whitespace-nowrap shadow-sm hover:shadow-md"
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                        Começar Agora
                    </motion.button>

                    <motion.button
                        className="md:hidden text-gray-300 hover:text-white z-50"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    >
                        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </motion.button>
                </div>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        key="mobile-menu"
                        variants={mobileMenuVariants} initial="hidden" animate="visible" exit="exit"
                        className="md:hidden absolute top-full left-0 right-0 bg-[#111111]/95 backdrop-blur-sm shadow-lg py-4 border-t border-gray-800/50"
                    >
                        <div className="flex flex-col items-center space-y-4 px-6">
                            <a href="#recursos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Recursos</a>
                            <a href="#como-funciona" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Como Funciona</a>
                            <a href="#precos" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Preços</a>
                            <a href="#sobre" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sobre</a>
                            <hr className="w-full border-t border-gray-700/50 my-2"/>
                            <button onClick={() => handleAuthNavigation('login')} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Entrar</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>

        {/* Hero Section */}
        <main className="relative z-10">
          <section className="flex flex-col items-center justify-center text-center px-4 pt-32 pb-16">
            <motion.div
                variants={bannerVariants}
                initial="hidden"
                animate="visible"
                className="mb-6"
            >
                <ShinyText text="Plataforma #1 para Criadores Digitais" className="bg-[#1a1a1a] border border-gray-700 text-[#0CF2A0] px-4 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer hover:border-[#0CF2A0]/50 transition-colors" />
            </motion.div>

            <motion.h1
                variants={headlineVariants}
                initial="hidden"
                animate="visible"
                className="text-4xl sm:text-5xl lg:text-[64px] font-bold text-white leading-tight max-w-4xl mb-4"
            >
                Venda seus produtos<br />
                <span className="inline-block h-[1.2em] overflow-hidden align-bottom">
                    <RotatingText
                        texts={['digitais', 'criativos', 'exclusivos', 'incríveis', 'únicos']}
                        mainClassName="text-[#0CF2A0] mx-1"
                        staggerFrom={"last"}
                        initial={{ y: "-100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "110%", opacity: 0 }}
                        staggerDuration={0.01}
                        transition={{ type: "spring", damping: 18, stiffness: 250 }}
                        rotationInterval={2200}
                        splitBy="characters"
                        auto={true}
                        loop={true}
                    />
                </span>
            </motion.h1>

            <motion.p
                variants={subHeadlineVariants}
                initial="hidden"
                animate="visible"
                className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-8"
            >
                Crie, gerencie e venda seus cursos, e-books e produtos digitais em uma única plataforma. Tudo que você precisa para construir seu negócio online.
            </motion.p>

            <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto mb-3"
            >
                <motion.button
                    onClick={() => handleAuthNavigation('signup')}
                    className="w-full sm:w-auto bg-[#0CF2A0] text-[#111111] px-8 py-3 rounded-md text-base font-semibold hover:bg-opacity-90 transition-colors duration-200 shadow-lg hover:shadow-xl flex-shrink-0"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                    Começar a Vender
                </motion.button>
                <motion.button
                    className="w-full sm:w-auto bg-transparent border border-[#0CF2A0] text-[#0CF2A0] px-8 py-3 rounded-md text-base font-semibold hover:bg-[#0CF2A0]/10 transition-colors duration-200 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                >
                    <Play className="w-4 h-4" />
                    Ver Como Funciona
                </motion.button>
            </motion.div>

            <motion.p
                variants={trialTextVariants}
                initial="hidden"
                animate="visible"
                className="text-xs text-gray-500 mb-16"
            >
                Sem custos iniciais • Cancele quando quiser
            </motion.p>

            <motion.div
                variants={imageVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-5xl mx-auto px-4 sm:px-0"
            >
                <img
                    src="/lovable-uploads/be22ac17-d2d9-4d84-8ffa-3ed3d91cfaed.png"
                    alt="Plataforma Kambafy"
                    className="w-full h-auto object-cover rounded-lg shadow-2xl border border-gray-700/50"
                    loading="lazy"
                />
            </motion.div>
          </section>

          {/* Features Section */}
          <section id="recursos" className="py-24 px-6 relative z-10">
              <div className="mx-auto max-w-7xl">
                  <div className="text-center mb-16">
                      <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                          Tudo que Você Precisa para{' '}
                          <span className="text-[#0CF2A0]">Ter Sucesso</span>
                      </h2>
                      <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                          Ferramentas poderosas e simples para transformar seu conhecimento em um negócio próspero
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                          { icon: <BookOpen className="w-8 h-8" />, title: "Order Bump", description: "Aumente suas vendas com ofertas complementares no momento da compra." },
                          { icon: <DollarSign className="w-8 h-8" />, title: "Checkout Personalizado", description: "Customize completamente sua página de checkout para maximizar conversões." },
                          { icon: <Users className="w-8 h-8" />, title: "Pixel", description: "Integre Facebook Pixel e outras ferramentas de tracking para otimizar campanhas." },
                          { icon: <Shield className="w-8 h-8" />, title: "Afiliação", description: "Sistema completo de afiliados para expandir suas vendas através de parceiros." }
                      ].map((feature, index) => (
                          <div key={index} className="bg-[#1a1a1a] border border-gray-700/50 rounded-lg p-6 hover:border-[#0CF2A0]/50 transition-all duration-300">
                              <div className="text-[#0CF2A0] mb-4">{feature.icon}</div>
                              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                              <p className="text-gray-400">{feature.description}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 px-6 bg-[#0CF2A0]/5 relative z-10">
              <div className="mx-auto max-w-7xl">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                      {[
                          { number: "1000+", label: "Criadores Ativos" },
                          { number: "15k+", label: "Alunos Satisfeitos" },
                          { number: "500+", label: "Cursos Disponíveis" },
                          { number: "98%", label: "Satisfação dos Usuários" }
                      ].map((stat, index) => (
                          <div key={index}>
                              <div className="text-4xl font-bold text-[#0CF2A0] mb-2">{stat.number}</div>
                              <div className="text-gray-400">{stat.label}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* Testimonials Section */}
          <section className="py-24 px-6 relative z-10">
              <div className="mx-auto max-w-7xl">
                  <div className="text-center mb-16">
                      <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                          O que Dizem Nossos{' '}
                          <span className="text-[#0CF2A0]">Criadores</span>
                      </h2>
                      <p className="text-lg text-gray-400">
                          Histórias reais de pessoas que transformaram suas vidas com a Kambafy
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                          { name: "Maria Santos", role: "Criadora de Conteúdo", content: "A Kambafy mudou minha vida! Consegui monetizar meu conhecimento em marketing digital e hoje tenho uma renda extra consistente.", image: professionalWoman },
                          { name: "João Pedro", role: "Professor de Inglês", content: "Plataforma incrível! Muito fácil de usar e o suporte é excepcional. Recomendo para todos os educadores.", image: professionalMan },
                          { name: "Ana Luiza", role: "Coach de Vida", content: "O que mais me impressiona é a qualidade da plataforma e como ela foi pensada para o mercado angolano. Parabéns!", image: professionalWoman }
                      ].map((testimonial, index) => (
                          <div key={index} className="bg-[#1a1a1a] border border-gray-700/50 rounded-lg p-6">
                              <div className="flex items-center mb-4">
                                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                  <div className="flex">
                                      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-[#0CF2A0] fill-current" />)}
                                  </div>
                              </div>
                              <p className="text-gray-400 mb-4 italic">"{testimonial.content}"</p>
                              <div>
                                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* About Section */}
          <section id="sobre" className="py-24 px-6 bg-[#0CF2A0]/5 relative z-10">
              <div className="mx-auto max-w-7xl">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                      <div>
                          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                              Sobre a{' '}
                              <span className="text-[#0CF2A0]">Kambafy</span>
                          </h2>
                          <p className="text-lg text-gray-400 mb-6">
                              Somos uma startup angolana dedicada a democratizar o acesso ao conhecimento e 
                              empoderar criadores de conteúdo em toda Angola e países lusófonos.
                          </p>
                          <p className="text-lg text-gray-400 mb-8">
                              Nossa missão é criar uma ponte entre quem tem conhecimento e quem quer aprender, 
                              proporcionando oportunidades de crescimento pessoal e profissional para todos.
                          </p>
                          <div className="space-y-4">
                              {["Plataforma 100% nacional", "Pagamentos em multimoedas", "Suporte em português"].map((item, index) => (
                                  <div key={index} className="flex items-center space-x-3">
                                      <div className="w-2 h-2 bg-[#0CF2A0] rounded-full"></div>
                                      <span className="text-gray-300">{item}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="relative">
                          <img src={professionalMan} alt="Profissional" className="rounded-lg shadow-xl object-cover w-full h-96" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0CF2A0]/30 to-transparent rounded-lg"></div>
                      </div>
                  </div>
              </div>
          </section>

          {/* CTA Section */}
          <section className="py-24 px-6 relative z-10">
              <div className="mx-auto max-w-4xl text-center">
                  <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                      Pronto para{' '}
                      <span className="text-[#0CF2A0]">Começar?</span>
                  </h2>
                  <p className="text-lg text-gray-400 mb-8">
                      Cadastre-se gratuitamente e comece a monetizar seu conhecimento hoje mesmo
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                          size="lg" 
                          className="bg-[#0CF2A0] hover:bg-[#0CF2A0]/90 text-[#111111] px-8 text-lg"
                          onClick={() => handleAuthNavigation('signup')}
                      >
                          Criar Conta Grátis
                          <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                      <Button size="lg" variant="outline" className="border-[#0CF2A0] text-[#0CF2A0] hover:bg-[#0CF2A0]/10 px-8 text-lg">
                          Falar com Especialista
                      </Button>
                  </div>
              </div>
          </section>

          {/* Footer */}
          <footer className="bg-[#0a0a0a] text-gray-300 py-16 px-6 relative z-10 border-t border-gray-800">
              <div className="mx-auto max-w-7xl">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                      <div>
                          <img src="/kambafy-logo-green.png" alt="Kambafy" className="h-12 w-auto mb-4" />
                          <p className="text-gray-500 text-sm">A maior plataforma Lusófona de infoprodutos</p>
                      </div>
                      <div>
                          <h4 className="font-semibold text-white mb-4">Plataforma</h4>
                          <ul className="space-y-2 text-sm">
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Como Funciona</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Preços</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Recursos</a></li>
                          </ul>
                      </div>
                      <div>
                          <h4 className="font-semibold text-white mb-4">Suporte</h4>
                          <ul className="space-y-2 text-sm">
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Central de Ajuda</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Contacto</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Status</a></li>
                          </ul>
                      </div>
                      <div>
                          <h4 className="font-semibold text-white mb-4">Legal</h4>
                          <ul className="space-y-2 text-sm">
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Privacidade</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Termos</a></li>
                              <li><a href="#" className="text-gray-500 hover:text-white transition-colors">Cookies</a></li>
                          </ul>
                      </div>
                  </div>
                  <div className="border-t border-gray-800 pt-8 text-center">
                      <p className="text-gray-500 text-sm">© 2025 Kambafy. Todos os direitos reservados. Feito com ❤️ em Angola.</p>
                  </div>
              </div>
          </footer>
        </main>
    </div>
  );
};

export default InteractiveHero;
