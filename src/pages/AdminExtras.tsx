import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SendAppAnnouncementButton } from '@/components/admin/SendAppAnnouncementButton';
import { ClearAnnouncementButton } from '@/components/admin/ClearAnnouncementButton';
import { BulkProductAccessButton } from '@/components/admin/BulkProductAccessButton';
import { AddStudentsToCohortButton } from '@/components/admin/AddStudentsToCohortButton';
import { ResendAllAccessButton } from '@/components/admin/ResendAllAccessButton';
import { RecalculateBalancesButton } from '@/components/admin/RecalculateBalancesButton';
import { Wrench, Mail, Users, RefreshCw, Calculator, Send } from 'lucide-react';

export default function AdminExtras() {
  const { admin } = useAdminAuth();

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout 
      title="Ferramentas Extras" 
      description="Funcionalidades especiais e ações em massa para administração."
    >
      <SEO 
        title="Kambafy Admin – Extras" 
        description="Ferramentas extras e ações em massa" 
        canonical="https://kambafy.com/admin/extras" 
        noIndex 
      />

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Access & Emails Section */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Acessos & Emails</h3>
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Gerenciar acessos e envio de emails</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <BulkProductAccessButton />
            <ResendAllAccessButton />
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Gestão de Turmas</h3>
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Adicionar alunos às turmas</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <AddStudentsToCohortButton />
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Financeiro</h3>
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Recalcular saldos e comissões</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <RecalculateBalancesButton />
          </div>
        </div>

        {/* System Section */}
        <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--admin-text))]">Sistema</h3>
              <p className="text-sm text-[hsl(var(--admin-text-secondary))]">Ferramentas de manutenção</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ClearAnnouncementButton />
          </div>
        </div>
      </div>

      {/* App Announcement Section - Full Width */}
      <div className="bg-[hsl(var(--admin-card-bg))] rounded-2xl border border-[hsl(var(--admin-border))] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Send className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-[hsl(var(--admin-text))]">Anúncio do App</h3>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))]">
              Enviar email em massa sobre o lançamento da aplicação móvel
            </p>
          </div>
        </div>
        <SendAppAnnouncementButton />
      </div>
    </AdminLayout>
  );
}
