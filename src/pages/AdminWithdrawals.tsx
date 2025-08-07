import React, { useState } from 'react';
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
    processRequest(requestId, status, admin?.id);
  };

  const handleBulkProcess = (status: 'aprovado' | 'rejeitado') => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length === 0) return;
    
    processBulkRequests(selectedArray, status, admin?.id, bulkNotes);
  };

  const [bulkNotes, setBulkNotes] = useState('');

  // Filtrar apenas solicitações pendentes para numeração
  const pendingRequests = requests.filter(request => request.status === 'pendente');

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Saques</h1>
            <p className="text-gray-600 mt-1">Aprovar ou rejeitar solicitações de saque dos vendedores</p>
          </div>
          <Button 
            onClick={loadWithdrawalRequests}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>


        {/* Controles de Seleção em Lote */}
        {pendingRequests.length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciamento em Lote</h3>
            
            <div className="flex items-center gap-4 mb-4">
              <Button
                onClick={() => selectAll(pendingRequests.map(r => r.id))}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                Selecionar Todos
              </Button>
              
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Limpar Seleção
              </Button>
              
              <span className="text-sm text-gray-600">
                {selectedIds.size} de {pendingRequests.length} selecionados
              </span>
            </div>

            {selectedIds.size > 0 && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-900">
                    Observações para todos os saques selecionados (opcional)
                  </label>
                  <Textarea
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="Adicione observações que serão aplicadas a todos os saques selecionados..."
                    rows={3}
                    className="bg-white border-gray-300"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleBulkProcess('aprovado')}
                    disabled={bulkProcessing}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {bulkProcessing ? 'Aprovando...' : `Aprovar ${selectedIds.size} Saque(s)`}
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkProcess('rejeitado')}
                    disabled={bulkProcessing}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 shadow-sm flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {bulkProcessing ? 'Rejeitando...' : `Rejeitar ${selectedIds.size} Saque(s)`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {requests.map((request) => {
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
          
          {requests.length === 0 && !loading && (
            <Card className="shadow-lg border bg-white">
              <CardContent className="text-center py-16">
                <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma solicitação encontrada</h3>
                <p className="text-gray-600">Não há solicitações de saque no momento.</p>
                <Button 
                  onClick={loadWithdrawalRequests}
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