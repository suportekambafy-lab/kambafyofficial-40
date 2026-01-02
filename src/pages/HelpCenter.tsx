import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Mail, Search } from 'lucide-react';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SEO, pageSEO } from "@/components/SEO";
import { CrispChat } from "@/components/CrispChat";
import { useTranslation } from "@/contexts/TranslationContext";

const HelpCenter = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: ""
  });

  const faqs = [
    {
      question: t('helpCenter.faq1.question'),
      answer: t('helpCenter.faq1.answer')
    },
    {
      question: t('helpCenter.faq2.question'),
      answer: t('helpCenter.faq2.answer')
    },
    {
      question: t('helpCenter.faq3.question'),
      answer: t('helpCenter.faq3.answer')
    },
    {
      question: t('helpCenter.faq4.question'),
      answer: t('helpCenter.faq4.answer')
    },
    {
      question: t('helpCenter.faq5.question'),
      answer: t('helpCenter.faq5.answer')
    }
  ];

  const filteredFaqs = faqs.filter(
    faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
           faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: contactForm.name,
          email: contactForm.email,
          phone: "",
          subject: contactForm.subject,
          message: contactForm.message
        }
      });
      if (error) {
        console.error('Error sending contact email:', error);
        toast({
          title: t('helpCenter.errorTitle'),
          description: t('helpCenter.errorMessage'),
          variant: "destructive"
        });
      } else {
        toast({
          title: t('helpCenter.successTitle'),
          description: t('helpCenter.successMessage')
        });
        setContactForm({
          name: "",
          email: "",
          subject: "",
          category: "",
          message: ""
        });
      }
    } catch (error) {
      toast({
        title: t('helpCenter.errorTitle'),
        description: t('helpCenter.errorMessage'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const contactOptions = [
    {
      icon: <MessageCircle className="w-6 h-6 text-checkout-green" />,
      title: t('helpCenter.liveChat'),
      description: t('helpCenter.liveChatDesc'),
      action: t('helpCenter.startChat'),
      onClick: () => {
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:show']);
          window.$crisp.push(['do', 'chat:open']);
        }
      }
    },
    {
      icon: <Mail className="w-6 h-6 text-checkout-green" />,
      title: t('helpCenter.email'),
      description: "suporte@kambafy.com",
      action: t('helpCenter.sendEmail'),
      onClick: () => window.location.href = 'mailto:suporte@kambafy.com'
    }
  ];

  return (
    <>
      <SEO {...pageSEO.helpCenter} />
      <CrispChat />
      <PageLayout title={t('helpCenter.pageTitle')}>
        <div className="space-y-8 md:space-y-12 px-4">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              {t('helpCenter.title')} <span className="text-checkout-green">{t('helpCenter.titleHighlight')}</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
              {t('helpCenter.subtitle')}
            </p>
            
            <div className="relative max-w-md mx-auto">
              <Input 
                placeholder={t('helpCenter.searchPlaceholder')} 
                className="pl-10" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {contactOptions.map((option, index) => (
              <div key={index} className="text-center p-4 sm:p-6 bg-checkout-green/5 border border-checkout-green/10 rounded-2xl">
                <div className="mb-3 sm:mb-4 flex justify-center">{option.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold mb-2">{option.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">{option.description}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-checkout-green text-checkout-green hover:bg-checkout-green/10 w-full sm:w-auto" 
                  onClick={option.onClick}
                >
                  {option.action}
                </Button>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">{t('helpCenter.faqTitle')}</h3>
            <div className="space-y-4 sm:space-y-6">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="border border-checkout-green/10 rounded-2xl p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-checkout-green">
                    {faq.question}
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
              
              {filteredFaqs.length === 0 && searchQuery && (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                    {t('helpCenter.noResults')} "{searchQuery}"
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('helpCenter.notFound')}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-lg sm:text-xl">{t('helpCenter.contactTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('helpCenter.fullName')}</label>
                    <Input 
                      placeholder={t('helpCenter.yourName')} 
                      value={contactForm.name} 
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input 
                      type="email" 
                      placeholder={t('helpCenter.yourEmail')} 
                      value={contactForm.email} 
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('helpCenter.subject')}</label>
                  <Input 
                    placeholder={t('helpCenter.subjectPlaceholder')} 
                    value={contactForm.subject} 
                    onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('helpCenter.category')}</label>
                  <Select 
                    value={contactForm.category} 
                    onValueChange={value => setContactForm({ ...contactForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('helpCenter.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('helpCenter.categoryGeneral')}</SelectItem>
                      <SelectItem value="technical">{t('helpCenter.categoryTechnical')}</SelectItem>
                      <SelectItem value="payment">{t('helpCenter.categoryPayment')}</SelectItem>
                      <SelectItem value="suggestion">{t('helpCenter.categorySuggestion')}</SelectItem>
                      <SelectItem value="other">{t('helpCenter.categoryOther')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('helpCenter.message')}</label>
                  <Textarea 
                    placeholder={t('helpCenter.messagePlaceholder')} 
                    className="min-h-[120px]" 
                    value={contactForm.message} 
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })} 
                    required 
                  />
                </div>
                
                <Button type="submit" className="w-full bg-checkout-green hover:bg-checkout-green/90" disabled={loading}>
                  {loading ? t('helpCenter.sending') : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {t('helpCenter.sendEmail')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </>
  );
};

export default HelpCenter;
