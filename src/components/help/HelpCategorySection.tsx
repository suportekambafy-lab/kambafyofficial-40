import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQ {
  question: string;
  answer: string;
}

interface HelpCategorySectionProps {
  id: string;
  title: string;
  description: string;
  faqs: FAQ[];
  searchQuery: string;
}

export const HelpCategorySection = ({ id, title, description, faqs, searchQuery }: HelpCategorySectionProps) => {
  const filteredFaqs = faqs.filter(
    faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
           faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (searchQuery && filteredFaqs.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
      </div>
      
      <Accordion type="single" collapsible className="space-y-3">
        {filteredFaqs.map((faq, index) => (
          <AccordionItem 
            key={index} 
            value={`${id}-${index}`}
            className="border border-checkout-green/10 rounded-xl px-4 sm:px-6 data-[state=open]:bg-checkout-green/5"
          >
            <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline py-4">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-4 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
