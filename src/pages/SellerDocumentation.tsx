import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Package, 
  CreditCard, 
  Users, 
  Settings,
  Shield,
  TrendingUp,
  FileText
} from "lucide-react";

export default function SellerDocumentation() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Documentação</h1>
        <p className="text-lg text-muted-foreground">
          Guias completos para usar a plataforma Kambafy
        </p>
      </div>

      <Tabs defaultValue="primeiros-passos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="primeiros-passos">Primeiros Passos</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="avancado">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="primeiros-passos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Começando na Kambafy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    1. Configure seu perfil
                  </h3>
                  <p className="text-muted-foreground">
                    Comece completando suas informações pessoais e de pagamento na seção de configurações. 
                    Adicione seu IBAN para receber pagamentos (sem o código do país AO06).
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    2. Crie seu primeiro produto
                  </h3>
                  <p className="text-muted-foreground">
                    Vá para a seção "Produtos" e clique em "Novo Produto". Escolha entre produto digital, 
                    físico, serviço ou área de membros. Preencha as informações básicas como nome, descrição e preço.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    3. Configure o checkout
                  </h3>
                  <p className="text-muted-foreground">
                    Personalize sua página de checkout com cores, textos e elementos visuais que representam 
                    sua marca. Adicione provas sociais para aumentar a confiança dos compradores.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    4. Publique e compartilhe
                  </h3>
                  <p className="text-muted-foreground">
                    Depois de configurar tudo, publique seu produto e comece a compartilhar o link em suas 
                    redes sociais, site ou com seus afiliados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Gerenciando Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="tipos" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Tipos de Produtos
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-3">
                    <div>
                      <Badge className="mb-2">Digital</Badge>
                      <p>E-books, cursos, vídeos, áudios e outros arquivos digitais. Entrega automática após o pagamento.</p>
                    </div>
                    <div>
                      <Badge className="mb-2">Físico</Badge>
                      <p>Produtos que precisam de envio físico. Você gerencia o envio após receber o pedido.</p>
                    </div>
                    <div>
                      <Badge className="mb-2">Serviço</Badge>
                      <p>Consultorias, mentorias ou qualquer serviço prestado. Coordene a entrega diretamente com o cliente.</p>
                    </div>
                    <div>
                      <Badge className="mb-2">Área de Membros</Badge>
                      <p>Crie uma área exclusiva com conteúdo protegido por assinatura ou pagamento único.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="precos" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Configuração de Preços
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Você pode configurar diferentes modelos de precificação:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Pagamento único</li>
                      <li>Parcelamento (até 12x)</li>
                      <li>Assinatura recorrente (mensal/anual)</li>
                      <li>Preço dinâmico (cliente escolhe o valor)</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="protecao" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Proteção de Conteúdo Digital
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Seus produtos digitais são protegidos automaticamente com:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Criptografia de arquivos</li>
                      <li>Controle de acesso por usuário</li>
                      <li>Marca d'água em vídeos</li>
                      <li>Monitoramento de downloads suspeitos</li>
                      <li>Links temporários de download</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vendas e Comissões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="comissoes" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Sistema de Comissões
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>A Kambafy cobra apenas <strong>8% por venda realizada</strong>. Não há mensalidades ou taxas fixas.</p>
                    <p>A comissão é deduzida automaticamente e o restante fica disponível em seu saldo.</p>
                    <p className="text-sm italic">Exemplo: Venda de 10.000 AOA = 800 AOA de comissão + 9.200 AOA para você</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recebimentos" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Como Receber Pagamentos
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>O dinheiro das vendas fica disponível após <strong>7 dias</strong> da data da venda.</p>
                    <p>Para solicitar um saque:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Vá na seção "Financeiro"</li>
                      <li>Clique em "Solicitar Saque"</li>
                      <li>Informe o valor desejado</li>
                      <li>Confirme seu IBAN</li>
                    </ol>
                    <p className="text-sm">Prazo de processamento: até 2 dias úteis</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="afiliados" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Programa de Afiliados
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Aumente suas vendas convidando outras pessoas para promover seus produtos.</p>
                    <p>Como funciona:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Configure a porcentagem de comissão (ex: 30%)</li>
                      <li>Gere e compartilhe seu link de afiliado</li>
                      <li>Afiliados promovem seu produto</li>
                      <li>Eles recebem comissão por cada venda gerada</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avancado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Recursos Avançados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="checkout" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Personalização de Checkout
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Customize sua página de checkout para aumentar conversões:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cores e logotipo da sua marca</li>
                      <li>Textos e copywriting personalizados</li>
                      <li>Provas sociais (avaliações, número de vendas)</li>
                      <li>Urgência e escassez (ofertas limitadas)</li>
                      <li>Upsells e ofertas adicionais</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="integracao" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Integrações e Webhooks
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Conecte a Kambafy com outras ferramentas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Configure webhooks para notificações de vendas</li>
                      <li>Integre com ferramentas de email marketing</li>
                      <li>Conecte com plataformas de gestão</li>
                      <li>Exporte dados para análise externa</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="seguranca" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Segurança e Privacidade
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Suas informações e de seus clientes estão protegidas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Criptografia SSL em todas as transações</li>
                      <li>Conformidade com LGPD/GDPR</li>
                      <li>Backup automático de dados</li>
                      <li>Autenticação de dois fatores</li>
                      <li>Monitoramento 24/7 de segurança</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="analytics" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-left hover:no-underline">
                    Análise e Relatórios
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 space-y-2">
                    <p>Acompanhe o desempenho dos seus produtos:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Dashboard com métricas em tempo real</li>
                      <li>Taxa de conversão por produto</li>
                      <li>Origem das vendas (tráfego, afiliados)</li>
                      <li>Relatórios personalizados e exportáveis</li>
                      <li>Análise de abandono de carrinho</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Precisa de Ajuda?</h3>
              <p className="text-muted-foreground">
                Nossa equipe de suporte está disponível de segunda a sexta, das 8h às 18h. 
                Use o chat ao vivo para tirar dúvidas ou entre em contato por email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
