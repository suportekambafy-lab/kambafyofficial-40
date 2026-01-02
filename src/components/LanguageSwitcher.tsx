import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLanguageRoute } from '@/hooks/useLanguageRoute';
import { type Language } from '@/utils/routeTranslations';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇦🇴' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'sm',
  className = '',
  showLabel = false
}: LanguageSwitcherProps) {
  const { currentLanguage, switchLanguage } = useLanguageRoute();
  
  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={`gap-1.5 ${className}`}
        >
          <Globe className="w-4 h-4" />
          {showLabel && (
            <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`cursor-pointer gap-2 ${
              currentLanguage === lang.code ? 'bg-accent' : ''
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
