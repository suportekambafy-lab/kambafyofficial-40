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
                  <h4 className="text-base font-medium mb-2">1.1 Durante a Compra</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Nome completo e email para entrega do produto</li>
                    <li>Informações de contato fornecidas</li>
                    <li>Dados de pagamento (processados de forma segura)</li>
                    <li>Endereço IP para segurança da transação</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">1.2 Informações Automáticas</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Dados do dispositivo usado na compra</li>
                    <li>Informações do navegador</li>
                    <li>Localização geral para processamento do pagamento</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Como Usamos Suas Informações</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Processar sua compra e pagamento</li>
                <li>Entregar o acesso ao produto adquirido</li>
                <li>Enviar confirmações e recibos por email</li>
                <li>Fornecer suporte técnico quando necessário</li>
                <li>Detectar e prevenir atividades fraudulentas</li>
                <li>Cumprir obrigações legais e fiscais</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Compartilhamento de Informações</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Suas informações podem ser compartilhadas apenas nas seguintes situações:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Com o vendedor do produto para entrega e suporte</li>
                <li>Com processadores de pagamento para completar a transação</li>
                <li>Quando exigido por lei ou autoridades competentes</li>
                <li>Para proteger contra fraudes ou atividades ilegais</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Segurança dos Dados</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Protegemos suas informações através de:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Criptografia SSL em todas as transações</li>
                <li>Servidores seguros com controle de acesso</li>
                <li>Processamento de pagamentos através de parceiros certificados</li>
                <li>Monitoramento constante contra atividades suspeitas</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Seus Direitos</h3>
              <p className="text-sm text-muted-foreground mb-3">Você tem o direito de:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Solicitar acesso às informações que temos sobre você</li>
                <li>Corrigir informações incorretas</li>
                <li>Solicitar a exclusão de seus dados pessoais</li>
                <li>Retirar consentimento para comunicações de marketing</li>
                <li>Receber uma cópia de seus dados em formato legível</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Cookies e Tecnologias Similares</h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies essenciais para processar sua compra de forma segura,
                lembrar suas preferências e melhorar sua experiência de compra.
                Você pode controlar os cookies através das configurações do seu navegador.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Retenção de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Mantemos suas informações de compra pelo tempo necessário para:
                fornecer suporte ao produto adquirido, cumprir obrigações fiscais
                e legais, e processar eventuais reembolsos conforme as políticas
                do vendedor.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Comunicações</h3>
              <p className="text-sm text-muted-foreground">
                Enviaremos apenas comunicações essenciais relacionadas à sua compra:
                confirmação de pagamento, instruções de acesso ao produto e suporte técnico.
                Você pode optar por não receber comunicações promocionais.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Contato</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para questões sobre esta política ou seus dados pessoais:
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Email:</strong> privacidade@kambafy.com</p>
                <p className="text-sm"><strong>WhatsApp:</strong> +244 923 456 789</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};