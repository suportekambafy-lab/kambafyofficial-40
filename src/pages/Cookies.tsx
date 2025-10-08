
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

const Cookies = () => {
  return (
    <PageLayout title="Política de Cookies">
      <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 px-4">
        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Última atualização: 1 de julho de 2025</p>
          <p className="text-sm sm:text-base">
            Esta Política de Cookies explica como a Kambafy usa cookies e tecnologias similares 
            para melhorar sua experiência em nossa plataforma.
          </p>
        </div>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">1. O que são Cookies?</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Cookies são pequenos arquivos de texto que são armazenados em seu dispositivo 
            quando você visita um website. Eles nos ajudam a entender como você usa nossa 
            plataforma e a personalizar sua experiência.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">2. Tipos de Cookies que Utilizamos</h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2">2.1 Cookies Essenciais</h3>
              <p className="text-muted-foreground mb-2">
                Necessários para o funcionamento básico da plataforma.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Autenticação e segurança</li>
                <li>Preferências de idioma</li>
                <li>Carrinho de compras</li>
                <li>Balanceamento de carga</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2">2.2 Cookies de Performance</h3>
              <p className="text-muted-foreground mb-2">
                Coletam informações sobre como você usa nosso site.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Páginas mais visitadas</li>
                <li>Tempo gasto na plataforma</li>
                <li>Detecção de erros</li>
                <li>Velocidade de carregamento</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2">2.3 Cookies de Funcionalidade</h3>
              <p className="text-muted-foreground mb-2">
                Permitem lembrar suas escolhas e personalizar sua experiência.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Configurações de interface</li>
                <li>Histórico de navegação</li>
                <li>Conteúdo personalizado</li>
                <li>Preferências de usuário</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2">2.4 Cookies de Marketing</h3>
              <p className="text-muted-foreground mb-2">
                Usados para mostrar anúncios relevantes e medir campanhas.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Publicidade direcionada</li>
                <li>Rastreamento de conversões</li>
                <li>Análise de campanhas</li>
                <li>Redes sociais integradas</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">3. Cookies de Terceiros</h2>
          <p className="text-muted-foreground mb-4">
            Também usamos cookies de parceiros confiáveis para melhorar nossos serviços:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Google Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Análise de tráfego e comportamento dos usuários
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Hotjar</h4>
              <p className="text-sm text-muted-foreground">
                Mapas de calor e gravações de sessões
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Facebook Pixel</h4>
              <p className="text-sm text-muted-foreground">
                Otimização de campanhas publicitárias
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Stripe</h4>
              <p className="text-sm text-muted-foreground">
                Processamento seguro de pagamentos
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">4. Gerenciar Cookies</h2>
          <p className="text-muted-foreground mb-4">
            Você pode controlar e gerenciar cookies de várias formas:
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">4.1 Configurações do Navegador</h3>
              <p className="text-muted-foreground mb-2">
                A maioria dos navegadores permite gerenciar cookies através das configurações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Chrome: Configurações {"> Privacidade e segurança > Cookies"}</li>
                <li>Firefox: Preferências {"> Privacidade e segurança"}</li>
                <li>Safari: Preferências {"> Privacidade"}</li>
                <li>Edge: Configurações {"> Privacidade, pesquisa e serviços"}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">4.2 Opções de Exclusão</h3>
              <p className="text-muted-foreground">
                Você pode optar por não receber cookies de marketing através dos links abaixo:
              </p>
              <div className="mt-3 space-y-2">
                <Button variant="outline" size="sm" className="mr-2">
                  Google Analytics Opt-out
                </Button>
                <Button variant="outline" size="sm" className="mr-2">
                  Facebook Opt-out
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">5. Impacto da Desativação</h2>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-muted-foreground">
              <strong>Atenção:</strong> Desativar cookies pode afetar a funcionalidade da plataforma. 
              Alguns recursos podem não funcionar corretamente, como:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Login automático</li>
              <li>Preferências salvas</li>
              <li>Carrinho de compras</li>
              <li>Conteúdo personalizado</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">6. Atualizações desta Política</h2>
          <p className="text-muted-foreground">
            Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças 
            em nossos serviços ou requisitos legais. Notificaremos sobre mudanças significativas 
            através de nossa plataforma ou por email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">7. Contato</h2>
          <p className="text-muted-foreground">
            Para questões sobre cookies ou esta política, entre em contato:
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p><strong>Email:</strong> privacidade@kambafy.com</p>
            <p><strong>Endereço:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
          </div>
        </section>

        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6 text-center">
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Configurar Preferências de Cookies</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            Personalize suas preferências de cookies para uma experiência otimizada.
          </p>
          <Button className="bg-checkout-green hover:bg-checkout-green/90 text-white w-full sm:w-auto">
            Gerenciar Cookies
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default Cookies;
