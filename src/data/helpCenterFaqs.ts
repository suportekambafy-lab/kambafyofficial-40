export interface FAQ {
  question: string;
  answer: string;
}

export interface CategoryData {
  id: string;
  title: string;
  description: string;
  faqs: FAQ[];
}

export const helpCenterCategories: CategoryData[] = [
  {
    id: 'geral',
    title: 'Perguntas Gerais',
    description: 'Dúvidas sobre como começar e usar a plataforma.',
    faqs: [
      {
        question: 'Como começar a vender na Kambafy?',
        answer: 'Para começar, crie sua conta gratuita, configure seu perfil de criador e publique seu primeiro produto. Nossa equipe está disponível para ajudar em cada passo.'
      },
      {
        question: 'Como funciona a comissão da plataforma?',
        answer: 'A Kambafy cobra apenas 8,99% por cada venda realizada. Não há planos ou mensalidades - você paga apenas quando vende.'
      },
      {
        question: 'Posso personalizar minha página de criador?',
        answer: 'Sim! Você pode personalizar cores, logos, descrições e até usar seu próprio domínio no plano profissional.'
      },
      {
        question: 'Como proteger meu conteúdo contra pirataria?',
        answer: 'Usamos tecnologia avançada de proteção, incluindo marca d\'água em vídeos, acesso restrito e monitoramento contínuo.'
      },
      {
        question: 'Qual suporte técnico disponível?',
        answer: 'Oferecemos suporte por email e chat ao vivo. Usuários profissionais têm suporte prioritário 24/7.'
      }
    ]
  },
  {
    id: 'coproducao',
    title: 'Co-produção',
    description: 'Saiba como compartilhar receita com parceiros e co-produtores.',
    faqs: [
      {
        question: 'O que é co-produção?',
        answer: 'Co-produção é um modelo de parceria onde você convida outras pessoas para participar das vendas de um produto, compartilhando uma porcentagem da receita automaticamente.'
      },
      {
        question: 'Como convidar um co-produtor?',
        answer: 'Acesse a aba "Co-Produção" na edição do seu produto, clique em "Convidar Co-produtor" e insira o email da pessoa, a porcentagem de comissão (1-99%) e a duração do contrato.'
      },
      {
        question: 'Como funciona a divisão de comissões?',
        answer: 'A cada venda, a comissão é automaticamente dividida entre você (produtor) e os co-produtores conforme os percentuais definidos. O valor é creditado diretamente no saldo de cada um.'
      },
      {
        question: 'Posso cancelar uma co-produção?',
        answer: 'Sim. Convites pendentes podem ser cancelados pelo produtor. Co-produções ativas podem ser canceladas pelo próprio co-produtor. Após cancelamento, novas vendas não geram comissão para o co-produtor.'
      },
      {
        question: 'O que acontece quando a co-produção expira?',
        answer: 'Ao atingir a data de expiração definida no contrato, a co-produção é automaticamente encerrada e o co-produtor para de receber comissões das novas vendas.'
      },
      {
        question: 'Qual a comissão máxima para co-produtores?',
        answer: 'Você pode definir de 1% a 99% de comissão para co-produtores. A soma de todas as comissões de co-produtores não pode ultrapassar 100% da sua margem disponível.'
      }
    ]
  },
  {
    id: 'area-membros',
    title: 'Área de Membros',
    description: 'Configure e gerencie sua área de membros e cursos online.',
    faqs: [
      {
        question: 'O que é a área de membros?',
        answer: 'É um ambiente exclusivo onde seus clientes acessam o conteúdo adquirido, como cursos em vídeo, materiais complementares e certificados.'
      },
      {
        question: 'Como criar módulos e aulas?',
        answer: 'Na edição da área de membros, use o botão "Adicionar Módulo" para criar seções. Dentro de cada módulo, adicione aulas com vídeos, descrições e materiais complementares.'
      },
      {
        question: 'Como os alunos acessam o conteúdo?',
        answer: 'Após a compra, os alunos recebem um email com link de acesso. Eles fazem login com email e senha (ou código de verificação) para acessar o conteúdo.'
      },
      {
        question: 'Posso agendar liberação de aulas?',
        answer: 'Sim! Você pode configurar aulas para serem liberadas automaticamente em datas específicas, criando um cronograma de conteúdo para seus alunos.'
      },
      {
        question: 'Como emitir certificados?',
        answer: 'Configure um modelo de certificado na aba "Certificados" da área de membros. Os certificados são gerados automaticamente quando o aluno completa o curso.'
      },
      {
        question: 'Posso personalizar a aparência da área de membros?',
        answer: 'Sim! Você pode personalizar cores, logo, banner e textos para deixar a área de membros com a identidade visual da sua marca.'
      }
    ]
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos',
    description: 'Informações sobre métodos de pagamento, saques e taxas.',
    faqs: [
      {
        question: 'Quais métodos de pagamento estão disponíveis?',
        answer: 'Aceitamos cartão de crédito (Visa, Mastercard), Multicaixa Express, pagamento por referência bancária e transferência bancária.'
      },
      {
        question: 'Como solicitar um saque?',
        answer: 'Acesse "Financeiro" > "Saques" no seu painel. Informe o valor e os dados bancários. Saques são processados em até 3 dias úteis após aprovação.'
      },
      {
        question: 'Qual o valor mínimo para saque?',
        answer: 'O valor mínimo para saque é de 5.000 Kz. Certifique-se de ter saldo disponível (não retido) suficiente.'
      },
      {
        question: 'O que é saldo retido?',
        answer: 'O saldo retido é o valor de vendas recentes que ainda está em período de garantia (geralmente 7-14 dias). Após esse período, o valor é liberado automaticamente.'
      },
      {
        question: 'Como funciona o reembolso?',
        answer: 'Reembolsos podem ser solicitados dentro do prazo de garantia do produto. O valor é devolvido ao cliente e debitado do seu saldo disponível.'
      },
      {
        question: 'Quais são as taxas da plataforma?',
        answer: 'A Kambafy cobra 8,99% sobre cada venda realizada. Não há mensalidades ou taxas fixas - você paga apenas quando vende.'
      }
    ]
  },
  {
    id: 'afiliados',
    title: 'Afiliados',
    description: 'Programa de afiliados para divulgar e vender produtos.',
    faqs: [
      {
        question: 'O que é o programa de afiliados?',
        answer: 'O programa permite que outras pessoas divulguem seus produtos em troca de uma comissão por cada venda realizada através do link exclusivo delas.'
      },
      {
        question: 'Como ativar afiliação para meu produto?',
        answer: 'Na edição do produto, ative a opção "Permitir afiliados" e defina a porcentagem de comissão que será paga aos afiliados.'
      },
      {
        question: 'Como me afiliar a um produto?',
        answer: 'Acesse a página do produto e clique em "Quero ser afiliado". Após aprovação do produtor, você receberá seu link exclusivo de divulgação.'
      },
      {
        question: 'Como recebo minhas comissões de afiliado?',
        answer: 'As comissões são creditadas automaticamente no seu saldo após a confirmação da venda. Você pode sacar quando atingir o valor mínimo.'
      },
      {
        question: 'Posso ser afiliado e produtor ao mesmo tempo?',
        answer: 'Sim! Você pode ter seus próprios produtos e também se afiliar a produtos de outros produtores na plataforma.'
      }
    ]
  },
  {
    id: 'colaboradores',
    title: 'Colaboradores',
    description: 'Gerencie acessos e permissões da sua equipe.',
    faqs: [
      {
        question: 'O que são colaboradores?',
        answer: 'Colaboradores são pessoas que você autoriza a acessar e gerenciar sua conta, como assistentes, gestores ou membros da sua equipe.'
      },
      {
        question: 'Como adicionar um colaborador?',
        answer: 'Acesse "Configurações" > "Colaboradores" e clique em "Adicionar Colaborador". Insira o email da pessoa e defina as permissões de acesso.'
      },
      {
        question: 'Quais permissões posso conceder?',
        answer: 'Você pode conceder acesso completo (todas as funcionalidades) ou personalizar permissões específicas como: produtos, vendas, financeiro, alunos, etc.'
      },
      {
        question: 'Posso remover um colaborador?',
        answer: 'Sim! A qualquer momento você pode revogar o acesso de um colaborador. O acesso é removido imediatamente após a revogação.'
      },
      {
        question: 'Colaborador é diferente de co-produtor?',
        answer: 'Sim! Colaboradores têm acesso ao painel para ajudar na gestão. Co-produtores recebem comissão sobre vendas. São funcionalidades diferentes e complementares.'
      }
    ]
  }
];
