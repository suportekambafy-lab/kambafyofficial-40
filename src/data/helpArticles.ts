// Central de Ajuda - Artigos e Categorias

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  content: string;
  relatedArticles?: string[];
  updatedAt: string;
}

export interface HelpCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export const helpCategories: HelpCategory[] = [
  {
    id: "coproducao",
    slug: "coproducao",
    name: "Co-produção",
    description: "Como funciona, convites e comissões",
    icon: "Users"
  },
  {
    id: "area-membros",
    slug: "area-membros",
    name: "Área de Membros",
    description: "Configuração, aulas e certificados",
    icon: "GraduationCap"
  },
  {
    id: "pagamentos",
    slug: "pagamentos",
    name: "Pagamentos",
    description: "Métodos, saques e taxas",
    icon: "CreditCard"
  },
  {
    id: "afiliados",
    slug: "afiliados",
    name: "Afiliados",
    description: "Programa de afiliados e comissões",
    icon: "Link"
  },
  {
    id: "produtos",
    slug: "produtos",
    name: "Produtos",
    description: "Criação e gestão de produtos",
    icon: "Package"
  },
  {
    id: "vendas",
    slug: "vendas",
    name: "Vendas",
    description: "Acompanhamento e relatórios",
    icon: "TrendingUp"
  }
];

