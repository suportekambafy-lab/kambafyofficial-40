import React from 'react';
import { useSellerReferrals } from '@/hooks/useSellerReferrals';
import { ReferralLink } from '@/components/referrals/ReferralLink';
import { ReferralStatsCards } from '@/components/referrals/ReferralStatsCards';
import { ReferralCommissionsChart } from '@/components/referrals/ReferralCommissionsChart';
import { ReferralsList } from '@/components/referrals/ReferralsList';
import { CommissionHistory } from '@/components/referrals/CommissionHistory';
import { ReferredByBanner } from '@/components/referrals/ReferredByBanner';
import { ReferralApplicationForm } from '@/components/referrals/ReferralApplicationForm';
import { ReferralApplicationStatus } from '@/components/referrals/ReferralApplicationStatus';
import { ReferralBalance } from '@/components/referrals/ReferralBalance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, History, Link2, Wallet } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function SellerReferrals() {
  const { t } = useTranslation();
  const {
    application,
    referralCode,
    referrals,
    commissions,
    stats,
    referredBy,
    isLoading,
    chooseRewardOption,
    updateReferralCode,
    userId,
    userEmail,
    userName,
  } = useSellerReferrals();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Se não tem candidatura, mostrar formulário
  if (!application) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Programa de Indicações</h1>
          <p className="text-lg text-primary font-semibold">
            Ganhe até 2% por cada venda dos seus indicados!
          </p>
          <p className="text-muted-foreground">
            Candidate-se ao programa e comece a ganhar comissões por cada vendedor que você indicar
          </p>
        </div>

        {referredBy && (
          <ReferredByBanner referrerName={referredBy.referrerName} />
        )}

        <ReferralApplicationForm
          userId={userId!}
          userEmail={userEmail!}
          userName={userName || 'Vendedor'}
        />

        {/* Informações do programa */}
        <div className="p-6 bg-muted/30 rounded-lg space-y-4">
          <h3 className="font-semibold">Como funciona o programa</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">✅ Benefícios</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Ganhe comissões sobre vendas dos indicados</li>
                <li>Escolha entre 1,5% por 12 meses ou 2% por 6 meses</li>
                <li>Código de indicação personalizado</li>
                <li>Dashboard completo para acompanhar seus ganhos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">📋 Requisitos</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Ter pelo menos uma rede social ativa</li>
                <li>Aprovação da equipe Kambafy</li>
                <li>Concordar com os termos do programa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se candidatura pendente ou rejeitada, mostrar status
  if (application.status !== 'approved') {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Programa de Indicações</h1>
          <p className="text-muted-foreground">
            Acompanhe o status da sua candidatura
          </p>
        </div>

        {referredBy && (
          <ReferredByBanner referrerName={referredBy.referrerName} />
        )}

        <ReferralApplicationStatus application={application} />
      </div>
    );
  }

  // Candidatura aprovada - mostrar dashboard completo
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Indicações</h1>
        <p className="text-muted-foreground">
          Indique novos vendedores e ganhe comissões por desempenho
        </p>
      </div>

      {/* Banner se foi indicado */}
      {referredBy && (
        <ReferredByBanner referrerName={referredBy.referrerName} />
      )}

      {/* Stats Cards */}
      <ReferralStatsCards stats={stats} />

      {/* Gráfico de Comissões */}
      <ReferralCommissionsChart commissions={commissions || []} />

      {/* Tabs */}
      <Tabs defaultValue="link" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="link" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Meu Link</span>
          </TabsTrigger>
          <TabsTrigger value="balance" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Saldo</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Indicados</span>
            {referrals && referrals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded-full">
                {referrals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <ReferralLink
            referralCode={referralCode || null}
            onUpdateCode={async (code) => {
              await updateReferralCode.mutateAsync(code);
            }}
            isUpdating={updateReferralCode.isPending}
          />
        </TabsContent>

        <TabsContent value="balance">
          <ReferralBalance
            commissions={commissions || []}
          />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralsList
            referrals={referrals || []}
            commissions={commissions || []}
            onChooseReward={(referralId, option) => {
              chooseRewardOption.mutate({ referralId, option });
            }}
            isChoosing={chooseRewardOption.isPending}
          />
        </TabsContent>

        <TabsContent value="history">
          <CommissionHistory
            commissions={commissions || []}
            referrals={referrals || []}
          />
        </TabsContent>
      </Tabs>

      {/* Informações do programa para usuários aprovados */}
      <div className="mt-8 p-6 bg-muted/30 rounded-lg space-y-4">
        <h3 className="font-semibold">Seu Programa de Indicações</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">Seu Status</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Status: <span className="text-green-600 font-medium">Aprovado ✓</span></li>
              <li>Código: <span className="font-mono font-medium text-foreground">{referralCode}</span></li>
              <li>Indicados ativos: <span className="font-medium text-foreground">{stats.activeReferred}</span></li>
              <li>Total de indicados: <span className="font-medium text-foreground">{stats.totalReferred}</span></li>
              <li>Total ganho: <span className="font-medium text-foreground">{Object.entries(stats.earningsByCurrency || {}).map(([currency, amount]) => `${amount.toLocaleString('pt-AO')} ${currency}`).join(', ') || '0 AOA'}</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">💡 Dicas para Ganhar Mais</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Partilhe seu link nas redes sociais</li>
              <li>Envie para amigos que queiram vender online</li>
              <li>Quanto mais vendas seus indicados fizerem, mais você ganha</li>
              <li>Acompanhe suas comissões no histórico</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
