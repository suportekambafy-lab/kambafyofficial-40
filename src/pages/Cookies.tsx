import { SEO } from "@/components/SEO";
import { SubdomainLink } from "@/components/SubdomainLink";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const Cookies = () => {
  return (
    <>
      <SEO 
        title="Política de Cookies | Kambafy"
        description="Entenda como usamos cookies e tecnologias similares na plataforma."
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
              <div className="bg-gradient-to-br from-orange-500 to-red-500 w-20 h-20 rounded-2xl flex items-center justify-center">
                <Cookie className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Política de Cookies
            </h1>
            <p className="text-gray-400">Última atualização: Janeiro de 2024</p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 space-y-10">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">1. O que são Cookies?</h2>
                <p className="text-gray-400 leading-relaxed">
                  Cookies são pequenos arquivos de texto armazenados em seu dispositivo quando você visita um website. Eles nos ajudam a entender como você usa nossa plataforma e a personalizar sua experiência.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Tipos de Cookies</h2>
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-3">Cookies Essenciais</h3>
                    <p className="text-gray-400 mb-3">Necessários para o funcionamento básico da plataforma.</p>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>Autenticação e segurança</li>
                      <li>Preferências de idioma</li>
                      <li>Carrinho de compras</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-3">Cookies de Performance</h3>
                    <p className="text-gray-400 mb-3">Coletam informações sobre como você usa nosso site.</p>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>Páginas mais visitadas</li>
                      <li>Tempo gasto na plataforma</li>
                      <li>Detecção de erros</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-semibold text-white mb-3">Cookies de Funcionalidade</h3>
                    <p className="text-gray-400 mb-3">Permitem lembrar suas escolhas e personalizar sua experiência.</p>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>Configurações de interface</li>
                      <li>Histórico de navegação</li>
                      <li>Conteúdo personalizado</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">3. Cookies de Terceiros</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Também usamos cookies de parceiros confiáveis para melhorar nossos serviços:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                    <h4 className="font-semibold text-white mb-2">Google Analytics</h4>
                    <p className="text-sm text-gray-400">Análise de tráfego e comportamento</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                    <h4 className="font-semibold text-white mb-2">Stripe</h4>
                    <p className="text-sm text-gray-400">Processamento seguro de pagamentos</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Gerenciar Cookies</h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Você pode controlar e gerenciar cookies através das configurações do seu navegador:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Chrome: Configurações → Privacidade e segurança → Cookies</li>
                  <li>Firefox: Preferências → Privacidade e segurança</li>
                  <li>Safari: Preferências → Privacidade</li>
                  <li>Edge: Configurações → Privacidade, pesquisa e serviços</li>
                </ul>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-3">⚠️ Atenção</h3>
                <p className="text-gray-400">
                  Desativar cookies pode afetar a funcionalidade da plataforma. Alguns recursos podem não funcionar corretamente, como login automático, preferências salvas e carrinho de compras.
                </p>
              </div>

              <div className="pt-6 border-t border-white/10">
                <h2 className="text-2xl font-semibold text-white mb-4">Contato</h2>
                <p className="text-gray-400 leading-relaxed">
                  Para questões sobre cookies, entre em contato: <span className="text-orange-400">privacidade@kambafy.com</span>
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

export default Cookies;