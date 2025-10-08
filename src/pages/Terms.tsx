import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <>
      <SEO 
        title="Termos de Uso | Kambafy"
        description="Leia nossos termos de uso e entenda as regras de utilização da plataforma."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-black/20">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <SubdomainLink to="/" className="flex items-center">
                <img 
                  src="/kambafy-logo-white.png" 
                  alt="Kambafy" 
                  className="h-8"
                />
              </SubdomainLink>
              <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SubdomainLink to="/">
                  Voltar ao Início
                </SubdomainLink>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-20 h-20 rounded-2xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Termos de Uso
            </h1>
            <p className="text-gray-400">Última atualização: Janeiro de 2024</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 space-y-10">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Aceitação dos Termos</h2>
                <p className="text-gray-400 leading-relaxed">
                  Ao acessar e usar a plataforma Kambafy, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não use nossa plataforma.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Uso da Plataforma</h2>
                <p className="text-gray-400 leading-relaxed">
                  A Kambafy fornece uma plataforma para criação e gestão de lojas online. Você é responsável por manter a confidencialidade de sua conta e senha, e por todas as atividades que ocorram sob sua conta. Você concorda em usar a plataforma apenas para fins legais e de acordo com estes termos.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">3. Contas de Usuário</h2>
                <p className="text-gray-400 leading-relaxed">
                  Para usar determinados recursos da plataforma, você precisará criar uma conta. Você deve fornecer informações precisas e completas durante o registro e manter suas informações atualizadas. Você é responsável por todas as atividades em sua conta.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Pagamentos e Taxas</h2>
                <p className="text-gray-400 leading-relaxed">
                  Alguns recursos da plataforma podem estar sujeitos a taxas. Você concorda em pagar todas as taxas aplicáveis conforme descrito em nossos planos de preços. Todas as taxas são não reembolsáveis, exceto quando exigido por lei.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Conteúdo do Usuário</h2>
                <p className="text-gray-400 leading-relaxed">
                  Você mantém todos os direitos sobre o conteúdo que você carrega ou compartilha através da plataforma. No entanto, você nos concede uma licença mundial, não exclusiva e livre de royalties para usar, reproduzir e exibir seu conteúdo conforme necessário para fornecer nossos serviços.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Conduta Proibida</h2>
                <p className="text-gray-400 leading-relaxed">
                  Você concorda em não usar a plataforma para atividades ilegais, fraudulentas ou que violem os direitos de terceiros. Isso inclui, mas não se limita a, venda de produtos proibidos, spam, tentativas de hacking ou qualquer outra atividade prejudicial.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Limitação de Responsabilidade</h2>
                <p className="text-gray-400 leading-relaxed">
                  A Kambafy não será responsável por quaisquer danos diretos, indiretos, incidentais ou consequenciais resultantes do uso ou incapacidade de usar a plataforma. Fornecemos a plataforma "como está" sem garantias de qualquer tipo.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">8. Modificações</h2>
                <p className="text-gray-400 leading-relaxed">
                  Reservamos o direito de modificar estes termos a qualquer momento. Notificaremos você sobre mudanças significativas. Seu uso continuado da plataforma após tais modificações constitui sua aceitação dos novos termos.
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h2 className="text-2xl font-semibold text-white mb-4">Contato</h2>
                <p className="text-gray-400 leading-relaxed">
                  Para questões sobre estes termos, entre em contato: <span className="text-blue-400">legal@kambafy.com</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 mt-20">
          <div className="mx-auto max-w-7xl px-6 text-center text-gray-500">
            <p>© 2024 Kambafy. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Terms;