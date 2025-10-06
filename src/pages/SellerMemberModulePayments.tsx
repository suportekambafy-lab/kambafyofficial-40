import { ModulePaymentsDashboard } from "@/components/members/ModulePaymentsDashboard";
import { DollarSign } from "lucide-react";

const SellerMemberModulePayments = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pagamentos de Módulos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie e acompanhe os pagamentos dos módulos pagos
          </p>
        </div>
      </div>

      <ModulePaymentsDashboard />
    </div>
  );
};

export default SellerMemberModulePayments;