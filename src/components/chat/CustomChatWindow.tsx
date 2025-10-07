import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomChatHeader } from './CustomChatHeader';
import { CustomChatMessage } from './CustomChatMessage';
import { CustomChatInput } from './CustomChatInput';
import { CustomChatTyping } from './CustomChatTyping';
import { useTawkCustomChat } from '@/hooks/useTawkCustomChat';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomChatWindow({ isOpen, onClose }: CustomChatWindowProps) {
  const {
    messages,
    currentConversation,
    isLoading,
    isSending,
    isTyping,
    sendMessage,
    closeConversation,
  } = useTawkCustomChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCloseConversation = async () => {
    await closeConversation();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <CustomChatHeader
          agentName={currentConversation?.agent_name || 'Suporte Kambafy'}
          isOnline={true}
          onClose={onClose}
          onCloseConversation={currentConversation ? handleCloseConversation : undefined}
        />
        
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-16 w-[70%] rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">Nenhuma mensagem ainda.</p>
                <p className="text-xs mt-2">Envie uma mensagem para iniciar a conversa.</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <CustomChatMessage key={message.id} message={message} />
                ))}
                {isTyping && <CustomChatTyping />}
              </>
            )}
          </ScrollArea>

          <CustomChatInput
            onSend={sendMessage}
            disabled={isSending}
            placeholder="Digite sua mensagem..."
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
