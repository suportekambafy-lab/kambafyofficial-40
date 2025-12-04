import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import { PendingTransfersManager } from '@/components/admin/PendingTransfersManager';
import { SEO } from '@/components/SEO';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Loader2 } from 'lucide-react';

export default function AdminPaymentApprovals() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--admin-bg))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--admin-primary))]" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout 
      title="Aprovar Pagamentos" 
      description="Gerencie transferências bancárias pendentes"
    >
      <SEO 
        title="Aprovar Pagamentos - Admin | Kambafy"
        description="Painel de aprovação de pagamentos por transferência bancária"
        noIndex
      />
      <PendingTransfersManager />
    </AdminLayout>
  );
}