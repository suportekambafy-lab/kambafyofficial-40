import React from 'react';
import { useSellerReferrals } from '@/hooks/useSellerReferrals';
import { ReferralLink } from '@/components/referrals/ReferralLink';
import { ReferralStatsCards } from '@/components/referrals/ReferralStatsCards';
import { ReferralsList } from '@/components/referrals/ReferralsList';
import { CommissionHistory } from '@/components/referrals/CommissionHistory';
import { ReferredByBanner } from '@/components/referrals/ReferredByBanner';
import { ReferralApplicationForm } from '@/components/referrals/ReferralApplicationForm';
import { ReferralApplicationStatus } from '@/components/referrals/ReferralApplicationStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, History, Link2, FileCheck } from 'lucide-react';
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

      {/* Tabs */}
      <Tabs defaultValue="link" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="link" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Meu Link</span>
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

      {/* Informações importantes */}
      <div className="mt-8 p-6 bg-muted/30 rounded-lg space-y-4">
        <h3 className="font-semibold">Como funciona o sistema de indicação</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div>
            <h4 className="font-medium text-foreground mb-2">✅ Regras</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>A comissão só é ativada quando o indicado faz a primeira venda</li>
              <li>Você escolhe entre 1,5% por 12 meses ou 2% por 6 meses</li>
              <li>A comissão é calculada sobre o valor líquido da venda</li>
              <li>O indicado não perde nenhuma comissão por ser indicado</li>
              <li>O prazo começa a contar a partir da primeira venda</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">❌ Limitações</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Apenas 1 nível de indicação (sem rede em cadeia)</li>
              <li>Não pode indicar a si mesmo ou contas duplicadas</li>
              <li>A opção escolhida é definitiva e irreversível</li>
              <li>Após o prazo, as comissões são encerradas automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
