import React, { useMemo, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, DollarSign, RefreshCw, CheckCircle, XCircle, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWithdrawalRequests } from '@/hooks/useWithdrawalRequests';
import { useWithdrawalProcessor } from '@/hooks/useWithdrawalProcessor';
import { useBulkWithdrawalProcessor } from '@/hooks/useBulkWithdrawalProcessor';
import { WithdrawalRequestCard } from '@/components/admin/WithdrawalRequestCard';
import { SEO } from '@/components/SEO';
export default function AdminWithdrawals() {
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const { requests, rawRequests, loading, loadWithdrawalRequests } = useWithdrawalRequests();
  const { processingId, notes, setNotes, processRequest } = useWithdrawalProcessor(() => {
    // Recarregar dados imediatamente após processamento
    loadWithdrawalRequests();
  });
  const { 
    processing: bulkProcessing, 
    selectedIds, 
    toggleSelection, 
    selectAll, 
    clearSelection, 
    processBulkRequests 
  } = useBulkWithdrawalProcessor(() => {
    // Recarregar dados imediatamente após processamento em lote
    loadWithdrawalRequests();
  });

  const handleNotesChange = (id: string, value: string) => {
    setNotes({ ...notes, [id]: value });
  };

  const handleProcess = (requestId: string, status: 'aprovado' | 'rejeitado') => {
    const adminJwt = localStorage.getItem('admin_jwt');
    processRequest(requestId, status, admin?.id, adminJwt);
  };

  const handleBulkProcess = (status: 'aprovado' | 'rejeitado') => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length === 0) return;
    
    const adminJwt = localStorage.getItem('admin_jwt');
    processBulkRequests(selectedArray, status, admin?.id, bulkNotes, adminJwt);
  };

  const [bulkNotes, setBulkNotes] = useState('');

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'todos' ? true : r.status === statusFilter;
      const matchesSearch = searchTerm
        ? (
            r.id.includes(searchTerm) ||
            r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : true;
      const created = new Date(r.created_at);
      const matchesStart = startDate ? created >= new Date(startDate) : true;
      const matchesEnd = endDate ? created <= new Date(endDate + 'T23:59:59') : true;
      const amount = Number(r.amount);
      const matchesMin = minAmount ? amount >= Number(minAmount) : true;
      const matchesMax = maxAmount ? amount <= Number(maxAmount) : true;
      return matchesStatus && matchesSearch && matchesStart && matchesEnd && matchesMin && matchesMax;
    });
  }, [requests, statusFilter, searchTerm, startDate, endDate, minAmount, maxAmount]);

  // Filtrar apenas solicitações pendentes para numeração (apenas do conjunto filtrado)
  const pendingRequests = filteredRequests.filter(request => request.status === 'pendente');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600">Carregando solicitações de saque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="Kambafy Admin – Saques" description="Aprovar ou rejeitar solicitações de saque dos vendedores" canonical="https://kambafy.com/admin/withdrawals" noIndex />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Dashboard</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gerenciar Saques</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Aprovar ou rejeitar solicitações</p>
          </div>
          <Button 
            onClick={loadWithdrawalRequests}
            disabled={loading}
            size="sm"
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`${loading ? 'animate-spin' : ''} h-4 w-4`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Filtros - Responsivo */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, nome ou email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="rejeitado">Rejeitado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data inicial</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data final</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min (KZ)</label>
                <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Max (KZ)</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 text-xs sm:text-sm text-gray-600">
            <span>{filteredRequests.length} resultado(s)</span>
            <button
              onClick={() => { setStatusFilter('todos'); setSearchTerm(''); setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount(''); }}
              className="text-blue-600 hover:underline text-left sm:text-right"
            >
              Limpar filtros
            </button>
          </div>
        </div>
        {pendingRequests.length > 0 && (
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Gerenciamento em Lote</h3>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
              <Button
                onClick={() => selectAll(pendingRequests.map(r => r.id))}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Selecionar Todos</span>
              </Button>
              
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Limpar</span>
              </Button>
              
              <span className="text-xs sm:text-sm text-gray-600">
                {selectedIds.size} de {pendingRequests.length}
              </span>
              <span className="w-full sm:w-auto sm:ml-auto text-xs sm:text-sm text-gray-600">
                Total: {Array.from(selectedIds).reduce((sum, id) => {
                  const r = filteredRequests.find(fr => fr.id === id);
                  return sum + (r ? Number(r.amount) : 0);
                }, 0).toLocaleString('pt-AO')} KZ
              </span>
            </div>

            {selectedIds.size > 0 && (
              <div className="space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2 text-gray-900">
                    Observações (opcional)
                  </label>
                  <Textarea
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="Observações para todos os saques selecionados..."
                    rows={3}
                    className="bg-white border-gray-300 text-sm"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={() => handleBulkProcess('aprovado')}
                    disabled={bulkProcessing}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-sm flex items-center gap-2 justify-center"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{bulkProcessing ? 'Aprovando...' : `Aprovar ${selectedIds.size}`}</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkProcess('rejeitado')}
                    disabled={bulkProcessing}
                    size="sm"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 shadow-sm flex items-center gap-2 justify-center"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{bulkProcessing ? 'Rejeitando...' : `Rejeitar ${selectedIds.size}`}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {filteredRequests.map((request) => {
            // Calcular o índice apenas para solicitações pendentes
            let pendingIndex = -1;
            if (request.status === 'pendente') {
              pendingIndex = pendingRequests.findIndex(pr => pr.id === request.id);
            }
            
            console.log('🔢 Request:', request.id, 'Status:', request.status, 'Index:', pendingIndex);
            
            return (
              <div key={request.id} className="relative">
                {request.status === 'pendente' && (
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={selectedIds.has(request.id)}
                      onCheckedChange={() => toggleSelection(request.id)}
                      className="bg-white border-2 border-gray-300 shadow-sm"
                    />
                  </div>
                )}
                <WithdrawalRequestCard
                  request={request}
                  index={pendingIndex}
                  processingId={processingId || (bulkProcessing && selectedIds.has(request.id) ? 'bulk' : null)}
                  notes={notes}
                  onNotesChange={handleNotesChange}
                  onProcess={handleProcess}
                />
              </div>
            );
          })}
          
          {filteredRequests.length === 0 && !loading && (
            <Card className="shadow-lg border bg-white">
              <CardContent className="text-center py-12 sm:py-16">
                <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação encontrada</h3>
                <p className="text-sm sm:text-base text-gray-600">Ajuste os filtros ou tente novamente.</p>
                <Button 
                  onClick={loadWithdrawalRequests}
                  size="sm"
                  className="mt-4"
                >
                  Recarregar dados
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}