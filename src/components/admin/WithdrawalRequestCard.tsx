
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Calendar, DollarSign, CheckCircle, XCircle, PauseCircle, CreditCard, Wallet, Globe, Bitcoin, Building } from 'lucide-react';
import { AdminActionBadge } from './AdminActionBadge';

interface WithdrawalMethod {
  type: string;
  details: Record<string, string>;
  is_primary?: boolean;
}

interface WithdrawalWithProfile {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
  admin_processed_by: string | null;
  admin_processed_by_name: string | null;
  profiles?: {
    full_name: string;
    email: string;
    iban?: string;
    account_holder?: string;
    withdrawal_methods?: WithdrawalMethod[];
  } | null;
}

interface WithdrawalRequestCardProps {
  request: WithdrawalWithProfile;
  index: number;
  processingId: string | null;
  notes: { [key: string]: string };
  onNotesChange: (id: string, value: string) => void;
  onProcess: (id: string, status: 'aprovado' | 'rejeitado' | 'suspenso') => void;
}

const METHOD_LABELS: Record<string, { label: string; flag: string }> = {
  angola_iban: { label: "IBAN Angola", flag: "🇦🇴" },
  portugal_iban: { label: "IBAN Portugal", flag: "🇵🇹" },
  mozambique_bank: { label: "Banco Moçambique", flag: "🇲🇿" },
  brazil_pix: { label: "PIX Brasil", flag: "🇧🇷" },
  germany_iban: { label: "IBAN Alemanha", flag: "🇩🇪" },
  uk_bank: { label: "Banco Reino Unido", flag: "🇬🇧" },
  belgium_iban: { label: "IBAN Bélgica", flag: "🇧🇪" },
  us_bank: { label: "Banco EUA", flag: "🇺🇸" },
  usdt: { label: "USDT (Crypto)", flag: "₮" },
  paypal: { label: "PayPal", flag: "💳" },
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pendente':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    case 'suspenso':
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Suspenso</Badge>;
    case 'aprovado':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
    case 'rejeitado':
      return <Badge className="bg-red-100 text-red-800 border-red-200">Rejeitado</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Desconhecido</Badge>;
  }
};

