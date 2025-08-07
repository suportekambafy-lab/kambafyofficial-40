
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PageLayout({ title, children }: PageLayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  
  // Verificar se estamos na área do cliente
  const isCustomerArea = location.pathname.includes('/minhas-compras');

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              {isCustomerArea ? (
                <Button onClick={handleLogout} variant="ghost" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Início
                  </Link>
                </Button>
              )}
              <div className="h-6 w-px bg-border"></div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </main>
    </div>
  );
}
