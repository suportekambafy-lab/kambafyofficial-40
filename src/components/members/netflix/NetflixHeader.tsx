import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User, ChevronDown, Menu, X, LogOut, Settings, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NetflixHeaderProps {
  logoUrl?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
  notificationCount?: number;
}

export function NetflixHeader({
  logoUrl,
  userName,
  userEmail,
  userAvatar,
  onSearch,
  onLogout,
  onProfileClick,
  onNotificationsClick,
  notificationCount = 0,
}: NetflixHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-[hsl(var(--netflix-bg))]/95 backdrop-blur-md shadow-lg' 
          : 'bg-gradient-to-b from-black/80 to-transparent'
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between h-16 md:h-20 px-4 md:px-12 lg:px-16">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-6 md:gap-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-primary" />
                <span className="text-xl font-bold text-white hidden md:inline">Academy</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button className="text-white font-medium text-sm hover:text-white/80 transition-colors">
              Home
            </button>
            <button className="text-white/70 text-sm hover:text-white transition-colors">
              Meus Cursos
            </button>
            <button className="text-white/70 text-sm hover:text-white transition-colors">
              Comunidade
            </button>
          </nav>
        </div>

        {/* Right: Search, Notifications, Profile */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Search */}
          <div className="relative">
            {isSearchOpen ? (
              <motion.form
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                onSubmit={handleSearchSubmit}
                className="flex items-center"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <Input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-9 bg-black/60 border-white/30 text-white placeholder:text-white/40 text-sm w-[200px]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>
                </div>
              </motion.form>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="text-white/70 hover:text-white hover:bg-transparent"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative text-white/70 hover:text-white hover:bg-transparent"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-8 h-8 border-2 border-transparent hover:border-white/50 transition-colors">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {getInitials(userName, userEmail)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-white/70 hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-[hsl(var(--netflix-surface))] border-[hsl(var(--netflix-border))] text-white"
            >
              <div className="px-3 py-2 border-b border-[hsl(var(--netflix-border))]">
                <p className="font-medium text-sm">{userName || 'Usuário'}</p>
                <p className="text-xs text-white/50 truncate">{userEmail}</p>
              </div>
              <DropdownMenuItem 
                onClick={onProfileClick}
                className="cursor-pointer hover:bg-white/10"
              >
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-white/10">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[hsl(var(--netflix-border))]" />
              <DropdownMenuItem 
                onClick={onLogout}
                className="cursor-pointer hover:bg-white/10 text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white/70 hover:text-white hover:bg-transparent"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-[hsl(var(--netflix-bg))]/95 backdrop-blur-md border-t border-white/10"
        >
          <nav className="flex flex-col p-4 gap-3">
            <button className="text-white font-medium text-left py-2">Home</button>
            <button className="text-white/70 text-left py-2">Meus Cursos</button>
            <button className="text-white/70 text-left py-2">Comunidade</button>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
