import { PageLayout } from "@/components/PageLayout";
import { useTranslation } from "@/contexts/TranslationContext";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <PageLayout title={t('terms.pageTitle')}>
      <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 px-4">
        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">{t('terms.lastUpdate')}</p>
          <p className="text-sm sm:text-base">
            {t('terms.intro')}
          </p>
        </div>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">{t('terms.section1.title')}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('terms.section1.content')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section2.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('terms.section2.intro')}
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('terms.section2.item1')}</li>
            <li>{t('terms.section2.item2')}</li>
            <li>{t('terms.section2.item3')}</li>
            <li>{t('terms.section2.item4')}</li>
            <li>{t('terms.section2.item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section3.title')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section3.sub1.title')}</h3>
              <p className="text-muted-foreground">
                {t('terms.section3.sub1.content')}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section3.sub2.title')}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t('terms.section3.sub2.item1')}</li>
                <li>{t('terms.section3.sub2.item2')}</li>
                <li>{t('terms.section3.sub2.item3')}</li>
                <li>{t('terms.section3.sub2.item4')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section4.title')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section4.sub1.title')}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t('terms.section4.sub1.item1')}</li>
                <li>{t('terms.section4.sub1.item2')}</li>
                <li>{t('terms.section4.sub1.item3')}</li>
                <li>{t('terms.section4.sub1.item4')}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section4.sub2.title')}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t('terms.section4.sub2.item1')}</li>
                <li>{t('terms.section4.sub2.item2')}</li>
                <li>{t('terms.section4.sub2.item3')}</li>
                <li>{t('terms.section4.sub2.item4')}</li>
                <li>{t('terms.section4.sub2.item5')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section5.title')}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section5.sub1.title')}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t('terms.section5.sub1.item1')}</li>
                <li>{t('terms.section5.sub1.item2')}</li>
                <li>{t('terms.section5.sub1.item3')}</li>
                <li>{t('terms.section5.sub1.item4')}</li>
                <li>{t('terms.section5.sub1.item5')}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">{t('terms.section5.sub2.title')}</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>{t('terms.section5.sub2.item1')}</li>
                <li>{t('terms.section5.sub2.item2')}</li>
                <li>{t('terms.section5.sub2.item3')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section6.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('terms.section6.intro')}</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>{t('terms.section6.item1')}</li>
            <li>{t('terms.section6.item2')}</li>
            <li>{t('terms.section6.item3')}</li>
            <li>{t('terms.section6.item4')}</li>
            <li>{t('terms.section6.item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section7.title')}</h2>
          <p className="text-muted-foreground">
            {t('terms.section7.content')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section8.title')}</h2>
          <p className="text-muted-foreground">
            {t('terms.section8.content')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">{t('terms.section9.title')}</h2>
          <p className="text-muted-foreground">
            {t('terms.section9.content')}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">{t('terms.section10.title')}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('terms.section10.intro')}
          </p>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-sm sm:text-base"><strong>Email:</strong> legal@kambafy.com</p>
            <p className="text-sm sm:text-base"><strong>{t('terms.section10.address')}:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Terms;
