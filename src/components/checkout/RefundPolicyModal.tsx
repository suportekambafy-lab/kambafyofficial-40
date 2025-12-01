import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RefundPolicyModalProps {
  children: React.ReactNode;
}

export const RefundPolicyModal = ({ children }: RefundPolicyModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Política de Reembolso</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="text-lg font-semibold mb-3">1. Prazo de Garantia</h3>
              <p className="text-muted-foreground mb-2">
                A Kambafy oferece garantia de reembolso conforme a região:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>🇦🇴 Angola:</strong> 7 dias corridos a partir da data de compra</li>
                <li><strong>🇪🇺 Europa:</strong> 14 dias corridos a partir da data de compra</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Condições para Reembolso</h3>
              <p className="text-muted-foreground mb-2">
                Para solicitar reembolso, o cliente deve:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Solicitar o reembolso dentro do prazo de garantia estabelecido</li>
                <li>Informar o motivo da solicitação de forma clara</li>
                <li>Fornecer o número do pedido e email de compra</li>
                <li>Estar ciente de que o vendedor analisará cada caso individualmente</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Como Solicitar</h3>
              <p className="text-muted-foreground mb-2">
                Para solicitar o reembolso:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                <li>Acesse a seção "Minhas Compras" ou "Meus Acessos"</li>
                <li>Localize o pedido desejado</li>
                <li>Clique em "Solicitar Reembolso"</li>
                <li>Preencha o formulário com o motivo da solicitação</li>
                <li>Aguarde a análise do vendedor</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Análise e Processamento</h3>
              <p className="text-muted-foreground mb-2">
                Após receber a solicitação:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>O vendedor analisará o pedido em até 5 dias úteis</li>
                <li>Você receberá uma notificação sobre a decisão</li>
                <li>Se aprovado, o reembolso será processado em até 7 dias úteis</li>
                <li>O valor será devolvido através do mesmo método de pagamento utilizado na compra</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">5. Responsabilidades</h3>
              <p className="text-muted-foreground mb-2">
                É importante destacar que:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>A Kambafy atua como intermediadora entre vendedor e comprador</li>
                <li>As políticas específicas de cada produto são definidas pelo vendedor</li>
                <li>A decisão final sobre aprovação ou rejeição cabe ao vendedor</li>
                <li>A Kambafy garante que o prazo mínimo de garantia será respeitado</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Exceções</h3>
              <p className="text-muted-foreground mb-2">
                Não serão aceitas solicitações de reembolso em casos de:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Produtos consumidos ou utilizados integralmente</li>
                <li>Arrependimento após o prazo de garantia</li>
                <li>Motivos não relacionados ao produto ou serviço adquirido</li>
                <li>Violação dos termos de uso da plataforma</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Contato</h3>
              <p className="text-muted-foreground">
                Em caso de dúvidas sobre a política de reembolso, entre em contato com o suporte através dos canais disponibilizados pelo vendedor ou através do email: <a href="mailto:suporte@kambafy.com" className="text-primary underline">suporte@kambafy.com</a>
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
