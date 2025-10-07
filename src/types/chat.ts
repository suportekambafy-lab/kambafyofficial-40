export interface ChatConversation {
  id: string;
  seller_id: string;
  tawk_conversation_id: string | null;
  agent_name: string | null;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'seller' | 'agent' | 'system';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface SendMessagePayload {
  conversationId: string;
  message: string;
}
