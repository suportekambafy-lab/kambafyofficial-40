
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, BookOpen, GraduationCap } from "lucide-react";

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
          
          <div className="grid gap-3">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:bg-primary/5"
              onClick={() => onSelectType("E-book")}
            >
              <BookOpen className="h-8 w-8" />
              <span className="font-medium">E-book</span>
              <span className="text-xs text-muted-foreground">Livro digital ou material de leitura</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2 hover:bg-primary/5"
              onClick={() => onSelectType("Curso")}
            >
              <GraduationCap className="h-8 w-8" />
              <span className="font-medium">Curso</span>
              <span className="text-xs text-muted-foreground">Conteúdo educacional estruturado</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
