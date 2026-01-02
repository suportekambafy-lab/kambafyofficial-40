import { PageLayout } from "@/components/PageLayout";
import { useTranslation } from "@/contexts/TranslationContext";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <PageLayout title={t('privacy.pageTitle')}>
      <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 px-4">
        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('privacy.lastUpdate')}</p>
          <p className="text-sm sm:text-base">
            {t('privacy.intro')}
          </p>
        </div>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">{t('privacy.section1.title')}</h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">{t('privacy.section1.sub1.title')}</h3>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                <li>{t('privacy.section1.sub1.item1')}</li>
                <li>{t('privacy.section1.sub1.item2')}</li>
                <li>{t('privacy.section1.sub1.item3')}</li>
                <li>{t('privacy.section1.sub1.item4')}</li>
                <li>{t('privacy.section1.sub1.item5')}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">{t('privacy.section1.sub2.title')}</h3>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                <li>{t('privacy.section1.sub2.item1')}</li>
                <li>{t('privacy.section1.sub2.item2')}</li>
                <li>{t('privacy.section1.sub2.item3')}</li>
                <li>{t('privacy.section1.sub2.item4')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section2.title')}</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.section2.item1')}</li>
            <li>{t('privacy.section2.item2')}</li>
            <li>{t('privacy.section2.item3')}</li>
            <li>{t('privacy.section2.item4')}</li>
            <li>{t('privacy.section2.item5')}</li>
            <li>{t('privacy.section2.item6')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section3.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('privacy.section3.intro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.section3.item1')}</li>
            <li>{t('privacy.section3.item2')}</li>
            <li>{t('privacy.section3.item3')}</li>
            <li>{t('privacy.section3.item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section4.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('privacy.section4.intro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.section4.item1')}</li>
            <li>{t('privacy.section4.item2')}</li>
            <li>{t('privacy.section4.item3')}</li>
            <li>{t('privacy.section4.item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section5.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('privacy.section5.intro')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('privacy.section5.item1')}</li>
            <li>{t('privacy.section5.item2')}</li>
            <li>{t('privacy.section5.item3')}</li>
            <li>{t('privacy.section5.item4')}</li>
            <li>{t('privacy.section5.item5')}</li>
            <li>{t('privacy.section5.item6')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section6.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('privacy.section6.content')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('privacy.section7.title')}</h2>
          <p className="text-muted-foreground">
            {t('privacy.section7.content')}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">{t('privacy.section8.title')}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('privacy.section8.intro')}
          </p>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-sm sm:text-base"><strong>Email:</strong> privacidade@kambafy.com</p>
            <p className="text-sm sm:text-base"><strong>{t('privacy.section8.address')}:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Privacy;
