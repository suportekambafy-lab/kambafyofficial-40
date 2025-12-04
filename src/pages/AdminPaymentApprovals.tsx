import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import { PendingTransfersManager } from '@/components/admin/PendingTransfersManager';
import { SEO } from '@/components/SEO';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageSkeleton } from '@/components/admin/AdminPageSkeleton';

export default function AdminPaymentApprovals() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <AdminLayout title="Aprovar Pagamentos" description="Carregando dados...">
        <AdminPageSkeleton variant="table" />
      </AdminLayout>
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