import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function AdminRegionSelect() {
  const { admin, logout, loading } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Selecionar Região
          </h1>
          <p className="text-muted-foreground">
            Olá, {admin.full_name || admin.email}
          </p>
        </div>

        {/* Region Cards */}
        <div className="grid gap-4">
          {/* Angola */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/admin')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <span className="text-4xl">🇦🇴</span>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Angola</h2>
                <p className="text-sm text-muted-foreground">
                  Painel principal com todas as transações
                </p>
              </div>
              <div className="text-muted-foreground">→</div>
            </CardContent>
          </Card>

          {/* Moçambique */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/admin/moz')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <span className="text-4xl">🇲🇿</span>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Moçambique</h2>
                <p className="text-sm text-muted-foreground">
                  Transações em MZN (M-Pesa, E-Mola)
                </p>
              </div>
              <div className="text-muted-foreground">→</div>
            </CardContent>
          </Card>
        </div>

        {/* Logout Button */}
        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Terminar Sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
