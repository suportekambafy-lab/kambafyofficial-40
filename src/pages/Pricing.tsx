import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Zap } from 'lucide-react';
import { SEO, pageSEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";

const Pricing = () => {
  const plans = [
    {
      name: "Plano Único",
      price: "0",
      period: "sem mensalidade",
      description: "Pague apenas quando vender",
      features: [
        "Produtos ilimitados",
        "Apenas 8% por transação",
        "Suporte por email",
        "Pagamentos em Kwanza",
        "Dashboard completo",
        "Analytics básicos",
        "Certificados digitais"
      ],
      highlighted: true
    }
  ];

  const withdrawalOptions = [
    {
      type: "Levantamento Normal",
      fee: "Gratuito",
      time: "3 dias úteis",
      description: "Receba seus ganhos via IBAN sem taxas adicionais",
      icon: Clock
    },
    {
      type: "Levantamento Instantâneo",
      fee: "10%",
      time: "Imediato",
      description: "Acesso instantâneo aos seus fundos via IBAN",
      icon: Zap
    }
  ];

  return (
    <>
      <SEO {...pageSEO.pricing} />
      <PageLayout title="Preços">
        <div className="space-y-8 md:space-y-12">
          <div className="text-center px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Preços <span className="text-checkout-green">Simples e Transparentes</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Sem mensalidades, sem taxas ocultas. Você só paga quando vende.
            </p>
          </div>

          {/* Plano Principal */}
          <div className="max-w-md mx-auto px-4">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className="relative p-4 sm:p-6 lg:p-8 rounded-2xl border border-checkout-green bg-checkout-green/5 ring-2 ring-checkout-green"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-checkout-green text-white px-4 py-2 rounded-full text-sm font-medium">
                    Plano Único
                  </span>
                </div>
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground"> AOA</span>
                  </div>
                  <p className="text-muted-foreground">{plan.period}</p>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-checkout-green flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full bg-checkout-green hover:bg-checkout-green/90 text-white"
                >
                  Começar Agora
                </Button>
              </div>
            ))}
          </div>

          {/* Taxas de Transação */}
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 lg:p-8 mx-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Taxas por Transação</h3>
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-checkout-green mb-2">8%</div>
                <p className="text-sm sm:text-base text-gray-600">Por cada venda realizada</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Taxa aplicada apenas sobre vendas concluídas
                </p>
              </div>
            </div>
          </div>

          {/* Métodos de Pagamento */}
          <div className="px-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Métodos de Pagamento</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Para Clientes</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Multicaixa Express</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Pagamento por referência</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Transferência Bancária</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Para Vendedores</h4>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Recebimento via IBAN</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Transferência direta para conta</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-checkout-green flex-shrink-0" />
                    <span className="text-sm sm:text-base">Processamento automático</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Opções de Levantamento */}
          <div className="px-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Opções de Levantamento</h3>
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
                      <span className="text-sm sm:text-base text-gray-600">Taxa:</span>
                      <span className="text-sm sm:text-base font-semibold text-checkout-green">{option.fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm sm:text-base text-gray-600">Tempo:</span>
                      <span className="text-sm sm:text-base font-semibold">{option.time}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-500">{option.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6 lg:p-8 text-center mx-4">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Tem Dúvidas?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              Nossa equipe está pronta para esclarecer qualquer questão sobre preços e taxas.
            </p>
            <Button 
              variant="outline" 
              className="border-checkout-green text-checkout-green hover:bg-checkout-green/10 w-full sm:w-auto"
              asChild
            >
              <SubdomainLink to="/contato">
                Falar com Suporte
              </SubdomainLink>
            </Button>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Pricing;
