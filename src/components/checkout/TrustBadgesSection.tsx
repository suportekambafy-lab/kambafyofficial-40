import { Shield, Award, Headphones, Users } from "lucide-react";

interface TrustBadgesSectionProps {
  totalSales?: number;
  tc?: (key: string) => string;
}

// Default translations for Portuguese (fallback)
const defaultTranslations: Record<string, string> = {
  'checkout.trustBadges.title': '🔒 COMPRA 100% SEGURA',
  'checkout.trustBadges.ssl': 'SSL Criptografado',
  'checkout.trustBadges.guarantee': 'Garantia 7 Dias',
  'checkout.trustBadges.support': 'Suporte 24/7',
  'checkout.trustBadges.buyers': 'Compradores',
  'checkout.trustBadges.verified': 'Produto Verificado',
  'checkout.trustBadges.footer': 'Seus dados estão protegidos e sua compra é 100% segura',
};

// English translations
const englishTranslations: Record<string, string> = {
  'checkout.trustBadges.title': '🔒 100% SECURE PURCHASE',
  'checkout.trustBadges.ssl': 'SSL Encrypted',
  'checkout.trustBadges.guarantee': '7 Day Guarantee',
  'checkout.trustBadges.support': '24/7 Support',
  'checkout.trustBadges.buyers': 'Buyers',
  'checkout.trustBadges.verified': 'Verified Product',
  'checkout.trustBadges.footer': 'Your data is protected and your purchase is 100% secure',
};

export const TrustBadgesSection = ({ totalSales = 0, tc }: TrustBadgesSectionProps) => {
  // Use tc if provided, otherwise use default translations
  const translate = (key: string): string => {
    if (tc) {
      const result = tc(key);
      // If tc returns the key itself, use default
      if (result === key) {
        return defaultTranslations[key] || key;
      }
      return result;
    }
    return defaultTranslations[key] || key;
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
      <div className="text-center mb-3">
        <h3 className="text-sm font-bold text-green-800 dark:text-green-200">
          {translate('checkout.trustBadges.title')}
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* SSL Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            {translate('checkout.trustBadges.ssl')}
          </span>
        </div>

        {/* Garantia Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Award className="w-5 h-5 text-blue-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            {translate('checkout.trustBadges.guarantee')}
          </span>
        </div>

        {/* Suporte Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Headphones className="w-5 h-5 text-purple-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            {translate('checkout.trustBadges.support')}
          </span>
        </div>

        {/* Social Proof Badge */}
        <div className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-gray-800 rounded-lg">
          <Users className="w-5 h-5 text-orange-600" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
            {totalSales > 0 ? `${totalSales}+ ${translate('checkout.trustBadges.buyers')}` : translate('checkout.trustBadges.verified')}
          </span>
        </div>
      </div>

      <div className="text-center mt-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {translate('checkout.trustBadges.footer')}
        </p>
      </div>
    </div>
  );
};
