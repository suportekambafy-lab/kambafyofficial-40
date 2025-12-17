import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  ShoppingCart, 
  Users, 
  Coins, 
  Search,
  Mail,
  Package,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ChatCredit {
  id: string;
  user_id: string;
  token_balance: number;
  total_tokens_purchased: number;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface RecoverySetting {
  id: string;
  user_id: string;
  product_id: string;
  enabled: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  product?: {
    name: string | null;
  };
}

const AdminApps = () => {
  const [chatCredits, setChatCredits] = useState<ChatCredit[]>([]);
  const [recoverySettings, setRecoverySettings] = useState<RecoverySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchChat, setSearchChat] = useState('');
  const [searchRecovery, setSearchRecovery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Load chat credits with profile info
    const { data: credits, error: creditsError } = await supabase
      .from('seller_chat_credits')
      .select('*')
      .gt('total_tokens_purchased', 0)
      .order('total_tokens_purchased', { ascending: false });

    if (!creditsError && credits) {
      // Fetch profiles for each user
      const userIds = credits.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setChatCredits(credits.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id)
      })));
    }

    // Load recovery settings with profile and product info
    const { data: recovery, error: recoveryError } = await supabase
      .from('sales_recovery_settings')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    if (!recoveryError && recovery) {
      // Fetch profiles and products
      const userIds = recovery.map(r => r.user_id);
      const productIds = recovery.map(r => r.product_id);
      
      const [profilesRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds),
        supabase.from('products').select('id, name').in('id', productIds)
      ]);
      
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const productMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);
      
      setRecoverySettings(recovery.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id),
        product: productMap.get(r.product_id)
      })));
    }

    setLoading(false);
  };

  const totalTokensSold = chatCredits.reduce((acc, c) => acc + (c.total_tokens_purchased || 0), 0);
  const totalTokensBalance = chatCredits.reduce((acc, c) => acc + (c.token_balance || 0), 0);
  const totalTokensUsed = chatCredits.reduce((acc, c) => acc + (c.total_tokens_used || 0), 0);

  const filteredChatCredits = chatCredits.filter(c => {
    if (!searchChat) return true;
    const search = searchChat.toLowerCase();
    return (
      c.profile?.full_name?.toLowerCase().includes(search) ||
      c.profile?.email?.toLowerCase().includes(search)
    );
  });

  const filteredRecoverySettings = recoverySettings.filter(r => {
    if (!searchRecovery) return true;
    const search = searchRecovery.toLowerCase();
    return (
      r.profile?.full_name?.toLowerCase().includes(search) ||
      r.profile?.email?.toLowerCase().includes(search) ||
      r.product?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--admin-text))]">Apps dos Vendedores</h1>
        <p className="text-[hsl(var(--admin-text-secondary))]">
          Gerencie e monitore os apps ativos na plataforma
        </p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat IA
            <Badge variant="secondary" className="ml-1">{chatCredits.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Recuperação
            <Badge variant="secondary" className="ml-1">{recoverySettings.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedores</p>
                    <p className="text-2xl font-bold">{chatCredits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Vendidos</p>
                    <p className="text-2xl font-bold">{totalTokensSold.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Usados</p>
                    <p className="text-2xl font-bold">{totalTokensUsed.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Total</p>
                    <p className="text-2xl font-bold">{totalTokensBalance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar vendedor..."
              value={searchChat}
              onChange={(e) => setSearchChat(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendedores com Chat IA</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredChatCredits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum vendedor com tokens comprados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vendedor</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comprados</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Usados</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saldo</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Última Atualização</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChatCredits.map((credit) => (
                        <tr key={credit.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {credit.profile?.full_name || 'Nome não disponível'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {credit.profile?.email || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {credit.total_tokens_purchased?.toLocaleString() || 0}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {credit.total_tokens_used?.toLocaleString() || 0}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={credit.token_balance > 0 ? 'default' : 'secondary'}>
                              {credit.token_balance?.toLocaleString() || 0}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {format(new Date(credit.updated_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Configurações Ativas</p>
                    <p className="text-2xl font-bold">{recoverySettings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedores</p>
                    <p className="text-2xl font-bold">
                      {new Set(recoverySettings.map(r => r.user_id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                    <p className="text-2xl font-bold">
                      {new Set(recoverySettings.map(r => r.product_id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar vendedor ou produto..."
              value={searchRecovery}
              onChange={(e) => setSearchRecovery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurações de Recuperação de Carrinho</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : filteredRecoverySettings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma configuração de recuperação ativa
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vendedor</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Produto</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data Ativação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecoverySettings.map((setting) => (
                        <tr key={setting.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {setting.profile?.full_name || 'Nome não disponível'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {setting.profile?.email || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="max-w-[200px] truncate block">
                              {setting.product?.name || 'Produto não encontrado'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Ativo
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {format(new Date(setting.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminApps;
