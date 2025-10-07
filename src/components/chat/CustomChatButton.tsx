import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { CustomChatWindow } from './CustomChatWindow';
import { Badge } from '@/components/ui/badge';

export function CustomChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = 0; // TODO: Implementar contagem real

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
        aria-label="Abrir chat de suporte"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
            {unreadCount}
          </Badge>
        )}
      </button>

      <CustomChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
