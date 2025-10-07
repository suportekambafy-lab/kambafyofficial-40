import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatConversation, ChatMessage } from '@/types/chat';

export function useTawkCustomChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Carregar conversas do vendedor
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('seller_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data as ChatConversation[] || []);

      // Se não há conversa atual mas há conversas, selecionar a primeira
      if (!currentConversation && data && data.length > 0) {
        setCurrentConversation(data[0] as ChatConversation);
      }
    } catch (error) {
      console.error('[CHAT] Error loading conversations:', error);
    }
  }, [user, currentConversation]);

  // Carregar mensagens de uma conversa
  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as ChatMessage[] || []);
    } catch (error) {
      console.error('[CHAT] Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Criar nova conversa
  const createConversation = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          seller_id: user.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      
      const conversation = data as ChatConversation;
      setConversations(prev => [conversation, ...prev]);
      setCurrentConversation(conversation);
      return conversation;
    } catch (error) {
      console.error('[CHAT] Error creating conversation:', error);
      return null;
    }
  }, [user]);

  // Enviar mensagem
  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) return;

    let conversation = currentConversation;

    // Se não há conversa, criar uma nova
    if (!conversation) {
      conversation = await createConversation();
      if (!conversation) return;
    }

    setIsSending(true);
    try {
      // Salvar mensagem localmente primeiro
      const { data: newMessage, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'seller',
          sender_name: user.email?.split('@')[0] || 'Vendedor',
          message: message.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Adicionar mensagem ao estado local
      setMessages(prev => [...prev, newMessage as ChatMessage]);

      // Enviar via edge function para Tawk.to
      const { error: sendError } = await supabase.functions.invoke('send-tawk-message', {
        body: {
          conversationId: conversation.id,
          message: message.trim(),
        },
      });

      if (sendError) {
        console.error('[CHAT] Error sending to Tawk.to:', sendError);
      }
    } catch (error) {
      console.error('[CHAT] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [user, currentConversation, createConversation]);

  // Fechar conversa
  const closeConversation = useCallback(async () => {
    if (!currentConversation) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('id', currentConversation.id);

      if (error) throw error;
      
      setCurrentConversation(null);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error('[CHAT] Error closing conversation:', error);
    }
  }, [currentConversation, loadConversations]);

  // Carregar conversas ao montar
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Carregar mensagens quando conversa mudar
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation, loadMessages]);

  // Subscrever a mudanças em tempo real (mensagens novas do agente)
  useEffect(() => {
    if (!currentConversation) return;

    const channel = supabase
      .channel(`chat-${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Só adicionar se for do agente (mensagens do vendedor já foram adicionadas localmente)
          if (newMessage.sender_type === 'agent') {
            setMessages(prev => {
              // Evitar duplicatas
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation]);

  return {
    conversations,
    messages,
    currentConversation,
    isLoading,
    isSending,
    isTyping,
    sendMessage,
    closeConversation,
    createConversation,
    setCurrentConversation,
  };
}
