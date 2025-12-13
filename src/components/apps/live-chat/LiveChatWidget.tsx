import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, X, Send, Loader2, MinusCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LiveChatWidgetProps {
  productId: string;
  customerName?: string;
  customerEmail?: string;
  greeting?: string;
}

export function LiveChatWidget({ 
  productId, 
  customerName = 'Cliente',
  customerEmail,
  greeting = 'Olá! 👋 Como posso ajudar você hoje?'
}: LiveChatWidgetProps) {
  console.log('[LiveChatWidget] Component mounted with productId:', productId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasCredits, setHasCredits] = useState<boolean | null>(null);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check credits before allowing any interaction
  useEffect(() => {
    const checkCredits = async () => {
      console.log('[LiveChatWidget] Checking credits for product:', productId);
      try {
        const { data, error } = await supabase.functions.invoke('chat-with-credits', {
          body: {
            action: 'check-credits',
            productId
          }
        });

        console.log('[LiveChatWidget] Credit check response:', { data, error });

        if (error) {
          console.error('[LiveChatWidget] Error checking credits:', error);
          setHasCredits(false);
          setChatEnabled(false);
          return;
        }

        setHasCredits(data.hasCredits);
        setChatEnabled(data.chatEnabled);
        console.log('[LiveChatWidget] Credits status:', { hasCredits: data.hasCredits, chatEnabled: data.chatEnabled });
      } catch (error) {
        console.error('[LiveChatWidget] Error checking credits:', error);
        setHasCredits(false);
        setChatEnabled(false);
      } finally {
        setCheckingCredits(false);
      }
    };

    if (productId) {
      checkCredits();
    } else {
      console.log('[LiveChatWidget] No productId provided');
      setCheckingCredits(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && hasCredits) {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, greeting, hasCredits]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !hasCredits) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-credits', {
        body: {
          message: userMessage.content,
          conversationId,
          productId,
          customerName,
          customerEmail
        }
      });

      if (error) throw error;

      // Handle no credits response
      if (data.noCredits || data.chatDisabled) {
        setHasCredits(false);
        if (data.reply) {
          setMessages(prev => [...prev, {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date()
          }]);
        }
        return;
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update credits status based on response
      if (data.noCredits === true) {
        setHasCredits(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't render anything if checking or chat is not available
  if (checkingCredits) {
    console.log('[LiveChatWidget] Still checking credits...');
    return null;
  }

  // Don't show widget if chat is disabled or no credits
  if (!chatEnabled || !hasCredits) {
    console.log('[LiveChatWidget] Not showing widget:', { chatEnabled, hasCredits });
    return null;
  }

  console.log('[LiveChatWidget] Rendering widget');

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60]"
          >
            <button
              className="rounded-full w-14 h-14 shadow-lg bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors"
              onClick={() => setIsOpen(true)}
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] w-[380px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Header */}
              <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Assistente
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              {!isMinimized && (
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px] p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t">
                    {hasCredits ? (
                      <div className="flex gap-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Digite sua mensagem..."
                          disabled={isLoading}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={sendMessage}
                          disabled={!input.trim() || isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <p>Chat temporariamente indisponível.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
