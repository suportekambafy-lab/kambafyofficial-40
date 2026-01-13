import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, FileCheck, Wallet, Shield } from 'lucide-react';
import { AdminReferralsDashboard } from '@/components/admin/referrals/AdminReferralsDashboard';
import { AdminReferralsApplications } from '@/components/admin/referrals/AdminReferralsApplications';
import { AdminReferralsWithdrawals } from '@/components/admin/referrals/AdminReferralsWithdrawals';
import { AdminReferralsFraud } from '@/components/admin/referrals/AdminReferralsFraud';

export default function AdminReferrals() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AdminLayout
      title="Indique e Ganhe"
      description="Gerir programa de indicações de vendedores"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Solicitações</span>
          </TabsTrigger>
          <TabsTrigger value="fraud" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Fraude</span>
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Saques</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminReferralsDashboard />
        </TabsContent>

        <TabsContent value="applications">
          <AdminReferralsApplications />
        </TabsContent>

        <TabsContent value="fraud">
          <AdminReferralsFraud />
        </TabsContent>

        <TabsContent value="withdrawals">
          <AdminReferralsWithdrawals />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
