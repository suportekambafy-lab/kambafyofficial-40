import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrivacyModalProps {
  children: React.ReactNode;
}

export const PrivacyModal = ({ children }: PrivacyModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Política de Privacidade</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Última atualização: 1 de julho de 2025
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Informações que Coletamos</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">1.1 Informações que Você Fornece</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Nome, email e informações de contato</li>
                    <li>Informações de perfil e preferências</li>
                    <li>Conteúdo que você cria e publica</li>
                    <li>Comentários e interações na plataforma</li>
                    <li>Informações de pagamento (processadas de forma segura)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">1.2 Informações Coletadas Automaticamente</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Dados de uso da plataforma</li>
                    <li>Informações do dispositivo e navegador</li>
                    <li>Endereço IP e localização geral</li>
                    <li>Cookies e tecnologias similares</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Como Usamos Suas Informações</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar transações e pagamentos</li>
                <li>Comunicar atualizações e ofertas relevantes</li>
                <li>Personalizar sua experiência na plataforma</li>
                <li>Detectar e prevenir atividades fraudulentas</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Compartilhamento de Informações</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Não vendemos suas informações pessoais. Compartilhamos informações apenas nas seguintes situações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Com provedores de serviços confiáveis (processamento de pagamentos, hospedagem)</li>
                <li>Quando exigido por lei ou processo legal</li>
                <li>Para proteger nossos direitos e os direitos dos usuários</li>
                <li>Com seu consentimento explícito</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Segurança dos Dados</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controles de acesso rigorosos</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Auditorias regulares de segurança</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Seus Direitos</h3>
              <p className="text-sm text-muted-foreground mb-3">Você tem os seguintes direitos sobre suas informações pessoais:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Acessar e revisar suas informações</li>
                <li>Corrigir informações imprecisas</li>
                <li>Solicitar a exclusão de suas informações</li>
                <li>Restringir o processamento de suas informações</li>
                <li>Portabilidade de dados</li>
                <li>Retirar consentimento a qualquer momento</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Cookies</h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência. 
                Você pode controlar o uso de cookies através das configurações do seu navegador.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Retenção de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Mantemos suas informações pelo tempo necessário para fornecer nossos serviços 
                e cumprir obrigações legais. Quando não precisarmos mais de suas informações, 
                elas serão excluídas de forma segura.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Contato</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para questões sobre esta política de privacidade ou seus dados pessoais, 
                entre em contato conosco:
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Email:</strong> privacidade@kambafy.com</p>
                <p className="text-sm"><strong>Endereço:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};