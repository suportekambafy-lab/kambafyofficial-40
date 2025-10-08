
import { PageLayout } from "@/components/PageLayout";

const Privacy = () => {
  return (
    <PageLayout title="Política de Privacidade">
      <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 px-4">
        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Última atualização: 1 de julho de 2025</p>
          <p className="text-sm sm:text-base">
            Esta Política de Privacidade descreve como a Kambafy coleta, usa e protege 
            suas informações pessoais quando você utiliza nossa plataforma.
          </p>
        </div>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">1. Informações que Coletamos</h2>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">1.1 Informações que Você Fornece</h3>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                <li>Nome, email e informações de contato</li>
                <li>Informações de perfil e preferências</li>
                <li>Conteúdo que você cria e publica</li>
                <li>Comentários e interações na plataforma</li>
                <li>Informações de pagamento (processadas de forma segura)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">1.2 Informações Coletadas Automaticamente</h3>
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                <li>Dados de uso da plataforma</li>
                <li>Informações do dispositivo e navegador</li>
                <li>Endereço IP e localização geral</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">2. Como Usamos Suas Informações</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Fornecer e melhorar nossos serviços</li>
            <li>Processar transações e pagamentos</li>
            <li>Comunicar atualizações e ofertas relevantes</li>
            <li>Personalizar sua experiência na plataforma</li>
            <li>Detectar e prevenir atividades fraudulentas</li>
            <li>Cumprir obrigações legais</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">3. Compartilhamento de Informações</h2>
          <p className="text-muted-foreground mb-4">
            Não vendemos suas informações pessoais. Compartilhamos informações apenas nas seguintes situações:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Com provedores de serviços confiáveis (processamento de pagamentos, hospedagem)</li>
            <li>Quando exigido por lei ou processo legal</li>
            <li>Para proteger nossos direitos e os direitos dos usuários</li>
            <li>Com seu consentimento explícito</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">4. Segurança dos Dados</h2>
          <p className="text-muted-foreground mb-4">
            Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Controles de acesso rigorosos</li>
            <li>Monitoramento contínuo de segurança</li>
            <li>Auditorias regulares de segurança</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">5. Seus Direitos</h2>
          <p className="text-muted-foreground mb-4">Você tem os seguintes direitos sobre suas informações pessoais:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Acessar e revisar suas informações</li>
            <li>Corrigir informações imprecisas</li>
            <li>Solicitar a exclusão de suas informações</li>
            <li>Restringir o processamento de suas informações</li>
            <li>Portabilidade de dados</li>
            <li>Retirar consentimento a qualquer momento</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">6. Cookies</h2>
          <p className="text-muted-foreground mb-4">
            Utilizamos cookies e tecnologias similares para melhorar sua experiência. 
            Você pode controlar o uso de cookies através das configurações do seu navegador.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">7. Retenção de Dados</h2>
          <p className="text-muted-foreground">
            Mantemos suas informações pelo tempo necessário para fornecer nossos serviços 
            e cumprir obrigações legais. Quando não precisarmos mais de suas informações, 
            elas serão excluídas de forma segura.
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">8. Contato</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Para questões sobre esta política de privacidade ou seus dados pessoais, 
            entre em contato conosco:
          </p>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-sm sm:text-base"><strong>Email:</strong> privacidade@kambafy.com</p>
            <p className="text-sm sm:text-base"><strong>Endereço:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Privacy;
