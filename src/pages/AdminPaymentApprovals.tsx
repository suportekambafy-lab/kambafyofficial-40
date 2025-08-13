import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Navigate } from 'react-router-dom';
import { PendingTransfersManager } from '@/components/admin/PendingTransfersManager';
import { SEO } from '@/components/SEO';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AdminPaymentApprovals() {
  const { admin, loading } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <SEO 
        title="Aprovar Pagamentos - Admin | Kambafy"
        description="Painel de aprovação de pagamentos por transferência bancária"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Aprovar Pagamentos</h1>
              <p className="text-gray-600 mt-1">Gerencie transferências bancárias pendentes de aprovação</p>
            </div>
          </div>
        </div>

        <PendingTransfersManager />
      </div>
    </div>
  );
}