import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Filter, CheckSquare, Calendar, User, Mail, Package, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Affiliate {
  id: string;
  affiliate_name: string;
  affiliate_email: string;
  commission_rate: string;
  status: string;
  requested_at: string;
  approved_at?: string;
  products?: {
    name: string;
  };
}

const statusMap = {
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  recusado: { label: 'Recusado', color: 'bg-red-100 text-red-800' },
  bloqueado: { label: 'Bloqueado', color: 'bg-red-100 text-red-800' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

export default function MeusAfiliados() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('ativos');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [filteredAffiliates, setFilteredAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAffiliates, setSelectedAffiliates] = useState<string[]>([]);
  const { toast } = useCustomToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAffiliates();
  }, []);

  useEffect(() => {
    filterAffiliates();
  }, [affiliates, searchTerm, selectedTab]);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.log('❌ Usuário não encontrado para buscar afiliados');
        return;
      }

      console.log('🔍 Buscando afiliados para vendedor:', user.id);
      
      // Buscar afiliados apenas dos produtos do vendedor logado
      const { data: affiliatesData, error } = await supabase
        .from('affiliates')
        .select(`
          *,
          products!inner (
            name,
            user_id
          )
        `)
        .eq('products.user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar afiliados:', error);
        toast({ message: 'Erro ao carregar afiliados' });
        return;
      }

      if (affiliatesData) {
        console.log('✅ Afiliados encontrados para este vendedor:', affiliatesData.length);
        setAffiliates(affiliatesData);
      } else {
        console.log('ℹ️ Nenhum afiliado encontrado para este vendedor');
        setAffiliates([]);
      }
    } catch (error) {
      console.error('Erro ao buscar afiliados:', error);
      toast({ message: 'Erro ao carregar afiliados' });
    } finally {
      setLoading(false);
    }
  };

  const filterAffiliates = () => {
    let filtered = [...affiliates];

    // Filter by tab (status)
    if (selectedTab === 'ativos') {
      filtered = filtered.filter(affiliate => affiliate.status === 'ativo');
    } else if (selectedTab === 'pendentes') {
      filtered = filtered.filter(affiliate => affiliate.status === 'pendente');
    } else if (selectedTab === 'recusados-bloqueados-cancelados') {
      filtered = filtered.filter(affiliate => 
        ['recusado', 'bloqueado', 'cancelado'].includes(affiliate.status)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(affiliate =>
        affiliate.affiliate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        affiliate.affiliate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (affiliate.products?.name && affiliate.products.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredAffiliates(filtered);
  };

  const handleStatusUpdate = async (affiliateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ 
          status: newStatus,
          approved_at: newStatus === 'ativo' ? new Date().toISOString() : null
        })
        .eq('id', affiliateId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast({ message: 'Erro ao atualizar status do afiliado' });
        return;
      }

      toast({ message: 'Status do afiliado atualizado com sucesso!' });
      fetchAffiliates();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({ message: 'Erro ao atualizar status do afiliado' });
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedAffiliates.length === 0) {
      toast({ message: 'Selecione pelo menos um afiliado' });
      return;
    }

    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ 
          status: newStatus,
          approved_at: newStatus === 'ativo' ? new Date().toISOString() : null
        })
        .in('id', selectedAffiliates);

      if (error) {
        console.error('Erro ao atualizar status em massa:', error);
        toast({ message: 'Erro ao atualizar status dos afiliados' });
        return;
      }

      toast({ message: `${selectedAffiliates.length} afiliado(s) atualizado(s) com sucesso!` });
      setSelectedAffiliates([]);
      fetchAffiliates();
    } catch (error) {
      console.error('Erro ao atualizar status em massa:', error);
      toast({ message: 'Erro ao atualizar status dos afiliados' });
    }
  };

  const handleSelectAffiliate = (affiliateId: string) => {
    setSelectedAffiliates(prev => 
      prev.includes(affiliateId) 
        ? prev.filter(id => id !== affiliateId)
        : [...prev, affiliateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAffiliates.length === filteredAffiliates.length) {
      setSelectedAffiliates([]);
    } else {
      setSelectedAffiliates(filteredAffiliates.map(affiliate => affiliate.id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <PageSkeleton variant="affiliates" />;
  }

  return (
    <ProtectedRoute>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('affiliates.title')}</h1>
        
        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto">
            <TabsTrigger value="ativos" className="text-center">
              {t('affiliates.active')}
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-center">
              {t('affiliates.pending')}
            </TabsTrigger>
            <TabsTrigger value="recusados-bloqueados-cancelados" className="text-center">
              {t('affiliates.rejected')}
            </TabsTrigger>
          </TabsList>

          {/* Search and Actions */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    disabled={selectedAffiliates.length === 0}
                    onClick={() => handleBulkStatusUpdate('ativo')}
                  >
                    Aprovar selecionados
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled={selectedAffiliates.length === 0}
                    onClick={() => handleBulkStatusUpdate('recusado')}
                  >
                    Recusar selecionados
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    disabled={selectedAffiliates.length === 0}
                    onClick={() => handleBulkStatusUpdate('bloqueado')}
                  >
                    Bloquear selecionados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" className="flex items-center gap-2 text-foreground">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredAffiliates.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhum registro encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedAffiliates.length === filteredAffiliates.length}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>E-Mail</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Comissão</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAffiliates.map((affiliate) => (
                            <TableRow key={affiliate.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedAffiliates.includes(affiliate.id)}
                                  onCheckedChange={() => handleSelectAffiliate(affiliate.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatDate(affiliate.requested_at)}
                              </TableCell>
                              <TableCell>{affiliate.affiliate_name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {affiliate.affiliate_email}
                              </TableCell>
                              <TableCell>
                                {affiliate.products?.name || 'Produto não encontrado'}
                              </TableCell>
                              <TableCell>{affiliate.commission_rate}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={statusMap[affiliate.status as keyof typeof statusMap]?.color}
                                >
                                  {statusMap[affiliate.status as keyof typeof statusMap]?.label || affiliate.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {affiliate.status === 'pendente' && (
                                      <>
                                        <DropdownMenuItem 
                                          onClick={() => handleStatusUpdate(affiliate.id, 'ativo')}
                                        >
                                          Aprovar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleStatusUpdate(affiliate.id, 'recusado')}
                                        >
                                          Recusar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {affiliate.status === 'ativo' && (
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(affiliate.id, 'bloqueado')}
                                      >
                                        Bloquear
                                      </DropdownMenuItem>
                                    )}
                                    {(affiliate.status === 'recusado' || affiliate.status === 'bloqueado') && (
                                      <DropdownMenuItem 
                                        onClick={() => handleStatusUpdate(affiliate.id, 'ativo')}
                                      >
                                        Reativar
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusUpdate(affiliate.id, 'cancelado')}
                                      className="text-red-600"
                                    >
                                      Cancelar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {filteredAffiliates.map((affiliate) => (
                    <Card key={affiliate.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedAffiliates.includes(affiliate.id)}
                              onCheckedChange={() => handleSelectAffiliate(affiliate.id)}
                            />
                            <CardTitle className="text-base">{affiliate.affiliate_name}</CardTitle>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {affiliate.status === 'pendente' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusUpdate(affiliate.id, 'ativo')}
                                  >
                                    Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusUpdate(affiliate.id, 'recusado')}
                                  >
                                    Recusar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {affiliate.status === 'ativo' && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(affiliate.id, 'bloqueado')}
                                >
                                  Bloquear
                                </DropdownMenuItem>
                              )}
                              {(affiliate.status === 'recusado' || affiliate.status === 'bloqueado') && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusUpdate(affiliate.id, 'ativo')}
                                >
                                  Reativar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(affiliate.id, 'cancelado')}
                                className="text-red-600"
                              >
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Data:</span>
                            <span className="font-medium">{formatDate(affiliate.requested_at)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">E-mail:</span>
                            <span className="font-medium">{affiliate.affiliate_email}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Produto:</span>
                            <span className="font-medium">{affiliate.products?.name || 'Produto não encontrado'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Comissão:</span>
                            <span className="font-medium">{affiliate.commission_rate}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge 
                              className={statusMap[affiliate.status as keyof typeof statusMap]?.color}
                            >
                              {statusMap[affiliate.status as keyof typeof statusMap]?.label || affiliate.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </ProtectedRoute>
  );
}