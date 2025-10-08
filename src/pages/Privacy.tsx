import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <>
      <SEO 
        title="Política de Privacidade | Kambafy"
        description="Leia nossa política de privacidade e saiba como protegemos seus dados."
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
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-20 h-20 rounded-2xl flex items-center justify-center">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Política de Privacidade
            </h1>
            <p className="text-gray-400">Última atualização: Janeiro de 2024</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 space-y-10">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Informações que Coletamos</h2>
                <p className="text-gray-400 leading-relaxed">
                  Coletamos informações que você nos fornece diretamente, como nome, email, telefone e informações de pagamento quando você cria uma conta ou realiza uma compra. Também coletamos automaticamente dados de uso e dispositivo.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Como Usamos suas Informações</h2>
                <p className="text-gray-400 leading-relaxed">
                  Usamos as informações coletadas para processar transações, melhorar nossos serviços, comunicar com você, personalizar sua experiência e garantir a segurança da plataforma.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">3. Compartilhamento de Dados</h2>
                <p className="text-gray-400 leading-relaxed">
                  Não vendemos suas informações pessoais. Compartilhamos dados apenas com parceiros essenciais para operação da plataforma, como processadores de pagamento, serviços de hospedagem e ferramentas de análise.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Segurança</h2>
                <p className="text-gray-400 leading-relaxed">
                  Implementamos medidas de segurança técnicas e organizacionais robustas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia SSL/TLS e seguimos as melhores práticas da indústria.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Seus Direitos</h2>
                <p className="text-gray-400 leading-relaxed">
                  Você tem direito de acessar, corrigir, exportar ou excluir suas informações pessoais. Também pode solicitar a limitação do processamento ou se opor ao processamento de seus dados. Entre em contato conosco para exercer esses direitos.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Cookies e Tecnologias Similares</h2>
                <p className="text-gray-400 leading-relaxed">
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de cookies através das configurações do navegador.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Alterações na Política</h2>
                <p className="text-gray-400 leading-relaxed">
                  Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas através do email cadastrado ou de um aviso em nossa plataforma.
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h2 className="text-2xl font-semibold text-white mb-4">Contato</h2>
                <p className="text-gray-400 leading-relaxed">
                  Para questões sobre privacidade, entre em contato: <span className="text-purple-400">privacidade@kambafy.com</span>
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

export default Privacy;