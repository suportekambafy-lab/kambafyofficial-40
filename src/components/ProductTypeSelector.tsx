
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ProductTypeSelectorProps {
  onClose: () => void;
  onSelectType: (type: string) => void;
}

export default function ProductTypeSelector({ onClose, onSelectType }: ProductTypeSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Escolha o Tipo de Produto</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o tipo de produto que deseja criar:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSelectType("E-book")}
              className="group relative overflow-hidden rounded-lg border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-lg">E-book</span>
                <span className="text-sm text-muted-foreground">Livro digital ou material de leitura</span>
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            
            <button
              onClick={() => onSelectType("Curso")}
              className="group relative overflow-hidden rounded-lg border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-lg">Curso</span>
                <span className="text-sm text-muted-foreground">Conteúdo educacional estruturado</span>
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            
            <button
              onClick={() => onSelectType("Assinatura")}
              className="group relative overflow-hidden rounded-lg border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-lg">Assinatura</span>
                <span className="text-sm text-muted-foreground">Pagamentos recorrentes mensais ou anuais</span>
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            
            <button
              onClick={() => onSelectType("Link de Pagamento")}
              className="group relative overflow-hidden rounded-lg border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-lg">Link de Pagamento</span>
                <span className="text-sm text-muted-foreground">Para serviços, consultorias e mentorias</span>
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
