import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Clock, ShieldAlert } from "lucide-react";

interface SuspendedWithdrawalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendedWithdrawalInfoModal({ open, onOpenChange }: SuspendedWithdrawalInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <ShieldAlert className="h-5 w-5" />
            Saque Suspenso
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Atenção: O seu pedido de saque foi suspenso
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Por motivos de <strong className="text-foreground">segurança</strong>, o seu saque foi temporariamente suspenso.
            </p>
            
            <p>
              Durante a nossa análise, não conseguimos confirmar como está a ser feita a <strong className="text-foreground">entrega dos produtos</strong> aos seus clientes.
            </p>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
              <p>
                Tem <strong className="text-foreground">7 dias</strong> para entrar em contacto connosco e apresentar comprovativo de entrega dos produtos.
              </p>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="font-medium text-foreground">Se não entrar em contacto:</p>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>O valor do saque será <strong className="text-foreground">devolvido aos clientes</strong></li>
                <li>A sua conta poderá ser <strong className="text-red-600 dark:text-red-400">permanentemente banida</strong></li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border">
            <Mail className="h-4 w-4 text-primary shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">Contacte-nos: </span>
              <a 
                href="mailto:suporte@kambafy.com" 
                className="font-medium text-primary hover:underline"
              >
                suporte@kambafy.com
              </a>
            </div>
          </div>

          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full"
          >
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
