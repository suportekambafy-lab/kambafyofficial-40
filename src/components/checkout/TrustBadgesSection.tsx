import { Shield, Award, Headphones, Users } from "lucide-react";

interface TrustBadgesSectionProps {
  totalSales?: number;
}

export const TrustBadgesSection = ({ totalSales = 0 }: TrustBadgesSectionProps) => {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
      <div className="text-center mb-3">
        <h3 className="text-sm font-bold text-green-800 dark:text-green-200">
          🔒 COMPRA 100% SEGURA
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* SSL Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            SSL Criptografado
          </span>
        </div>

        {/* Garantia Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Award className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            Garantia 7 Dias
          </span>
        </div>

        {/* Suporte Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Headphones className="w-5 h-5 text-purple-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            Suporte 24/7
          </span>
        </div>

        {/* Social Proof Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Users className="w-5 h-5 text-orange-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            {totalSales > 0 ? `${totalSales}+ Compradores` : 'Produto Verificado'}
          </span>
        </div>
      </div>

      <div className="text-center mt-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Seus dados estão protegidos e sua compra é 100% segura
        </p>
      </div>
    </div>
  );
};
