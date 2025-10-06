import { ModulePaymentsDashboard } from "@/components/members/ModulePaymentsDashboard";
import { MigrateModulePayments } from "@/components/admin/MigrateModulePayments";
import { DollarSign } from "lucide-react";
const SellerMemberModulePayments = () => {
  return <div className="space-y-6">
      <div className="flex items-center gap-3">
        
        <div>
          <h1 className="text-3xl font-bold">Pagamentos de Módulos</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe os pagamentos dos módulos pagos
          </p>
        </div>
      </div>

      <MigrateModulePayments />
      <ModulePaymentsDashboard />
    </div>;
};
export default SellerMemberModulePayments;