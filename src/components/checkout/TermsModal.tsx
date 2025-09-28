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
                Ao acessar e usar a plataforma Kambafy, você concorda em cumprir estes Termos de Uso 
                e todas as leis aplicáveis. Se você não concordar com qualquer parte destes termos, 
                não deve usar nossos serviços.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Descrição do Serviço</h3>
              <p className="text-sm text-muted-foreground mb-3">
                A Kambafy é uma plataforma que permite a criação, venda e compra de infoprodutos. 
                Nossos serviços incluem:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Ferramentas para criação de conteúdo digital</li>
                <li>Sistema de pagamentos seguro</li>
                <li>Hospedagem e distribuição de conteúdo</li>
                <li>Analytics e relatórios</li>
                <li>Suporte ao cliente</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Cadastro e Conta</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">3.1 Elegibilidade</h4>
                  <p className="text-sm text-muted-foreground">
                    Para usar nossos serviços, você deve ter pelo menos 18 anos de idade 
                    ou ter permissão dos pais/responsáveis.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">3.2 Responsabilidades</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Fornecer informações precisas e atualizadas</li>
                    <li>Manter a segurança de sua conta</li>
                    <li>Não compartilhar suas credenciais</li>
                    <li>Notificar-nos sobre uso não autorizado</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Conteúdo e Propriedade Intelectual</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">4.1 Seu Conteúdo</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Você mantém todos os direitos sobre o conteúdo que cria</li>
                    <li>Deve ter os direitos necessários para todo conteúdo publicado</li>
                    <li>É responsável pela qualidade e legalidade do conteúdo</li>
                    <li>Concede à Kambafy licença para hospedar e distribuir seu conteúdo</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">4.2 Conteúdo Proibido</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Conteúdo ilegal, difamatório ou prejudicial</li>
                    <li>Material protegido por direitos autorais sem autorização</li>
                    <li>Conteúdo pornográfico ou sexualmente explícito</li>
                    <li>Spam ou conteúdo enganoso</li>
                    <li>Vírus ou código malicioso</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Pagamentos e Taxas</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-medium mb-2">5.1 Comissões</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Plano Gratuito: 10% de comissão por venda</li>
                    <li>Plano Profissional: 5% de comissão por venda</li>
                    <li>Taxas claramente informadas antes da transação</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-base font-medium mb-2">5.2 Pagamentos</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Processamento seguro através de parceiros confiáveis</li>
                    <li>Repasses realizados conforme cronograma estabelecido</li>
                    <li>Retenção de impostos conforme legislação angolana</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Uso Adequado</h3>
              <p className="text-sm text-muted-foreground mb-3">Você concorda em não:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Violar leis ou regulamentos aplicáveis</li>
                <li>Interferir no funcionamento da plataforma</li>
                <li>Tentar acessar contas de outros usuários</li>
                <li>Usar a plataforma para atividades fraudulentas</li>
                <li>Copiar ou reproduzir conteúdo sem autorização</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Rescisão</h3>
              <p className="text-sm text-muted-foreground">
                Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar 
                sua conta por violação destes termos, com aviso prévio quando possível. 
                Após o encerramento, você perde o acesso à plataforma, mas mantém os direitos 
                sobre seu conteúdo.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Limitação de Responsabilidade</h3>
              <p className="text-sm text-muted-foreground">
                A Kambafy não se responsabiliza por danos indiretos, incidentais ou consequentes 
                decorrentes do uso da plataforma. Nossa responsabilidade total é limitada ao 
                valor pago pelos serviços nos últimos 12 meses.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Lei Aplicável</h3>
              <p className="text-sm text-muted-foreground">
                Estes termos são regidos pelas leis da República de Angola. 
                Disputas serão resolvidas nos tribunais competentes de Luanda.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Contato</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Para questões sobre estes termos, entre em contato:
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Email:</strong> legal@kambafy.com</p>
                <p className="text-sm"><strong>Endereço:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};