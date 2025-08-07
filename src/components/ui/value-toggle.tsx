import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ValueToggleProps {
  showValue: boolean;
  onToggle: () => void;
  value: string;
  hiddenText?: string;
  className?: string;
}

export function ValueToggle({ 
  showValue, 
  onToggle, 
  value, 
  hiddenText = "••••••••",
  className = ""
}: ValueToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-2xl md:text-3xl font-bold">
        {showValue ? value : hiddenText}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-6 w-6 p-0"
      >
        {showValue ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Button>
    </div>
  );
}