export const helpArticles: HelpArticle[] = [
  // ========== CO-PRODUÇÃO ==========
  {
    id: "como-funciona-coproducao",
    slug: "como-funciona-coproducao",
    title: "Como funciona a co-produção?",
    category: "Co-produção",
    categorySlug: "coproducao",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-convidar-coprodutor", "divisao-valores-coproducao", "cancelar-coproducao"],
    content: `
# Como configurar a co-produção

A co-produção é uma forma de parceria onde você pode dividir os ganhos de um produto com outra pessoa. Isso é útil quando:

- Você quer fazer parcerias com experts para criação de conteúdo
- Você fica responsável apenas pela produção e o co-produtor pela divulgação
- Você deseja dividir as tarefas e os ganhos de um produto

## Regras importantes

1. **Você** pode convidar um co-produtor para seus produtos, mas precisa:
   - Você deve ter um produto já cadastrado para enviar o convite
   - O co-produtor precisa aceitar o convite para a parceria ser ativada

2. **O co-produtor** pode:
   - Visualizar as vendas do produto
   - Receber sua comissão automaticamente a cada venda
   - Cancelar a co-produção quando desejar

3. **Importante**: Apenas o co-produtor pode cancelar uma co-produção ativa. O produtor principal pode apenas cancelar convites pendentes.

## Taxas

As taxas da plataforma são cobradas normalmente sobre o valor total da venda, e depois o valor líquido é dividido entre o produtor e o co-produtor de acordo com a porcentagem definida.
`
  },
  {
    id: "como-convidar-coprodutor",
    slug: "como-convidar-coprodutor",
    title: "Como convidar um co-produtor?",
    category: "Co-produção",
    categorySlug: "coproducao",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-coproducao", "divisao-valores-coproducao"],
    content: `
# Como convidar um co-produtor

Para convidar alguém para ser co-produtor de um produto:

## Passo a passo

1. Acesse a página de **Produtos**
2. Clique no produto que deseja adicionar um co-produtor
3. Vá até a aba **Co-Produção**
4. Clique em **Convidar co-produtor**
5. Preencha os dados:
   - **E-mail do co-produtor**: o e-mail cadastrado na plataforma
   - **Duração do contrato**: por quantos dias a co-produção ficará ativa
   - **Comissão (%)**: porcentagem que o co-produtor receberá de cada venda (1% a 99%)
6. Clique em **Enviar convite**

## O que acontece depois?

- O co-produtor receberá um e-mail com o convite
- Ele pode aceitar ou recusar o convite
- Se aceitar, a co-produção entra em vigor imediatamente
- O co-produtor passa a receber sua comissão automaticamente a cada venda

## Observações

- Você pode ter apenas 1 co-produtor ativo por produto
- O convite expira em 7 dias se não for aceito
- A comissão é calculada sobre o valor líquido (após taxas da plataforma)
`
  },
  {
    id: "divisao-valores-coproducao",
    slug: "divisao-valores-coproducao",
    title: "Como é feita a divisão dos valores?",
    category: "Co-produção",
    categorySlug: "coproducao",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-coproducao", "como-convidar-coprodutor"],
    content: `
# Como é feita a divisão dos valores?

A divisão de valores na co-produção é automática e acontece a cada venda.

## Exemplo prático

Imagine uma venda de **10.000 Kz** com uma comissão de co-produção de **30%**:

1. Valor da venda: **10.000 Kz**
2. Taxa da plataforma (8,99%): **899 Kz**
3. Valor líquido: **9.101 Kz**
4. Comissão do co-produtor (30%): **2.730 Kz**
5. Valor do produtor principal: **6.371 Kz**

## Quando o co-produtor recebe?

- O valor é creditado automaticamente no saldo do co-produtor
- Segue as mesmas regras de disponibilidade (7 dias após a venda)
- O co-produtor pode solicitar saque normalmente pela plataforma

## Reembolsos

Em caso de reembolso, o valor é descontado proporcionalmente:
- Se a comissão foi 30%, o co-produtor devolve 30% do valor reembolsado
- O produtor principal devolve os 70% restantes
`
  },
  {
    id: "cancelar-coproducao",
    slug: "cancelar-coproducao",
    title: "É possível cancelar uma co-produção?",
    category: "Co-produção",
    categorySlug: "coproducao",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-coproducao"],
    content: `
# É possível cancelar uma co-produção?

Sim, mas existem regras específicas dependendo do status da co-produção.

## Convites pendentes

Se o convite ainda não foi aceito:
- **O produtor** pode cancelar o convite a qualquer momento
- Basta acessar a aba Co-Produção do produto e clicar em "Cancelar convite"

## Co-produções ativas

Se a co-produção já foi aceita e está ativa:
- **Apenas o co-produtor** pode solicitar o cancelamento
- O produtor principal não pode cancelar unilateralmente
- Vendas realizadas até o cancelamento continuam gerando comissão normalmente

## Por que essa regra?

Essa regra existe para proteger o co-produtor, garantindo que ele receberá as comissões acordadas pelo período definido no contrato.

## Expiração automática

A co-produção também pode terminar automaticamente quando:
- O período definido no contrato expira (ex: 30, 60, 90 dias)
- Após a expiração, novas vendas não geram comissão para o co-produtor
`
  },
  {
    id: "acesso-coprodutor",
    slug: "acesso-coprodutor",
    title: "O co-produtor tem acesso ao produto e vendas?",
    category: "Co-produção",
    categorySlug: "coproducao",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-coproducao"],
    content: `
# O co-produtor tem acesso ao produto e vendas?

Sim, o co-produtor tem acesso limitado às informações do produto.

## O que o co-produtor pode ver?

- ✅ Histórico de vendas do produto
- ✅ Valores e comissões recebidas
- ✅ Relatórios de performance
- ✅ Informações básicas do produto

## O que o co-produtor NÃO pode fazer?

- ❌ Editar o produto (nome, preço, descrição)
- ❌ Processar reembolsos
- ❌ Alterar configurações do checkout
- ❌ Gerenciar a área de membros
- ❌ Convidar outros co-produtores

## Visualização de vendas

O co-produtor pode acessar suas vendas pela aba "Minhas co-produções" na página de Produtos, onde verá apenas os produtos em que é co-produtor ativo.
`
  },

  // ========== ÁREA DE MEMBROS ==========
  {
    id: "como-criar-area-membros",
    slug: "como-criar-area-membros",
    title: "Como criar uma área de membros?",
    category: "Área de Membros",
    categorySlug: "area-membros",
    updatedAt: "2025-01-18",
    relatedArticles: ["adicionar-aulas", "configurar-certificados"],
    content: `
# Como criar uma área de membros?

A área de membros é onde você hospeda seu conteúdo exclusivo para alunos.

## Passo a passo

1. Acesse **Área de Membros** no menu lateral
2. Clique em **Nova Área de Membros**
3. Preencha as informações:
   - Nome da área (ex: "Curso de Marketing Digital")
   - Descrição
   - Logo e cores da marca
4. Clique em **Criar**

## Personalizando a área

Depois de criar, você pode:
- Adicionar módulos e aulas
- Configurar a página de login
- Definir cores e logotipo
- Habilitar comentários nas aulas
- Configurar certificados de conclusão

## Vinculando a um produto

Para que alunos tenham acesso automático:
1. Crie um produto do tipo "Curso"
2. Na etapa de configuração, selecione a área de membros
3. Após a compra, o aluno recebe acesso automaticamente
`
  },
  {
    id: "adicionar-aulas",
    slug: "adicionar-aulas",
    title: "Como adicionar aulas e módulos?",
    category: "Área de Membros",
    categorySlug: "area-membros",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-criar-area-membros", "agendar-aulas"],
    content: `
# Como adicionar aulas e módulos?

Organize seu conteúdo em módulos e aulas para facilitar o aprendizado.

## Criando módulos

1. Acesse sua área de membros
2. Clique em **Novo Módulo**
3. Defina o nome e descrição
4. Arraste para reordenar se necessário

## Adicionando aulas

1. Dentro do módulo, clique em **Nova Aula**
2. Preencha:
   - Título da aula
   - Descrição
   - Vídeo (upload ou link do YouTube/Vimeo)
   - Materiais complementares (PDFs, links)
3. Clique em **Salvar**

## Upload de vídeos

Você pode:
- Fazer upload direto (até 2GB por vídeo)
- Usar links do YouTube (modo privado/não listado)
- Usar links do Vimeo
- Usar links do Bunny.net para maior proteção

## Reordenando conteúdo

Arraste e solte módulos e aulas para reorganizar a ordem de exibição.
`
  },
  {
    id: "agendar-aulas",
    slug: "agendar-aulas",
    title: "Como agendar liberação de aulas?",
    category: "Área de Membros",
    categorySlug: "area-membros",
    updatedAt: "2025-01-18",
    relatedArticles: ["adicionar-aulas"],
    content: `
# Como agendar liberação de aulas?

Você pode programar a liberação gradual de aulas para seus alunos.

## Configurando o agendamento

1. Ao criar ou editar uma aula
2. Ative a opção **Agendar liberação**
3. Selecione a data e hora de liberação
4. Salve a aula

## O que acontece?

- A aula fica com status "Agendada" até a data definida
- No horário programado, a aula é automaticamente liberada
- Os alunos podem receber notificação por e-mail (se configurado)

## Notificações de novas aulas

Ao publicar uma nova aula, você pode marcar a opção para enviar e-mail aos alunos cadastrados, informando sobre o novo conteúdo disponível.
`
  },
  {
    id: "configurar-certificados",
    slug: "configurar-certificados",
    title: "Como configurar certificados?",
    category: "Área de Membros",
    categorySlug: "area-membros",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-criar-area-membros"],
    content: `
# Como configurar certificados?

Ofereça certificados de conclusão para seus alunos.

## Ativando certificados

1. Acesse sua área de membros
2. Vá em **Certificados**
3. Clique em **Configurar Certificado**

## Personalizando o certificado

Você pode definir:
- Título do certificado
- Texto do corpo
- Assinatura (nome e cargo)
- Logo
- Cores e fontes
- Se mostra horas de curso
- Se mostra nota dos quizzes

## Quando o certificado é emitido?

O certificado é gerado automaticamente quando o aluno:
- Completa 100% das aulas
- (Opcional) Atinge a nota mínima nos quizzes

## Download do certificado

O aluno pode baixar o certificado em PDF diretamente na área de membros.
`
  },

  // ========== PAGAMENTOS ==========
  {
    id: "metodos-pagamento",
    slug: "metodos-pagamento",
    title: "Quais métodos de pagamento estão disponíveis?",
    category: "Pagamentos",
    categorySlug: "pagamentos",
    updatedAt: "2025-01-18",
    relatedArticles: ["taxas-plataforma", "quando-recebo-dinheiro"],
    content: `
# Quais métodos de pagamento estão disponíveis?

A plataforma oferece diversos métodos de pagamento para atender seus clientes.

## Angola (AOA)

- **Referência Multicaixa** - Pagamento via ATM ou app bancário
- **TPA/POS** - Pagamento com cartão de débito angolano
- **Pagamento por Referência** - Transferência bancária

## Internacional (USD/EUR)

- **Cartão de Crédito** - Visa, Mastercard, American Express
- **PayPal** - Para clientes internacionais

## Moçambique (MZN)

- **M-Pesa** - Pagamento via mobile money
- **E-Mola** - Pagamento via mobile money

## Configurando métodos

Ao criar um produto, você escolhe quais métodos aceitar. Recomendamos habilitar todos para maximizar conversões.
`
  },
  {
    id: "taxas-plataforma",
    slug: "taxas-plataforma",
    title: "Quais são as taxas da plataforma?",
    category: "Pagamentos",
    categorySlug: "pagamentos",
    updatedAt: "2025-01-18",
    relatedArticles: ["metodos-pagamento", "quando-recebo-dinheiro"],
    content: `
# Quais são as taxas da plataforma?

A Kambafy cobra apenas uma taxa por venda realizada. Sem mensalidades!

## Taxas por moeda

| Moeda | Taxa |
|-------|------|
| AOA (Kwanza) | 8,99% |
| USD (Dólar) | 9,99% |
| EUR (Euro) | 9,99% |
| MZN (Metical) | 9,99% |

## Como é calculado?

A taxa é deduzida automaticamente do valor da venda:

**Exemplo (venda de 10.000 Kz):**
- Valor da venda: 10.000 Kz
- Taxa (8,99%): 899 Kz
- Você recebe: 9.101 Kz

## Não há taxas de:

- ❌ Mensalidade
- ❌ Cadastro
- ❌ Publicação de produtos
- ❌ Manutenção de conta
`
  },
  {
    id: "quando-recebo-dinheiro",
    slug: "quando-recebo-dinheiro",
    title: "Quando recebo o dinheiro das vendas?",
    category: "Pagamentos",
    categorySlug: "pagamentos",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-solicitar-saque", "taxas-plataforma"],
    content: `
# Quando recebo o dinheiro das vendas?

O dinheiro das vendas fica disponível após um período de segurança.

## Prazo de liberação

- **7 dias** após a confirmação do pagamento

## Por que esse prazo?

O período serve para:
- Garantir que o pagamento foi efetivamente processado
- Permitir que o cliente solicite reembolso se necessário
- Proteger contra fraudes

## Acompanhando seu saldo

Na seção **Financeiro** você pode ver:
- Saldo disponível para saque
- Saldo em retenção (aguardando liberação)
- Histórico de transações

## Solicitar saque

Após o saldo ficar disponível, você pode solicitar saque a qualquer momento. O processamento leva até 2 dias úteis.
`
  },
  {
    id: "como-solicitar-saque",
    slug: "como-solicitar-saque",
    title: "Como solicitar um saque?",
    category: "Pagamentos",
    categorySlug: "pagamentos",
    updatedAt: "2025-01-18",
    relatedArticles: ["quando-recebo-dinheiro", "configurar-iban"],
    content: `
# Como solicitar um saque?

Para receber o dinheiro das suas vendas na sua conta bancária:

## Passo a passo

1. Acesse **Financeiro** no menu lateral
2. Verifique seu saldo disponível
3. Clique em **Solicitar Saque**
4. Informe o valor desejado
5. Confirme seus dados bancários
6. Clique em **Confirmar Saque**

## Requisitos

- Ter saldo disponível (após 7 dias da venda)
- Ter IBAN cadastrado corretamente
- Valor mínimo: 1.000 Kz

## Prazo de processamento

- Até **2 dias úteis** após a solicitação
- Você receberá notificação quando o saque for processado

## Histórico de saques

Acompanhe todos os saques na seção Financeiro > Histórico de Saques.
`
  },
  {
    id: "configurar-iban",
    slug: "configurar-iban",
    title: "Como configurar meu IBAN?",
    category: "Pagamentos",
    categorySlug: "pagamentos",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-solicitar-saque"],
    content: `
# Como configurar meu IBAN?

Configure seu IBAN para receber os pagamentos das suas vendas.

## Passo a passo

1. Acesse **Configurações** no menu
2. Vá na aba **Pagamentos**
3. Preencha seu IBAN **sem o código do país** (AO06)
4. Informe o nome do titular (deve coincidir com sua conta)
5. Salve as alterações

## Formato correto

- ✅ Correto: \`0006 0000 0000 0000 0000 0\`
- ❌ Errado: \`AO06 0006 0000 0000 0000 0000 0\`

## Dicas importantes

- O nome do titular deve ser **exatamente** igual ao da conta bancária
- Verifique se o IBAN está correto para evitar problemas no pagamento
- Em caso de erro, entre em contato com o suporte

## Bancos suportados

Aceitamos IBANs de todos os bancos angolanos com suporte a transferências IBAN.
`
  },

  // ========== AFILIADOS ==========
  {
    id: "como-funciona-afiliados",
    slug: "como-funciona-afiliados",
    title: "Como funciona o programa de afiliados?",
    category: "Afiliados",
    categorySlug: "afiliados",
    updatedAt: "2025-01-18",
    relatedArticles: ["configurar-afiliados-produto", "comissoes-afiliados"],
    content: `
# Como funciona o programa de afiliados?

O programa de afiliados permite que outras pessoas promovam seus produtos e ganhem comissão por cada venda.

## Para o produtor

1. Configure a comissão de afiliados no seu produto
2. Afiliados interessados solicitam participação
3. Você aprova ou rejeita as solicitações
4. Afiliados aprovados recebem um link exclusivo
5. Vendas feitas pelo link geram comissão automática

## Para o afiliado

1. Encontre produtos no marketplace
2. Solicite afiliação
3. Receba aprovação do produtor
4. Divulgue o link personalizado
5. Ganhe comissão por cada venda

## Benefícios

- **Produtores**: Mais vendas sem custo de marketing
- **Afiliados**: Renda extra promovendo produtos de terceiros
`
  },
  {
    id: "configurar-afiliados-produto",
    slug: "configurar-afiliados-produto",
    title: "Como configurar afiliados no meu produto?",
    category: "Afiliados",
    categorySlug: "afiliados",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-afiliados", "aprovar-afiliados"],
    content: `
# Como configurar afiliados no meu produto?

Habilite o programa de afiliados para aumentar suas vendas.

## Passo a passo

1. Acesse **Produtos** e selecione um produto
2. Vá na aba **Afiliados**
3. Ative a opção **Permitir afiliados**
4. Configure:
   - **Comissão (%)**: de 1% a 100% do valor líquido
   - **Aprovação**: automática ou manual
5. Salve as alterações

## Tipos de aprovação

- **Automática**: Qualquer pessoa pode se afiliar
- **Manual**: Você analisa e aprova cada solicitação

## Dicas

- Comissões mais altas atraem mais afiliados
- Forneça materiais de divulgação (imagens, textos)
- Acompanhe o desempenho dos afiliados
`
  },
  {
    id: "aprovar-afiliados",
    slug: "aprovar-afiliados",
    title: "Como aprovar solicitações de afiliados?",
    category: "Afiliados",
    categorySlug: "afiliados",
    updatedAt: "2025-01-18",
    relatedArticles: ["configurar-afiliados-produto"],
    content: `
# Como aprovar solicitações de afiliados?

Gerencie as solicitações de afiliação aos seus produtos.

## Acessando solicitações

1. Vá em **Meus Afiliados** no menu
2. Acesse a aba **Solicitações Pendentes**
3. Veja a lista de pessoas interessadas

## Analisando afiliados

Antes de aprovar, você pode ver:
- Nome e e-mail do afiliado
- Data da solicitação
- (Opcional) Mensagem de apresentação

## Aprovando ou rejeitando

- Clique em **Aprovar** para aceitar o afiliado
- Clique em **Rejeitar** para recusar
- Afiliados aprovados recebem notificação por e-mail

## Gerenciando afiliados ativos

Na aba **Afiliados Ativos** você pode:
- Ver vendas geradas por cada afiliado
- Remover afiliados se necessário
- Acompanhar comissões pagas
`
  },
  {
    id: "comissoes-afiliados",
    slug: "comissoes-afiliados",
    title: "Como funcionam as comissões de afiliados?",
    category: "Afiliados",
    categorySlug: "afiliados",
    updatedAt: "2025-01-18",
    relatedArticles: ["como-funciona-afiliados"],
    content: `
# Como funcionam as comissões de afiliados?

Entenda como as comissões são calculadas e pagas.

## Cálculo da comissão

A comissão do afiliado é calculada sobre o valor líquido (após taxas da plataforma).

**Exemplo (venda de 10.000 Kz, comissão de 30%):**
1. Valor da venda: 10.000 Kz
2. Taxa da plataforma (8,99%): 899 Kz
3. Valor líquido: 9.101 Kz
4. Comissão do afiliado (30%): 2.730 Kz
5. Produtor recebe: 6.371 Kz

## Quando o afiliado recebe?

- A comissão segue o mesmo prazo de liberação (7 dias)
- O afiliado pode solicitar saque normalmente
- Reembolsos descontam a comissão proporcionalmente

## Cookies de afiliado

- O cookie de afiliado dura **60 dias**
- Se o cliente comprar dentro desse período, o afiliado recebe a comissão
- O último clique prevalece (se houver múltiplos afiliados)
`
  }
];

// Função para buscar artigo por slug
export const getArticleBySlug = (slug: string): HelpArticle | undefined => {
  return helpArticles.find(article => article.slug === slug);
};

// Função para buscar artigos por categoria
export const getArticlesByCategory = (categorySlug: string): HelpArticle[] => {
  return helpArticles.filter(article => article.categorySlug === categorySlug);
};

// Função para buscar categoria por slug
export const getCategoryBySlug = (slug: string): HelpCategory | undefined => {
  return helpCategories.find(category => category.slug === slug);
};

// Função para buscar artigos relacionados
export const getRelatedArticles = (articleId: string): HelpArticle[] => {
  const article = helpArticles.find(a => a.id === articleId);
  if (!article?.relatedArticles) return [];
  return helpArticles.filter(a => article.relatedArticles?.includes(a.id));
};

// Função de busca
export const searchArticles = (query: string): HelpArticle[] => {
  const lowerQuery = query.toLowerCase();
  return helpArticles.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.content.toLowerCase().includes(lowerQuery)
  );
};
