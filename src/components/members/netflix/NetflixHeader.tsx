import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, User, ChevronDown, Menu, X, LogOut, Settings, BookOpen, Home, PlayCircle, Users } from 'lucide-react';
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
import kambafyLogo from '@/assets/kambafy-logo-gray.png';

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
  activeTab?: 'home' | 'courses' | 'community';
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
  activeTab = 'home',
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

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'courses', label: 'Meus Cursos', icon: PlayCircle },
    { id: 'community', label: 'Comunidade', icon: Users },
  ];

  return (
    <motion.header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500 netflix-header',
        isScrolled && 'scrolled'
      )}
      style={{ background: 'transparent' }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between h-20 md:h-24 px-6 md:px-12 lg:px-16">
        {/* Left: Kambafy Logo */}
        <div className="flex items-center gap-8">
          <img 
            src={kambafyLogo} 
            alt="Kambafy" 
            className="h-8 md:h-10 w-auto object-contain"
          />

          {/* Desktop Navigation - Netflix Style Pills */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-stone-800/60 backdrop-blur-xl rounded-full p-1.5 border border-amber-900/20">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    'px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                    activeTab === item.id
                      ? 'bg-amber-600/30 text-amber-100'
                      : 'text-stone-300 hover:text-amber-100'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Right: Search, Notifications, Profile */}
        <div className="flex items-center gap-4">
          {/* Search Bar - Netflix Style */}
          <div className="hidden md:block relative">
            <div className="flex items-center bg-stone-800/60 backdrop-blur-xl rounded-full px-4 py-2.5 w-[200px] lg:w-[280px] border border-amber-900/20">
              <Search className="w-4 h-4 text-amber-200/50 mr-3" />
              <input
                type="text"
                placeholder="Search app"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-amber-100 text-sm placeholder:text-stone-400 w-full"
              />
            </div>
          </div>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="md:hidden text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full w-10 h-10"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 rounded-full text-[10px] font-bold flex items-center justify-center text-stone-900">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 rounded-full hover:bg-amber-900/20">
                <Avatar className="w-9 h-9 ring-2 ring-amber-600/40 ring-offset-1 ring-offset-transparent">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-600 to-orange-700 text-stone-900 text-sm font-semibold">
                    {getInitials(userName, userEmail)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-52 bg-stone-900/95 backdrop-blur-xl border-amber-900/30 text-stone-100 rounded-xl p-1 mt-2"
            >
              <div className="px-3 py-3 border-b border-amber-900/30">
                <p className="font-semibold text-sm text-amber-100">{userName || 'Usuário'}</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">{userEmail}</p>
              </div>
              <DropdownMenuItem 
                onClick={onProfileClick}
                className="cursor-pointer hover:bg-amber-900/20 rounded-lg m-1 text-stone-200"
              >
                <User className="w-4 h-4 mr-3" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-amber-900/20 rounded-lg m-1 text-stone-200">
                <Settings className="w-4 h-4 mr-3" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-amber-900/30 my-1" />
              <DropdownMenuItem 
                onClick={onLogout}
                className="cursor-pointer hover:bg-red-500/20 text-red-400 rounded-lg m-1"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-stone-300 hover:text-amber-100 hover:bg-amber-900/20 rounded-full"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden px-6 pb-4"
        >
          <div className="flex items-center bg-stone-800/60 backdrop-blur-sm rounded-full px-4 py-2 border border-amber-900/20">
            <Search className="w-4 h-4 text-amber-200/50 mr-2" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-amber-100 text-sm placeholder:text-stone-400 w-full"
              autoFocus
            />
            <button onClick={() => setIsSearchOpen(false)}>
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-stone-900/95 backdrop-blur-xl border-t border-amber-900/20"
        >
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                  activeTab === item.id
                    ? 'bg-amber-600/20 text-amber-100 font-medium'
                    : 'text-stone-300 hover:bg-amber-900/10'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
