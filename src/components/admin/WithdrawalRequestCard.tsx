
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Calendar, DollarSign, CheckCircle, XCircle, CreditCard } from 'lucide-react';

interface WithdrawalWithProfile {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  admin_processed_by: string | null;
  profiles?: {
    full_name: string;
    email: string;
    iban?: string;
    account_holder?: string;
  } | null;
}

interface WithdrawalRequestCardProps {
  request: WithdrawalWithProfile;
  index: number;
  processingId: string | null;
  notes: { [key: string]: string };
  onNotesChange: (id: string, value: string) => void;
  onProcess: (id: string, status: 'aprovado' | 'rejeitado') => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pendente':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    case 'aprovado':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
    case 'rejeitado':
      return <Badge className="bg-red-100 text-red-800 border-red-200">Rejeitado</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Desconhecido</Badge>;
  }
};

export function WithdrawalRequestCard({
  request,
  index,
  processingId,
  notes,
  onNotesChange,
  onProcess
}: WithdrawalRequestCardProps) {
  console.log('🃏 Card render - Request:', request.id, 'Status:', request.status, 'Index:', index);
  
  return (
    <Card className="shadow-lg border bg-white hover:shadow-xl transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              {request.status === 'pendente' && index >= 0 ? (
                <span className="text-white font-bold text-lg">#{index + 1}</span>
              ) : (
                <DollarSign className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900">
                {Number(request.amount).toLocaleString('pt-AO')} KZ
              </CardTitle>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {request.profiles?.full_name || request.profiles?.email || `Usuário ${request.user_id.slice(0, 8)}...`}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(request.created_at).toLocaleDateString('pt-AO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        {/* Dados bancários do cliente */}
        {request.profiles?.iban && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">Dados Bancários do Cliente:</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-800">
                <strong>Titular:</strong> {request.profiles.account_holder || 'Não informado'}
              </p>
              <p className="text-sm text-blue-800 font-mono">
                <strong>IBAN:</strong> AO06 {request.profiles.iban}
              </p>
            </div>
          </div>
        )}

        {request.status === 'pendente' && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Observações (opcional)
              </label>
              <Textarea
                value={notes[request.id] || ''}
                onChange={(e) => onNotesChange(request.id, e.target.value)}
                placeholder="Adicione observações sobre esta solicitação..."
                rows={3}
                className="bg-white border-gray-300"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => onProcess(request.id, 'aprovado')}
                disabled={processingId === request.id}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-0 shadow-sm flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {processingId === request.id ? 'Aprovando...' : 'Aprovar'}
              </Button>
              <Button
                onClick={() => onProcess(request.id, 'rejeitado')}
                disabled={processingId === request.id}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-0 shadow-sm flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                {processingId === request.id ? 'Rejeitando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        )}
        {request.admin_notes && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium mb-2 text-blue-900">Observações do Administrador:</p>
            <p className="text-sm text-blue-800">{request.admin_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
