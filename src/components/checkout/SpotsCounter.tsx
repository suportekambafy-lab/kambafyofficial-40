import React, { useState, useEffect, useRef } from 'react';

interface SpotsCounterProps {
  count: number;
  title: string;
  backgroundColor: string;
  textColor: string;
  mode?: 'automatic' | 'manual' | 'time-based';
  decrementInterval?: number;
}

export default function SpotsCounter({ 
  count, 
  title, 
  backgroundColor, 
  textColor,
  mode = 'manual',
  decrementInterval = 60
}: SpotsCounterProps) {
  const storageKey = `spots_counter_${title}_${count}`;
  const [currentCount, setCurrentCount] = useState(() => {
    if (mode !== 'time-based') return count;
    
    // Recuperar estado guardado do localStorage
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { count: savedCount, timestamp } = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
        const decrements = Math.floor(elapsed / decrementInterval);
        const calculatedCount = Math.max(0, savedCount - decrements);
        
        // Se chegou a zero, limpar e reiniciar
        if (calculatedCount === 0) {
          localStorage.removeItem(storageKey);
          return count;
        }
        
        return calculatedCount;
      } catch {
        return count;
      }
    }
    
    return count;
  });

  const lastSaveRef = useRef<number>(Date.now());

  useEffect(() => {
    if (mode !== 'time-based') {
      setCurrentCount(count);
      localStorage.removeItem(storageKey);
    }
  }, [count, mode, storageKey]);

  useEffect(() => {
    // Salvar estado no localStorage quando o contador mudar (modo time-based)
    if (mode === 'time-based' && currentCount > 0) {
      localStorage.setItem(storageKey, JSON.stringify({
        count: currentCount,
        timestamp: lastSaveRef.current
      }));
    } else if (currentCount === 0) {
      // Limpar localStorage quando chegar a zero
      localStorage.removeItem(storageKey);
    }
  }, [currentCount, mode, storageKey]);

  useEffect(() => {
    // Se o modo for time-based, decrementar automaticamente
    if (mode === 'time-based' && currentCount > 0) {
      const timer = setInterval(() => {
        lastSaveRef.current = Date.now();
        setCurrentCount(prev => {
          const newCount = Math.max(0, prev - 1);
          // Se chegou a zero, agendar reset após 5 segundos
          if (newCount === 0) {
            setTimeout(() => {
              localStorage.removeItem(storageKey);
              setCurrentCount(count);
            }, 5000);
          }
          return newCount;
        });
      }, decrementInterval * 1000);

      return () => clearInterval(timer);
    }
  }, [mode, decrementInterval, currentCount, count, storageKey]);

  return (
    <div 
      className="py-3 px-4 text-center"
      style={{ backgroundColor }}
    >
      <div 
        className="text-3xl font-montserrat font-black mb-1"
        style={{ color: textColor }}
      >
        {currentCount}
      </div>
      <div 
        className="text-sm font-montserrat font-bold tracking-wider"
        style={{ color: textColor }}
      >
        {title}
      </div>
    </div>
  );
}
