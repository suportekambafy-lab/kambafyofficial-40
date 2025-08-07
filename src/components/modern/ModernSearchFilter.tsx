
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Package,
  TrendingUp,
  DollarSign,
  HelpCircle,
  Settings,
  Users,
  Store,
  Zap,
  BarChart3,
  UserPlus,
  Home
} from 'lucide-react';

interface SearchOption {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  group: string;
}

const searchOptions: SearchOption[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral das suas métricas',
    path: '/vendedor',
    icon: <Home className="h-4 w-4" />,
    group: 'Principal'
  },
  {
    id: 'products',
    title: 'Produtos',
    description: 'Gerir os seus produtos',
    path: '/vendedor/produtos',
    icon: <Package className="h-4 w-4" />,
    group: 'Principal'
  },
  {
    id: 'sales',
    title: 'Vendas',
    description: 'Histórico de vendas',
    path: '/vendedor/vendas',
    icon: <TrendingUp className="h-4 w-4" />,
    group: 'Principal'
  },
  {
    id: 'financial',
    title: 'Financeiro',
    description: 'Controle financeiro',
    path: '/vendedor/financeiro',
    icon: <DollarSign className="h-4 w-4" />,
    group: 'Principal'
  },
  {
    id: 'marketplace',
    title: 'Kamba Extra',
    description: 'Produtos para afiliação',
    path: '/vendedor/marketplace',
    icon: <Store className="h-4 w-4" />,
    group: 'Ferramentas'
  },
  {
    id: 'apps',
    title: 'Apps',
    description: 'Integrações e aplicações',
    path: '/vendedor/apps',
    icon: <Zap className="h-4 w-4" />,
    group: 'Ferramentas'
  },
  {
    id: 'reports',
    title: 'Relatórios',
    description: 'Relatórios detalhados',
    path: '/vendedor/relatorios',
    icon: <BarChart3 className="h-4 w-4" />,
    group: 'Ferramentas'
  },
  {
    id: 'members',
    title: 'Membros',
    description: 'Gerir membros da equipa',
    path: '/vendedor/membros',
    icon: <Users className="h-4 w-4" />,
    group: 'Configurações'
  },
  {
    id: 'affiliates',
    title: 'Afiliados',
    description: 'Programa de afiliados',
    path: '/vendedor/afiliados',
    icon: <UserPlus className="h-4 w-4" />,
    group: 'Configurações'
  },
  {
    id: 'settings',
    title: 'Configurações',
    description: 'Configurações da conta',
    path: '/vendedor/configuracoes',
    icon: <Settings className="h-4 w-4" />,
    group: 'Configurações'
  },
  {
    id: 'help',
    title: 'Ajuda',
    description: 'Centro de ajuda',
    path: '/vendedor/ajuda',
    icon: <HelpCircle className="h-4 w-4" />,
    group: 'Configurações'
  }
];

interface ModernSearchFilterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModernSearchFilter({ open, onOpenChange }: ModernSearchFilterProps) {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const groupedOptions = searchOptions.reduce((acc, option) => {
    if (!acc[option.group]) {
      acc[option.group] = [];
    }
    acc[option.group].push(option);
    return acc;
  }, {} as Record<string, SearchOption[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Pesquisar..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {Object.entries(groupedOptions).map(([group, options]) => (
          <CommandGroup key={group} heading={group}>
            {options.map((option) => (
              <CommandItem
                key={option.id}
                value={`${option.title} ${option.description}`}
                onSelect={() => handleSelect(option.path)}
                className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-accent rounded-lg transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {option.icon}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {option.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
