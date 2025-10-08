
import { PageLayout } from "@/components/PageLayout";

const Terms = () => {
  return (
    <PageLayout title="Termos de Uso">
      <div className="prose prose-gray max-w-none space-y-6 sm:space-y-8 px-4">
        <div className="bg-checkout-green/5 border border-checkout-green/20 rounded-2xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">Última atualização: 1 de julho de 2025</p>
          <p className="text-sm sm:text-base">
            Estes Termos de Uso estabelecem as condições para utilização da plataforma Kambafy. 
            Ao usar nossos serviços, você concorda com estes termos.
          </p>
        </div>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">1. Aceitação dos Termos</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ao acessar e usar a plataforma Kambafy, você concorda em cumprir estes Termos de Uso 
            e todas as leis aplicáveis. Se você não concordar com qualquer parte destes termos, 
            não deve usar nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">2. Descrição do Serviço</h2>
          <p className="text-muted-foreground mb-4">
            A Kambafy é uma plataforma que permite a criação, venda e compra de infoprodutos. 
            Nossos serviços incluem:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Ferramentas para criação de conteúdo digital</li>
            <li>Sistema de pagamentos seguro</li>
            <li>Hospedagem e distribuição de conteúdo</li>
            <li>Analytics e relatórios</li>
            <li>Suporte ao cliente</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">3. Cadastro e Conta</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">3.1 Elegibilidade</h3>
              <p className="text-muted-foreground">
                Para usar nossos serviços, você deve ter pelo menos 18 anos de idade 
                ou ter permissão dos pais/responsáveis.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">3.2 Responsabilidades</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Fornecer informações precisas e atualizadas</li>
                <li>Manter a segurança de sua conta</li>
                <li>Não compartilhar suas credenciais</li>
                <li>Notificar-nos sobre uso não autorizado</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">4. Conteúdo e Propriedade Intelectual</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">4.1 Seu Conteúdo</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Você mantém todos os direitos sobre o conteúdo que cria</li>
                <li>Deve ter os direitos necessários para todo conteúdo publicado</li>
                <li>É responsável pela qualidade e legalidade do conteúdo</li>
                <li>Concede à Kambafy licença para hospedar e distribuir seu conteúdo</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">4.2 Conteúdo Proibido</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
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
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">5. Pagamentos e Taxas</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">5.1 Comissões</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Taxa única de 8% por transação bem-sucedida</li>
                <li>Sem mensalidades ou custos fixos</li>
                <li>Você paga apenas quando vende</li>
                <li>Taxas claramente informadas antes da transação</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">5.2 Pagamentos</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Processamento seguro através de parceiros confiáveis</li>
                <li>Repasses realizados conforme cronograma estabelecido</li>
                <li>Retenção de impostos conforme legislação angolana</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">6. Uso Adequado</h2>
          <p className="text-muted-foreground mb-4">Você concorda em não:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Violar leis ou regulamentos aplicáveis</li>
            <li>Interferir no funcionamento da plataforma</li>
            <li>Tentar acessar contas de outros usuários</li>
            <li>Usar a plataforma para atividades fraudulentas</li>
            <li>Copiar ou reproduzir conteúdo sem autorização</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">7. Rescisão</h2>
          <p className="text-muted-foreground">
            Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar 
            sua conta por violação destes termos, com aviso prévio quando possível. 
            Após o encerramento, você perde o acesso à plataforma, mas mantém os direitos 
            sobre seu conteúdo.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">8. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground">
            A Kambafy não se responsabiliza por danos indiretos, incidentais ou consequentes 
            decorrentes do uso da plataforma. Nossa responsabilidade total é limitada ao 
            valor pago pelos serviços nos últimos 12 meses.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-checkout-green">9. Lei Aplicável</h2>
          <p className="text-muted-foreground">
            Estes termos são regidos pelas leis da República de Angola. 
            Disputas serão resolvidas nos tribunais competentes de Luanda.
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4 text-checkout-green">10. Contato</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Para questões sobre estes termos, entre em contato:
          </p>
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-sm sm:text-base"><strong>Email:</strong> legal@kambafy.com</p>
            <p className="text-sm sm:text-base"><strong>Endereço:</strong> Rua da Independência, Nº 123, Maianga, Luanda - Angola</p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Terms;
