
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  variant?: 'switch' | 'button';
}

export function ThemeToggle({ isDark, onToggle, variant = 'button' }: ThemeToggleProps) {
  if (variant === 'switch') {
    return (
      <div className="flex items-center space-x-2">
        <Sun className="h-4 w-4 text-amber-500" />
        <Switch
          checked={isDark}
          onCheckedChange={onToggle}
          aria-label="Alternar tema"
          className="data-[state=checked]:bg-primary"
        />
        <Moon className="h-4 w-4 text-amber-500" />
      </div>
    );
  }

  return (
    <div className="relative h-4 w-4">
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute top-0 left-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-amber-500" />
    </div>
  );
}
