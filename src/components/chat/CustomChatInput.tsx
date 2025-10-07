import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CustomChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CustomChatInput({ 
  onSend, 
  disabled = false,
  placeholder = "Digite sua mensagem..."
}: CustomChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex gap-2 items-end">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
}
