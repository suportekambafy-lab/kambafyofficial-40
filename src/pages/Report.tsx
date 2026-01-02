import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { AlertCircle, CheckCircle2, ShieldAlert, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/contexts/TranslationContext";

const Report = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [protocolNumber, setProtocolNumber] = useState('');
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    reportedUrl: '',
    category: '',
    description: ''
  });

  const categories = [
    { value: 'fraud', label: t('report.catFraud') },
    { value: 'piracy', label: t('report.catPiracy') },
    { value: 'scam', label: t('report.catScam') },
    { value: 'misleading', label: t('report.catMisleading') },
    { value: 'copyright', label: t('report.catCopyright') },
    { value: 'other', label: t('report.catOther') }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: reportData, error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_name: formData.reporterName || null,
          reporter_email: formData.reporterEmail,
          reported_url: formData.reportedUrl,
          category: formData.category,
          description: formData.description,
          ip_address: null,
          user_agent: navigator.userAgent
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting report:', insertError);
        throw new Error(t('report.errorMessage'));
      }

      console.log('Report inserted:', reportData);
      const reportId = reportData.id;
      const protocol = reportId.substring(0, 8).toUpperCase();

      const { error: emailError } = await supabase.functions.invoke('send-report-email', {
        body: {
          reportId,
          reporterName: formData.reporterName,
          reporterEmail: formData.reporterEmail,
          reportedUrl: formData.reportedUrl,
          category: formData.category,
          description: formData.description
        }
      });

      if (emailError) {
        console.error('Error sending emails:', emailError);
        toast({
          title: t('report.registeredTitle'),
          description: t('report.registeredEmailError'),
          variant: "default"
        });
      } else {
        toast({
          title: t('report.sentTitle'),
          description: t('report.sentMessage')
        });
      }

      setProtocolNumber(protocol);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: t('report.errorTitle'),
        description: error.message || t('report.errorMessage'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocolNumber);
    toast({
      title: t('report.copiedTitle'),
      description: t('report.copiedMessage')
    });
  };

  return (
    <>
      <SEO 
        title={t('report.seoTitle')} 
        description={t('report.seoDescription')} 
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <SubdomainLink to="/" className="flex items-center">
              <img src="/kambafy-logo-green.png" alt="Kambafy" className="h-16 w-auto" />
            </SubdomainLink>
            <SubdomainLink to="/">
              <Button variant="ghost">{t('report.backHome')}</Button>
            </SubdomainLink>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-4xl px-6 py-16">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="font-bold mb-4 text-xl">{t('report.title')}</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-base">
                  {t('report.subtitle')}
                </p>
              </div>

              {/* Info Boxes */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{t('report.confidentiality')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('report.confidentialityDesc')}
                  </p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{t('report.analysis48h')}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t('report.analysis48hDesc')}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-8">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="reporterName">{t('report.yourName')}</Label>
                    <Input 
                      id="reporterName" 
                      name="reporterName" 
                      value={formData.reporterName} 
                      onChange={handleChange} 
                      placeholder={t('report.yourNamePlaceholder')} 
                      className="mt-2" 
                    />
                  </div>

                  <div>
                    <Label htmlFor="reporterEmail">{t('report.yourEmail')}</Label>
                    <Input 
                      id="reporterEmail" 
                      name="reporterEmail" 
                      type="email" 
                      value={formData.reporterEmail} 
                      onChange={handleChange} 
                      placeholder="seu@email.com" 
                      className="mt-2" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('report.emailUsage')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reportedUrl">{t('report.urlLabel')}</Label>
                    <Input 
                      id="reportedUrl" 
                      name="reportedUrl" 
                      value={formData.reportedUrl} 
                      onChange={handleChange} 
                      placeholder={t('report.urlPlaceholder')} 
                      className="mt-2" 
                      required 
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">{t('report.categoryLabel')}</Label>
                    <select 
                      id="category" 
                      name="category" 
                      value={formData.category} 
                      onChange={handleChange} 
                      className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                      required
                    >
                      <option value="">{t('report.selectCategory')}</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="description">{t('report.descriptionLabel')}</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleChange} 
                      placeholder={t('report.descriptionPlaceholder')} 
                      className="mt-2 min-h-[150px]" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('report.minChars')}
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || formData.description.length < 50}
                  >
                    {isSubmitting ? t('report.submitting') : t('report.submit')}
                  </Button>
                </div>
              </form>

              {/* Additional Info */}
              <div className="mt-8 bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">{t('report.whatHappens')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• {t('report.step1')}</li>
                  <li>• {t('report.step2')}</li>
                  <li>• {t('report.step3')}</li>
                  <li>• {t('report.step4')}</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{t('report.successTitle')}</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('report.successMessage')}
              </p>
              
              {/* Protocol Number */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 max-w-sm mx-auto mb-8">
                <p className="text-sm text-muted-foreground mb-2">{t('report.protocolNumber')}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold font-mono text-green-600">#{protocolNumber}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={copyProtocol}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('report.saveProtocol')}
                </p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => {
                    setIsSubmitted(false);
                    setProtocolNumber('');
                    setFormData({
                      reporterName: '',
                      reporterEmail: '',
                      reportedUrl: '',
                      category: '',
                      description: ''
                    });
                  }}
                >
                  {t('report.makeAnother')}
                </Button>
                <SubdomainLink to="/">
                  <Button variant="outline">{t('report.backHome')}</Button>
                </SubdomainLink>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Report;