const formatMethodDetails = (method: WithdrawalMethod) => {
  const details = method.details;
  const lines: { label: string; value: string }[] = [];

  // Common fields
  if (details.account_holder) {
    lines.push({ label: "Titular", value: details.account_holder });
  }

  // Type-specific fields
  switch (method.type) {
    case 'angola_iban':
    case 'portugal_iban':
    case 'germany_iban':
    case 'belgium_iban':
      if (details.iban) lines.push({ label: "IBAN", value: details.iban });
      if (details.bank_name) lines.push({ label: "Banco", value: details.bank_name });
      if (details.bic) lines.push({ label: "BIC/SWIFT", value: details.bic });
      break;
    case 'mozambique_bank':
      if (details.account_number) lines.push({ label: "NIB/Conta", value: details.account_number });
      if (details.bank_name) lines.push({ label: "Banco", value: details.bank_name });
      break;
    case 'brazil_pix':
      if (details.pix_key) lines.push({ label: "Chave PIX", value: details.pix_key });
      if (details.pix_type) lines.push({ label: "Tipo", value: details.pix_type });
      break;
    case 'uk_bank':
      if (details.sort_code) lines.push({ label: "Sort Code", value: details.sort_code });
      if (details.account_number) lines.push({ label: "Account", value: details.account_number });
      break;
    case 'us_bank':
      if (details.routing_number) lines.push({ label: "Routing", value: details.routing_number });
      if (details.account_number) lines.push({ label: "Account", value: details.account_number });
      if (details.account_type) lines.push({ label: "Tipo", value: details.account_type });
      break;
    case 'usdt':
      if (details.wallet_address) lines.push({ label: "Carteira", value: details.wallet_address });
      if (details.network) lines.push({ label: "Rede", value: details.network });
      break;
    case 'paypal':
      if (details.email) lines.push({ label: "Email", value: details.email });
      break;
  }

  return lines;
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

  const withdrawalMethods = request.profiles?.withdrawal_methods || [];
  const hasWithdrawalMethods = withdrawalMethods.length > 0;
  
  // Separate primary and secondary methods
  const primaryMethod = withdrawalMethods.find(m => m.is_primary) || withdrawalMethods[0];
  const secondaryMethods = withdrawalMethods.filter(m => m !== primaryMethod);

  // Fallback to legacy IBAN if no withdrawal methods
  const hasLegacyIban = !hasWithdrawalMethods && request.profiles?.iban;
  
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
        {/* Métodos de pagamento do vendedor */}
        {hasWithdrawalMethods && primaryMethod && (
          <div className="mb-4 space-y-3">
            {/* Método Principal */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  {METHOD_LABELS[primaryMethod.type]?.flag} {METHOD_LABELS[primaryMethod.type]?.label || primaryMethod.type}
                  <Badge className="ml-2 bg-blue-200 text-blue-800 text-xs">Principal</Badge>
                </p>
              </div>
              <div className="space-y-1">
                {formatMethodDetails(primaryMethod).map((line, idx) => (
                  <p key={idx} className="text-sm text-blue-800">
                    <strong>{line.label}:</strong> <span className="font-mono">{line.value}</span>
                  </p>
                ))}
              </div>
            </div>

            {/* Métodos Secundários */}
            {secondaryMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Outros métodos configurados:</p>
                {secondaryMethods.map((method, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-3 w-3 text-gray-500" />
                      <p className="text-xs font-medium text-gray-700">
                        {METHOD_LABELS[method.type]?.flag} {METHOD_LABELS[method.type]?.label || method.type}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {formatMethodDetails(method).map((line, lineIdx) => (
                        <p key={lineIdx} className="text-xs text-gray-600">
                          <strong>{line.label}:</strong> <span className="font-mono">{line.value}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback: IBAN Legado */}
        {hasLegacyIban && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">🇦🇴 IBAN Angola (legado)</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-800">
                <strong>Titular:</strong> {request.profiles?.account_holder || 'Não informado'}
              </p>
              <p className="text-sm text-blue-800 font-mono">
                <strong>IBAN:</strong> {request.profiles?.iban}
              </p>
            </div>
          </div>
        )}

        {/* Sem métodos configurados */}
        {!hasWithdrawalMethods && !hasLegacyIban && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              ⚠️ Vendedor não configurou métodos de recebimento
            </p>
          </div>
        )}

        {(request.status === 'pendente' || request.status === 'suspenso') && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                Observações {request.status === 'suspenso' ? '(recomendado)' : '(opcional)'}
              </label>
              <Textarea
                value={notes[request.id] || ''}
                onChange={(e) => onNotesChange(request.id, e.target.value)}
                placeholder={request.status === 'suspenso' 
                  ? "Adicione observações sobre a decisão final..." 
                  : "Adicione observações sobre esta solicitação..."}
                rows={3}
                className="bg-white border-gray-300"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => onProcess(request.id, 'aprovado')}
                disabled={processingId === request.id}
                className="flex items-center gap-2 border-0 shadow-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                {processingId === request.id ? 'Aprovando...' : 'Aprovar'}
              </Button>
              {request.status === 'pendente' && (
                <Button
                  onClick={() => onProcess(request.id, 'suspenso')}
                  disabled={processingId === request.id}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-0 shadow-sm flex items-center gap-2"
                >
                  <PauseCircle className="h-4 w-4" />
                  {processingId === request.id ? 'Suspendendo...' : 'Suspender'}
                </Button>
              )}
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
        {/* Badge de admin que processou - visível apenas para super admins */}
        {request.status !== 'pendente' && (
          <AdminActionBadge 
            adminName={request.admin_processed_by_name}
            adminId={request.admin_processed_by}
            actionLabel={
              request.status === 'aprovado' ? 'Aprovado por' : 
              request.status === 'suspenso' ? 'Suspenso por' : 
              'Rejeitado por'
            }
            className="mt-3"
          />
        )}
      </CardContent>
    </Card>
  );
}
