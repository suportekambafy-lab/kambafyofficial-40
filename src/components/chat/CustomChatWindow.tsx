import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CustomChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomChatWindow({ isOpen, onClose }: CustomChatWindowProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Chat de Suporte</span>
            <button onClick={onClose} className="hover:opacity-70">
              <X className="h-5 w-5" />
            </button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100vh-80px)]">
          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground text-center">
              Funcionalidade em implementação...
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
