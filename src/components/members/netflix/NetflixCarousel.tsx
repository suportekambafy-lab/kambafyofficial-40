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
  showSeeAll = false,
  onSeeAllClick,
}: NetflixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full py-4 md:py-6 group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-12 lg:px-16 mb-3 md:mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">
            {title}
          </h2>
          {subtitle && (
            <span className="text-sm text-white/50 hidden md:inline">
              {subtitle}
            </span>
          )}
        </div>
        {showSeeAll && (
          <button
            onClick={onSeeAllClick}
            className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1"
          >
            Ver tudo
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <motion.div
          className={cn(
            'absolute left-0 top-0 bottom-0 z-20 flex items-center',
            'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300',
            !canScrollLeft && 'hidden'
          )}
          initial={false}
        >
          <div className="h-full w-12 md:w-16 bg-gradient-to-r from-[hsl(var(--netflix-bg))] to-transparent flex items-center justify-start pl-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>
        </motion.div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 lg:px-16 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>

        {/* Right Arrow */}
        <motion.div
          className={cn(
            'absolute right-0 top-0 bottom-0 z-20 flex items-center',
            'opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300',
            !canScrollRight && 'hidden'
          )}
          initial={false}
        >
          <div className="h-full w-12 md:w-16 bg-gradient-to-l from-[hsl(var(--netflix-bg))] to-transparent flex items-center justify-end pr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
