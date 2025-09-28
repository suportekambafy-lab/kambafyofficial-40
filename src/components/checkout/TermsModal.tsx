import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsModalProps {
  children: React.ReactNode;
}

export const TermsModal = ({ children }: TermsModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Termos de Uso</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Última atualização: 1 de julho de 2025
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] px-6 pb-6">
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h3>
              <p className="text-sm text-muted-foreground">
                Ao realizar uma compra através da plataforma Kambafy, você concorda em cumprir estes Termos de Uso 
                e todas as leis aplicáveis. Se você não concordar com qualquer parte destes termos, 
                não deve efetuar a compra.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Sobre a Compra</h3>
              <p className="text-sm text-muted-foreground mb-3">
                A Kambafy atua como intermediária no processamento de pagamentos entre você e o vendedor. 
                Ao comprar um produto, você está:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Adquirindo um produto digital do vendedor indicado</li>
                <li>Concordando com as condições específicas do produto</li>
                <li>Autorizando o processamento do pagamento</li>
                <li>Recebendo acesso ao conteúdo após confirmação do pagamento</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Pagamentos</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">3.1 Processamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Os pagamentos são processados de forma segura através de nossos parceiros autorizados.
                    Todas as transações são protegidas por criptografia e medidas de segurança avançadas.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">3.2 Confirmação</h4>
                  <p className="text-sm text-muted-foreground">
                    Após a confirmação do pagamento, você receberá acesso imediato ao produto adquirido
                    através do email fornecido no momento da compra.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Acesso ao Produto</h3>
              <p className="text-sm text-muted-foreground mb-3">
                O acesso ao produto digital será disponibilizado através de:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Link de acesso enviado por email</li>
                <li>Credenciais de login quando aplicável</li>
                <li>Download direto para produtos específicos</li>
                <li>Acesso vitalício ou conforme especificado na descrição do produto</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Política de Reembolso</h3>
              <p className="text-sm text-muted-foreground mb-3">
                As políticas de reembolso são definidas individualmente por cada vendedor.
                Consulte a descrição do produto ou entre em contato diretamente com o vendedor
                para informações específicas sobre garantias e reembolsos.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Responsabilidades</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">6.1 Do Cliente</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Fornecer informações precisas para a compra</li>
                    <li>Usar o produto conforme os termos estabelecidos pelo vendedor</li>
                    <li>Não compartilhar indevidamente o conteúdo adquirido</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">6.2 Da Kambafy</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Processar pagamentos de forma segura</li>
                    <li>Entregar o acesso ao produto após confirmação do pagamento</li>
                    <li>Fornecer suporte técnico para questões da plataforma</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Limitação de Responsabilidade</h3>
              <p className="text-sm text-muted-foreground">
                A Kambafy atua apenas como intermediária. O conteúdo, qualidade e suporte
                do produto são de responsabilidade exclusiva do vendedor. Nossa responsabilidade
                limita-se ao processamento seguro do pagamento e entrega do acesso.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Suporte</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para questões relacionadas a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Problemas de pagamento: Entre em contato com nosso suporte</li>
                <li>Acesso ao produto: Verifique seu email ou contate nosso suporte</li>
                <li>Conteúdo do produto: Entre em contato diretamente com o vendedor</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Contato</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para questões sobre esta compra ou suporte técnico:
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Email:</strong> suporte@kambafy.com</p>
                <p className="text-sm"><strong>WhatsApp:</strong> +244 923 456 789</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};