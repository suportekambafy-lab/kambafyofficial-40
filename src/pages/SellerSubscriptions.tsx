import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, DollarSign, Users } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

export default function SellerSubscriptions() {
  const { t } = useTranslation();
  
  return (
    <div className="p-6 space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptions.active')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">{t('subscriptions.noSubscriptions')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Kz 0,00</div>
            <p className="text-xs text-muted-foreground">{t('financial.totalEarnings')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('subscriptions.nextBilling')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">{t('period.last7days')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Assinaturas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscriptions.title')}</CardTitle>
          <CardDescription>
            {t('subscriptions.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('subscriptions.noSubscriptions')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('products.createFirst')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
