import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingOverlayProps {
  targetSelector: string;
  isActive: boolean;
}

export function OnboardingOverlay({ targetSelector, isActive }: OnboardingOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const updateTargetPosition = () => {
      const target = document.querySelector(`[data-onboarding="${targetSelector}"]`);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    updateTargetPosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updateTargetPosition, true);
    window.addEventListener('resize', updateTargetPosition);

    return () => {
      window.removeEventListener('scroll', updateTargetPosition, true);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [targetSelector, isActive]);

  if (!isActive || !targetRect) return null;

  const padding = 8;

  return (
    <>
      {/* Overlay escuro */}
      <div className="fixed inset-0 bg-black/60 z-[9998] animate-in fade-in duration-300" />
      
      {/* Spotlight no elemento destacado */}
      <div
        className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-300"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px 4px rgba(var(--primary), 0.3)',
          borderRadius: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      
      {/* Border animado */}
      <div
        className="fixed z-[9999] pointer-events-none animate-pulse"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          border: '2px solid hsl(var(--primary))',
          borderRadius: '8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </>
  );
}
