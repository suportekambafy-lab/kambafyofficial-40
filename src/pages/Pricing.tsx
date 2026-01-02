import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Zap } from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { useTranslation } from "@/hooks/useTranslation";

const Pricing = () => {
  const { t } = useTranslation();

  const withdrawalOptions = [
    {
      type: t('pricing.normalWithdrawal'),
      fee: t('pricing.normalWithdrawalFee'),
      time: t('pricing.normalWithdrawalTime'),
      description: t('pricing.normalWithdrawalDescription'),
      icon: Clock
    },
    {
      type: t('pricing.instantWithdrawal'),
      fee: t('pricing.instantWithdrawalFee'),
      time: t('pricing.instantWithdrawalTime'),
      description: t('pricing.instantWithdrawalDescription'),
      icon: Zap
    }
  ];

  return (
    <>
      <SEO {...pageSEO.pricing} />
      <PageLayout title={t('pricing.pageTitle')}>
        <div className="space-y-8 md:space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              {t('pricing.title')} <span className="text-checkout-green">{t('pricing.titleHighlight')}</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          {/* Seção de Planos de Assinatura */}
          <div className="px-4">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">
                {t('pricing.subscriptionPlans')} <span className="text-checkout-green">{t('pricing.subscriptionPlansHighlight')}</span>
              </h3>
              <p className="text-muted-foreground">
                {t('pricing.subscriptionSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {/* Plano Básico */}
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-checkout-green/50 transition-all">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold mb-2">{t('pricing.basicPlan')}</h4>
                  <div className="mb-2">
                    <span className="text-3xl font-bold">{t('pricing.basicPrice')}</span>
                    <span className="text-muted-foreground"> {t('pricing.basicPeriod')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('pricing.basicDescription')}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.basicFeature1')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.basicFeature2')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.basicFeature3')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.basicFeature4')}</span>
                  </li>
                </ul>

                <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900">
                  {t('pricing.subscribeBasic')}
                </Button>
              </div>

              {/* Plano Premium (Destacado) */}
              <div className="bg-white rounded-xl p-6 border-2 border-checkout-green ring-2 ring-checkout-green/20 relative transform scale-105">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-checkout-green text-white px-4 py-1 rounded-full text-xs font-medium">
                    {t('pricing.mostPopular')}
                  </span>
                </div>
                
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold mb-2">{t('pricing.premiumPlan')}</h4>
                  <div className="mb-2">
                    <span className="text-3xl font-bold">{t('pricing.premiumPrice')}</span>
                    <span className="text-muted-foreground"> {t('pricing.premiumPeriod')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('pricing.premiumDescription')}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm font-semibold">{t('pricing.premiumFeature1')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm font-semibold">{t('pricing.premiumFeature2')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.premiumFeature3')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.premiumFeature4')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.premiumFeature5')}</span>
                  </li>
                </ul>

                <Button className="w-full bg-checkout-green hover:bg-checkout-green/90 text-white">
                  {t('pricing.subscribePremium')}
                </Button>
              </div>

              {/* Plano Pro */}
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-checkout-green/50 transition-all">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold mb-2">{t('pricing.proPlan')}</h4>
                  <div className="mb-2">
                    <span className="text-3xl font-bold">{t('pricing.proPrice')}</span>
                    <span className="text-muted-foreground"> {t('pricing.proPeriod')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('pricing.proDescription')}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm font-semibold">{t('pricing.proFeature1')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm font-semibold">{t('pricing.proFeature2')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.proFeature3')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.proFeature4')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green" />
                    <span className="text-sm">{t('pricing.proFeature5')}</span>
                  </li>
                </ul>

                <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900">
                  {t('pricing.subscribePro')}
                </Button>
              </div>
            </div>

            {/* Comparação de Taxa por Transação */}
            <div className="bg-gradient-to-r from-checkout-green/10 to-checkout-green/5 rounded-xl p-6 max-w-3xl mx-auto mb-12">
              <h4 className="text-lg font-semibold text-center mb-4">
                {t('pricing.feeComparison')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('pricing.noPlan')}</p>
                  <p className="text-2xl font-bold text-gray-600">{t('pricing.noPlanFee')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('pricing.basicPlan')}</p>
                  <p className="text-2xl font-bold text-blue-600">{t('pricing.basicFee')}</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">{t('pricing.premiumPlan')} ⭐</p>
                  <p className="text-2xl font-bold text-checkout-green">{t('pricing.premiumFee')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('pricing.proPlan')}</p>
                  <p className="text-2xl font-bold text-purple-600">{t('pricing.proFee')}</p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                {t('pricing.feeNote')}
              </p>
            </div>
          </div>

          {/* Plano Principal */}
          <div className="max-w-md mx-auto px-4">
            <div className="relative p-4 sm:p-6 lg:p-8 rounded-2xl border border-checkout-green bg-checkout-green/5 ring-2 ring-checkout-green">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-checkout-green text-white px-4 py-2 rounded-full text-sm font-medium">
                  {t('pricing.uniquePlan')}
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{t('pricing.uniquePlan')}</h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold">{t('pricing.uniquePlanPrice')}</span>
                  <span className="text-muted-foreground"> AOA</span>
                </div>
                <p className="text-muted-foreground">{t('pricing.uniquePlanPeriod')}</p>
                <p className="text-sm text-muted-foreground mt-2">{t('pricing.uniquePlanDescription')}</p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature1')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature2')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature3')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature4')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature5')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature6')}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                  <span className="text-sm">{t('pricing.uniqueFeature7')}</span>
                </li>
              </ul>

              <Button className="w-full bg-checkout-green hover:bg-checkout-green/90 text-white">
                {t('pricing.startNow')}
              </Button>
            </div>
          </div>

          {/* Taxas de Transação */}
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 lg:p-8 mx-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">{t('pricing.transactionFees')}</h3>
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl mr-2">🇦🇴</span>
                    <span className="font-semibold">{t('pricing.angola')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-checkout-green mb-2">{t('pricing.angolaFee')}</div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {t('pricing.angolaPayments')}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl mr-2">🌍</span>
                    <span className="font-semibold">{t('pricing.international')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-checkout-green mb-2">{t('pricing.internationalFee')}</div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {t('pricing.internationalPayments')}
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-4 text-center">
                {t('pricing.feeOnlyOnSales')}
              </p>
            </div>
          </div>

          {/* Métodos de Pagamento */}
          <div className="px-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">{t('pricing.paymentMethods')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('pricing.forCustomers')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.multicaixaExpress')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.referencePayment')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.bankTransfer')}</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('pricing.forSellers')}</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.ibanReceiving')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.directTransfer')}</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">{t('pricing.automaticProcessing')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Opções de Levantamento */}
          <div className="px-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">{t('pricing.withdrawalOptions')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {withdrawalOptions.map((option, index) => (
                <div key={index} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:border-checkout-green/50 transition-colors">
                  <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                    <div className="p-2 bg-checkout-green/10 rounded-lg flex-shrink-0">
                      <option.icon className="w-5 h-5 sm:w-6 sm:h-6 text-checkout-green" />
                    </div>
                    <h4 className="text-lg sm:text-xl font-semibold">{option.type}</h4>
                  </div>
                  
                  <div className="space-y-2 mb-3 sm:mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{t('pricing.fee')}</span>
                      <span className="text-sm sm:text-base font-semibold text-checkout-green">{option.fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm sm:text-base text-gray-600">{t('pricing.time')}</span>
                      <span className="text-sm sm:text-base font-semibold">{option.time}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-500">{option.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6 lg:p-8 text-center mx-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{t('pricing.haveQuestions')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              {t('pricing.questionsSubtitle')}
            </p>
            <Button 
              variant="outline" 
              className="border-checkout-green text-checkout-green hover:bg-checkout-green/10 w-full sm:w-auto"
              asChild
            >
              <SubdomainLink to="/contato">
                {t('pricing.contactSupport')}
              </SubdomainLink>
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Pricing;
