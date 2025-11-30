import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type PolicyType = 'terms' | 'privacy';

interface PoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyType: PolicyType;
}

export function PoliciesModal({ isOpen, onClose, policyType }: PoliciesModalProps) {
  const content = {
    terms: {
      title: "Termos de Utilização",
      content: `
        <h2 class="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
        <p class="mb-4">Ao acessar e usar o Kambafy, você concorda em cumprir e estar vinculado aos seguintes termos e condições.</p>
        
        <h2 class="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
        <p class="mb-4">O Kambafy é uma plataforma que permite aos usuários vender produtos digitais, gerenciar vendas e processar pagamentos.</p>
        
        <h2 class="text-xl font-semibold mb-4">3. Conta de Usuário</h2>
        <p class="mb-4">Você é responsável por manter a confidencialidade da sua conta e senha. Você concorda em aceitar a responsabilidade por todas as atividades que ocorrem sob sua conta.</p>
        
        <h2 class="text-xl font-semibold mb-4">4. Produtos e Conteúdo</h2>
        <p class="mb-4">Os vendedores são responsáveis pelo conteúdo e produtos que oferecem na plataforma. O Kambafy não se responsabiliza pelo conteúdo gerado pelos usuários.</p>
        
        <h2 class="text-xl font-semibold mb-4">5. Pagamentos e Taxas</h2>
        <p class="mb-4">Todas as transações estão sujeitas às taxas da plataforma conforme divulgado. O Kambafy utiliza processadores de pagamento terceiros para processar transações.</p>
        
        <h2 class="text-xl font-semibold mb-4">6. Propriedade Intelectual</h2>
        <p class="mb-4">Todo o conteúdo da plataforma Kambafy, incluindo textos, gráficos, logos e software, é propriedade do Kambafy ou de seus licenciadores.</p>
        
        <h2 class="text-xl font-semibold mb-4">7. Proibições</h2>
        <p class="mb-4">É proibido usar a plataforma para qualquer propósito ilegal ou não autorizado. Você não deve violar leis na sua jurisdição.</p>
        
        <h2 class="text-xl font-semibold mb-4">8. Rescisão</h2>
        <p class="mb-4">Podemos rescindir ou suspender sua conta imediatamente, sem aviso prévio, por qualquer motivo, incluindo violação destes Termos.</p>
        
        <h2 class="text-xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
        <p class="mb-4">O Kambafy não será responsável por quaisquer danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma.</p>
        
        <h2 class="text-xl font-semibold mb-4">10. Modificações</h2>
        <p class="mb-4">Reservamo-nos o direito de modificar estes termos a qualquer momento. Continuando a usar a plataforma após as mudanças, você aceita os termos revisados.</p>
        
        <h2 class="text-xl font-semibold mb-4">11. Contato</h2>
        <p class="mb-4">Para questões sobre estes Termos, entre em contato conosco através do email: suporte@kambafy.com</p>
      `
    },
    privacy: {
      title: "Política de Privacidade",
      content: `
        <h2 class="text-xl font-semibold mb-4">1. Informações que Coletamos</h2>
        <p class="mb-4">Coletamos informações que você nos fornece diretamente, como nome, email, informações de pagamento e dados de produtos.</p>
        
        <h2 class="text-xl font-semibold mb-4">2. Como Usamos suas Informações</h2>
        <p class="mb-4">Usamos suas informações para:</p>
        <ul class="list-disc ml-6 mb-4">
          <li>Fornecer, manter e melhorar nossos serviços</li>
          <li>Processar transações e enviar notificações</li>
          <li>Responder a suas solicitações e fornecer suporte</li>
          <li>Enviar comunicações técnicas e de marketing</li>
          <li>Proteger contra fraudes e abusos</li>
        </ul>
        
        <h2 class="text-xl font-semibold mb-4">3. Compartilhamento de Informações</h2>
        <p class="mb-4">Não vendemos suas informações pessoais. Podemos compartilhar informações com:</p>
        <ul class="list-disc ml-6 mb-4">
          <li>Processadores de pagamento para completar transações</li>
          <li>Provedores de serviços que nos ajudam a operar</li>
          <li>Autoridades legais quando exigido por lei</li>
        </ul>
        
        <h2 class="text-xl font-semibold mb-4">4. Cookies e Tecnologias de Rastreamento</h2>
        <p class="mb-4">Usamos cookies e tecnologias similares para melhorar sua experiência, analisar tendências e administrar a plataforma.</p>
        
        <h2 class="text-xl font-semibold mb-4">5. Segurança de Dados</h2>
        <p class="mb-4">Implementamos medidas de segurança para proteger suas informações pessoais. No entanto, nenhum método de transmissão pela internet é 100% seguro.</p>
        
        <h2 class="text-xl font-semibold mb-4">6. Seus Direitos</h2>
        <p class="mb-4">Você tem o direito de:</p>
        <ul class="list-disc ml-6 mb-4">
          <li>Acessar suas informações pessoais</li>
          <li>Corrigir dados imprecisos</li>
          <li>Solicitar a exclusão de seus dados</li>
          <li>Opor-se ao processamento de suas informações</li>
          <li>Retirar seu consentimento</li>
        </ul>
        
        <h2 class="text-xl font-semibold mb-4">7. Retenção de Dados</h2>
        <p class="mb-4">Mantemos suas informações pessoais pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais.</p>
        
        <h2 class="text-xl font-semibold mb-4">8. Crianças</h2>
        <p class="mb-4">Nossos serviços não são destinados a menores de 18 anos. Não coletamos intencionalmente informações de crianças.</p>
        
        <h2 class="text-xl font-semibold mb-4">9. Transferências Internacionais</h2>
        <p class="mb-4">Suas informações podem ser transferidas e mantidas em computadores localizados fora do seu país, onde as leis de proteção de dados podem diferir.</p>
        
        <h2 class="text-xl font-semibold mb-4">10. Alterações à Política</h2>
        <p class="mb-4">Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas.</p>
        
        <h2 class="text-xl font-semibold mb-4">11. Contato</h2>
        <p class="mb-4">Para questões sobre privacidade, entre em contato: privacidade@kambafy.com</p>
      `
    }
  };

  const { title, content: htmlContent } = content[policyType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
