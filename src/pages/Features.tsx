import { PageLayout } from "@/components/PageLayout";
import { 
  BookOpen, 
  DollarSign, 
  Users, 
  Shield, 
  BarChart, 
  Zap, 
  Globe, 
  HeadphonesIcon,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Mail,
  RefreshCw,
  Target,
  UserCheck,
  Smartphone,
  Lock,
  Settings
} from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";
import { useTranslation } from "@/contexts/TranslationContext";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-checkout-green" />,
      title: t('features.memberArea.title'),
      description: t('features.memberArea.description')
    },
    {
      icon: <DollarSign className="w-8 h-8 text-checkout-green" />,
      title: t('features.multiCurrency.title'),
      description: t('features.multiCurrency.description')
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-checkout-green" />,
      title: t('features.checkout.title'),
      description: t('features.checkout.description')
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-checkout-green" />,
      title: t('features.affiliates.title'),
      description: t('features.affiliates.description')
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-checkout-green" />,
      title: t('features.recovery.title'),
      description: t('features.recovery.description')
    },
    {
      icon: <BarChart className="w-8 h-8 text-checkout-green" />,
      title: t('features.analytics.title'),
      description: t('features.analytics.description')
    },
    {
      icon: <CreditCard className="w-8 h-8 text-checkout-green" />,
      title: t('features.wallet.title'),
      description: t('features.wallet.description')
    },
    {
      icon: <Target className="w-8 h-8 text-checkout-green" />,
      title: t('features.pixel.title'),
      description: t('features.pixel.description')
    },
    {
      icon: <UserCheck className="w-8 h-8 text-checkout-green" />,
      title: t('features.kyc.title'),
      description: t('features.kyc.description')
    },
    {
      icon: <Mail className="w-8 h-8 text-checkout-green" />,
      title: t('features.email.title'),
      description: t('features.email.description')
    },
    {
      icon: <Lock className="w-8 h-8 text-checkout-green" />,
      title: t('features.2fa.title'),
      description: t('features.2fa.description')
    },
    {
      icon: <Smartphone className="w-8 h-8 text-checkout-green" />,
      title: t('features.mobile.title'),
      description: t('features.mobile.description')
    },
    {
      icon: <Settings className="w-8 h-8 text-checkout-green" />,
      title: t('features.customization.title'),
      description: t('features.customization.description')
    },
    {
      icon: <Users className="w-8 h-8 text-checkout-green" />,
      title: t('features.students.title'),
      description: t('features.students.description')
    },
    {
      icon: <Shield className="w-8 h-8 text-checkout-green" />,
      title: t('features.antiFraud.title'),
      description: t('features.antiFraud.description')
    },
    {
      icon: <Globe className="w-8 h-8 text-checkout-green" />,
      title: t('features.seo.title'),
      description: t('features.seo.description')
    }
  ];

  const appsFeatures = [
    {
      title: t('features.apps.dashboard.title'),
      description: t('features.apps.dashboard.description')
    },
    {
      title: t('features.apps.financial.title'),
      description: t('features.apps.financial.description')
    },
    {
      title: t('features.apps.products.title'),
      description: t('features.apps.products.description')
    },
    {
      title: t('features.apps.affiliatePortal.title'),
      description: t('features.apps.affiliatePortal.description')
    },
    {
      title: t('features.apps.admin.title'),
      description: t('features.apps.admin.description')
    },
    {
      title: t('features.apps.helpCenter.title'),
      description: t('features.apps.helpCenter.description')
    }
  ];

  return (
    <>
      <SEO {...pageSEO.features} />
      <PageLayout title={t('features.pageTitle')}>
        <div className="space-y-8 md:space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              {t('features.heroTitle')} <span className="text-checkout-green">{t('features.heroTitleHighlight')}</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('features.heroSubtitle')}
            </p>
          </div>

          {/* Recursos Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-4 sm:p-6 bg-background border border-checkout-green/10 rounded-2xl hover:shadow-lg hover:shadow-checkout-green/5 transition-all duration-300 hover:border-checkout-green/20 group"
              >
                <div className="mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Seção Apps & Funcionalidades */}
          <div className="bg-gradient-to-r from-checkout-green/5 to-emerald-500/5 rounded-2xl p-4 sm:p-6 lg:p-8 mx-4">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
                {t('features.appsTitle')}
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('features.appsSubtitle')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {appsFeatures.map((app, index) => (
                <div 
                  key={index}
                  className="bg-background/80 backdrop-blur border border-checkout-green/20 rounded-xl p-4 sm:p-5 hover:shadow-md transition-all duration-300"
                >
                  <h4 className="font-semibold text-base sm:text-lg mb-2 text-checkout-green">
                    {app.title}
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {app.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recursos em Desenvolvimento */}
          <div className="bg-gradient-to-r from-checkout-green/10 to-emerald-500/10 rounded-2xl p-4 sm:p-6 lg:p-8 text-center mx-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{t('features.comingSoonTitle')}</h3>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto">
              {t('features.comingSoonSubtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.mobileApp')}
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.webinars')}
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.marketplace')}
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.publicApi')}
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.certificates')}
              </span>
              <span className="bg-checkout-green/20 text-checkout-green px-2 sm:px-3 py-1 rounded-full">
                {t('features.upcoming.zoom')}
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center px-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">
              {t('features.ctaTitle')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('features.ctaSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <a 
                href={(() => {
                  const hostname = window.location.hostname;
                  const isProduction = hostname.includes('kambafy.com') && 
                                       !hostname.includes('localhost') && 
                                       !hostname.includes('lovable.app');
                  return isProduction && !hostname.startsWith('app.') 
                    ? `${window.location.protocol}//app.kambafy.com/auth` 
                    : '/auth';
                })()}
                className="inline-block bg-checkout-green hover:bg-checkout-green/90 text-white font-medium px-6 sm:px-8 py-3 rounded-xl transition-colors duration-300"
              >
                {t('features.ctaButton')}
              </a>
              <a 
                href="/como-funciona" 
                className="inline-block border border-checkout-green text-checkout-green hover:bg-checkout-green hover:text-white font-medium px-6 sm:px-8 py-3 rounded-xl transition-colors duration-300"
              >
                {t('features.ctaSecondary')}
              </a>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Features;
