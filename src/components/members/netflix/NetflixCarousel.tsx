import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
interface NetflixCarouselProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showSeeAll?: boolean;
  onSeeAllClick?: () => void;
}
export function NetflixCarousel({
  title,
  subtitle,
  children,
  showSeeAll = true,
  onSeeAllClick
}: NetflixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const {
      scrollLeft,
      scrollWidth,
      clientWidth
    } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };
  return <div className="relative w-full py-6 md:py-8 group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-16 mb-4 md:mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base md:text-lg font-medium text-white/90">
            {title}
          </h2>
          {subtitle && <span className="text-sm text-white/40 hidden md:inline">
              {subtitle}
            </span>}
        </div>
        {showSeeAll && <button onClick={onSeeAllClick} className="text-sm text-white/50 hover:text-white transition-colors">
            Ver mais
          </button>}
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <motion.div className={cn('absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20', 'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300', !canScrollLeft && 'hidden')} initial={false}>
          <Button variant="ghost" size="icon" onClick={() => scroll('left')} className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Scrollable Content */}
        <div ref={scrollRef} onScroll={checkScroll} className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide px-6 md:px-12 lg:px-16 scroll-smooth pb-2" style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
          {children}
        </div>

        {/* Right Arrow */}
        <motion.div className={cn('absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20', 'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300', !canScrollRight && 'hidden')} initial={false}>
          <Button variant="ghost" size="icon" onClick={() => scroll('right')} className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </div>;
}