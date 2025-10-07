import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ChatMessage } from '@/types/chat';

interface CustomChatMessageProps {
  message: ChatMessage;
}

export function CustomChatMessage({ message }: CustomChatMessageProps) {
  const isAgent = message.sender_type === 'agent';
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      !isAgent && "flex-row-reverse"
    )}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={cn(
          "text-xs",
          isAgent ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}>
          {isAgent ? 'AG' : 'EU'}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col max-w-[70%]",
        !isAgent && "items-end"
      )}>
        <div className="text-xs text-muted-foreground mb-1">
          {message.sender_name}
        </div>
        
        <div className={cn(
          "rounded-2xl px-4 py-2",
          isAgent 
            ? "bg-muted text-foreground" 
            : "bg-primary text-primary-foreground"
        )}>
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
        </div>
      </div>
    </div>
  );
}
