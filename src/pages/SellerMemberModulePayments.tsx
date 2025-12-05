import { ModulePaymentsDashboard } from "@/components/members/ModulePaymentsDashboard";
import { DollarSign } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const SellerMemberModulePayments = () => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">{t('menu.modulePayments')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('financial.subtitle')}
          </p>
        </div>
      </div>

      <ModulePaymentsDashboard />
    </div>
  );
};

export default SellerMemberModulePayments;