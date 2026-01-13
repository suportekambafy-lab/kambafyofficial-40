import React from 'react';
import { useSellerReferrals } from '@/hooks/useSellerReferrals';
import { ReferralLink } from '@/components/referrals/ReferralLink';
import { ReferralStatsCards } from '@/components/referrals/ReferralStatsCards';
import { ReferralsList } from '@/components/referrals/ReferralsList';
import { CommissionHistory } from '@/components/referrals/CommissionHistory';
import { ReferredByBanner } from '@/components/referrals/ReferredByBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, History, Link2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function SellerReferrals() {
  const { t } = useTranslation();
  const {
    referralCode,
    referrals,
    commissions,
    stats,
    referredBy,
    isLoading,
    chooseRewardOption,
    updateReferralCode,
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
