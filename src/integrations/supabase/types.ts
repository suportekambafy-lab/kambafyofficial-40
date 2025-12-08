export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      abandoned_purchases: {
        Row: {
          abandoned_at: string
          amount: number
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          ip_address: string | null
          last_recovery_attempt_at: string | null
          product_id: string
          recovered_at: string | null
          recovered_order_id: string | null
          recovery_attempts_count: number
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          abandoned_at?: string
          amount: number
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          ip_address?: string | null
          last_recovery_attempt_at?: string | null
          product_id: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovery_attempts_count?: number
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          abandoned_at?: string
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          ip_address?: string | null
          last_recovery_attempt_at?: string | null
          product_id?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovery_attempts_count?: number
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_logs: {
        Row: {
          action: string
          admin_email: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          jwt_used: boolean | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          jwt_used?: boolean | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          jwt_used?: boolean | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_impersonation_sessions: {
        Row: {
          actions_performed: Json | null
          admin_email: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          read_only_mode: boolean
          started_at: string
          target_user_email: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          actions_performed?: Json | null
          admin_email: string
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          read_only_mode?: boolean
          started_at?: string
          target_user_email: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          actions_performed?: Json | null
          admin_email?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          read_only_mode?: boolean
          started_at?: string
          target_user_email?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          data: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          admin_id: string
          granted_at: string
          granted_by: string | null
          id: string
          permission: string
        }
        Insert: {
          admin_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission: string
        }
        Update: {
          admin_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          affiliate_code: string | null
          affiliate_email: string
          affiliate_name: string
          affiliate_user_id: string
          approved_at: string | null
          commission_rate: string
          created_at: string
          id: string
          product_id: string
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_email: string
          affiliate_name: string
          affiliate_user_id: string
          approved_at?: string | null
          commission_rate?: string
          created_at?: string
          id?: string
          product_id: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string | null
          affiliate_email?: string
          affiliate_name?: string
          affiliate_user_id?: string
          approved_at?: string | null
          commission_rate?: string
          created_at?: string
          id?: string
          product_id?: string
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          partner_id: string | null
          request_size: number | null
          response_size: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          partner_id?: string | null
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          partner_id?: string | null
          request_size?: number | null
          response_size?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      app_announcement_progress: {
        Row: {
          announcement_type: string
          completed_at: string | null
          failed: number
          id: string
          sent: number
          started_at: string
          status: string
          total_users: number
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          completed_at?: string | null
          failed?: number
          id?: string
          sent?: number
          started_at?: string
          status?: string
          total_users?: number
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          completed_at?: string | null
          failed?: number
          id?: string
          sent?: number
          started_at?: string
          status?: string
          total_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_announcement_sent: {
        Row: {
          announcement_type: string
          created_at: string
          email: string
          id: string
          sent_at: string
        }
        Insert: {
          announcement_type?: string
          created_at?: string
          email: string
          id?: string
          sent_at?: string
        }
        Update: {
          announcement_type?: string
          created_at?: string
          email?: string
          id?: string
          sent_at?: string
        }
        Relationships: []
      }
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_impersonation: boolean | null
          currency: string
          description: string
          email: string | null
          id: string
          impersonation_session_id: string | null
          order_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_impersonation?: boolean | null
          currency?: string
          description: string
          email?: string | null
          id?: string
          impersonation_session_id?: string | null
          order_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_impersonation?: boolean | null
          currency?: string
          description?: string
          email?: string | null
          id?: string
          impersonation_session_id?: string | null
          order_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_impersonation_session_id_fkey"
            columns: ["impersonation_session_id"]
            isOneToOne: false
            referencedRelation: "admin_impersonation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          agent_name: string | null
          created_at: string
          id: string
          seller_id: string
          status: string
          tawk_conversation_id: string | null
          updated_at: string
        }
        Insert: {
          agent_name?: string | null
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          tawk_conversation_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_name?: string | null
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          tawk_conversation_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          sender_name: string
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_customizations: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          settings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          settings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_customizations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          product_id: string | null
          region: string | null
          session_id: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          product_id?: string | null
          region?: string | null
          session_id: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          product_id?: string | null
          region?: string | null
          session_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          likes_count: number | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          attachments: Json | null
          category: Database["public"]["Enums"]["community_category"]
          comments_count: number | null
          content: string
          created_at: string
          id: string
          likes_count: number | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          attachments?: Json | null
          category?: Database["public"]["Enums"]["community_category"]
          comments_count?: number | null
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          attachments?: Json | null
          category?: Database["public"]["Enums"]["community_category"]
          comments_count?: number | null
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      customer_access: {
        Row: {
          access_expires_at: string | null
          access_granted_at: string
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          is_active: boolean
          order_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          access_granted_at?: string
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          is_active?: boolean
          order_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          access_granted_at?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          is_active?: boolean
          order_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_balances: {
        Row: {
          balance: number
          created_at: string
          currency: string
          email: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          customer_email: string
          customer_name: string | null
          grace_period_end: string | null
          id: string
          last_renewal_reminder: string | null
          metadata: Json | null
          payment_method: string | null
          product_id: string
          reactivation_count: number | null
          renewal_type: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          suspension_date: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          customer_email: string
          customer_name?: string | null
          grace_period_end?: string | null
          id?: string
          last_renewal_reminder?: string | null
          metadata?: Json | null
          payment_method?: string | null
          product_id: string
          reactivation_count?: number | null
          renewal_type?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          suspension_date?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          customer_email?: string
          customer_name?: string | null
          grace_period_end?: string | null
          id?: string
          last_renewal_reminder?: string | null
          metadata?: Json | null
          payment_method?: string | null
          product_id?: string
          reactivation_count?: number | null
          renewal_type?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          suspension_date?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      external_payments: {
        Row: {
          amount: number
          appypay_transaction_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          partner_id: string
          payment_method: string
          reference_entity: string | null
          reference_number: string | null
          status: string
          updated_at: string | null
          webhook_attempts: number | null
          webhook_last_error: string | null
          webhook_sent: boolean | null
          webhook_sent_at: string | null
        }
        Insert: {
          amount: number
          appypay_transaction_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          partner_id: string
          payment_method: string
          reference_entity?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_last_error?: string | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Update: {
          amount?: number
          appypay_transaction_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          partner_id?: string
          payment_method?: string
          reference_entity?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string | null
          webhook_attempts?: number | null
          webhook_last_error?: string | null
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_api_settings: {
        Row: {
          access_token: string
          app_id: string
          app_secret: string
          created_at: string | null
          enabled: boolean | null
          id: string
          product_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          app_id: string
          app_secret: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          product_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          app_id?: string
          app_secret?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          product_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_api_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_events_log: {
        Row: {
          created_at: string | null
          event_id: string
          event_name: string
          id: string
          payload: Json | null
          product_id: string
          response: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_name: string
          id?: string
          payload?: Json | null
          product_id: string
          response?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_name?: string
          id?: string
          payload?: Json | null
          product_id?: string
          response?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facebook_pixel_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          pixel_id: string
          product_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          pixel_id: string
          product_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          pixel_id?: string
          product_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_pixel_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verification: {
        Row: {
          birth_date: string
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          document_number: string
          document_type: string
          full_name: string
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number: string
          document_type: string
          full_name: string
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          document_number?: string
          document_type?: string
          full_name?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      kambapay_registrations: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          lesson_id: string
          parent_comment_id: string | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          lesson_id: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          lesson_id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_watched_at: string
          lesson_id: string
          member_area_id: string
          progress_percentage: number
          rating: number | null
          updated_at: string
          user_email: string | null
          user_id: string | null
          video_current_time: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id: string
          member_area_id: string
          progress_percentage?: number
          rating?: number | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          video_current_time?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_watched_at?: string
          lesson_id?: string
          member_area_id?: string
          progress_percentage?: number
          rating?: number | null
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          video_current_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          bunny_embed_url: string | null
          bunny_video_id: string | null
          complementary_links: Json | null
          created_at: string
          description: string | null
          duration: number
          hls_url: string | null
          id: string
          is_scheduled: boolean | null
          lesson_materials: Json | null
          member_area_id: string | null
          module_id: string | null
          order_number: number
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          video_data: Json | null
          video_url: string | null
        }
        Insert: {
          bunny_embed_url?: string | null
          bunny_video_id?: string | null
          complementary_links?: Json | null
          created_at?: string
          description?: string | null
          duration?: number
          hls_url?: string | null
          id?: string
          is_scheduled?: boolean | null
          lesson_materials?: Json | null
          member_area_id?: string | null
          module_id?: string | null
          order_number?: number
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          video_data?: Json | null
          video_url?: string | null
        }
        Update: {
          bunny_embed_url?: string | null
          bunny_video_id?: string | null
          complementary_links?: Json | null
          created_at?: string
          description?: string | null
          duration?: number
          hls_url?: string | null
          id?: string
          is_scheduled?: boolean | null
          lesson_materials?: Json | null
          member_area_id?: string | null
          module_id?: string | null
          order_number?: number
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          video_data?: Json | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      member_area_cohorts: {
        Row: {
          created_at: string
          currency: string | null
          current_students: number | null
          description: string | null
          end_date: string | null
          id: string
          max_students: number | null
          member_area_id: string
          name: string
          price: string | null
          product_id: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          current_students?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          max_students?: number | null
          member_area_id: string
          name: string
          price?: string | null
          product_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          current_students?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          max_students?: number | null
          member_area_id?: string
          name?: string
          price?: string | null
          product_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_area_cohorts_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_area_cohorts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_area_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          member_area_id: string
          message: string
          read: boolean | null
          student_email: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          member_area_id: string
          message: string
          read?: boolean | null
          student_email: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          member_area_id?: string
          message?: string
          read?: boolean | null
          student_email?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_area_notifications_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      member_area_offers: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          enabled: boolean
          id: string
          image_url: string | null
          member_area_id: string
          order_number: number
          price: string
          product_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          member_area_id: string
          order_number?: number
          price: string
          product_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          enabled?: boolean
          id?: string
          image_url?: string | null
          member_area_id?: string
          order_number?: number
          price?: string
          product_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_area_offers_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_area_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_area_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          member_area_id: string
          session_token: string
          student_email: string
          student_name: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          member_area_id: string
          session_token: string
          student_email: string
          student_name: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          member_area_id?: string
          session_token?: string
          student_email?: string
          student_name?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_area_sessions_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      member_area_students: {
        Row: {
          access_granted_at: string
          cohort_id: string | null
          created_at: string
          id: string
          member_area_id: string
          student_email: string
          student_name: string
          updated_at: string | null
        }
        Insert: {
          access_granted_at?: string
          cohort_id?: string | null
          created_at?: string
          id?: string
          member_area_id: string
          student_email: string
          student_name: string
          updated_at?: string | null
        }
        Update: {
          access_granted_at?: string
          cohort_id?: string | null
          created_at?: string
          id?: string
          member_area_id?: string
          student_email?: string
          student_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_area_students_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "member_area_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_area_students_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      member_areas: {
        Row: {
          accent_color: string | null
          background_style: string | null
          comments_enabled: boolean
          created_at: string
          custom_button_enabled: boolean | null
          custom_button_text: string | null
          custom_button_url: string | null
          description: string | null
          hero_description: string | null
          hero_image_url: string | null
          hero_title: string | null
          hero_video_url: string | null
          id: string
          login_logo_url: string | null
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          background_style?: string | null
          comments_enabled?: boolean
          created_at?: string
          custom_button_enabled?: boolean | null
          custom_button_text?: string | null
          custom_button_url?: string | null
          description?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          id?: string
          login_logo_url?: string | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          background_style?: string | null
          comments_enabled?: boolean
          created_at?: string
          custom_button_enabled?: boolean | null
          custom_button_text?: string | null
          custom_button_url?: string | null
          description?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          id?: string
          login_logo_url?: string | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      module_payments: {
        Row: {
          amount: number
          cohort_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          due_date: string | null
          entity: string | null
          id: string
          member_area_id: string
          module_id: string
          order_id: string
          payment_data: Json | null
          payment_method: string
          payment_proof_url: string | null
          reference_number: string | null
          status: string
          student_email: string
          student_name: string
          updated_at: string
        }
        Insert: {
          amount: number
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          entity?: string | null
          id?: string
          member_area_id: string
          module_id: string
          order_id: string
          payment_data?: Json | null
          payment_method: string
          payment_proof_url?: string | null
          reference_number?: string | null
          status?: string
          student_email: string
          student_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cohort_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          entity?: string | null
          id?: string
          member_area_id?: string
          module_id?: string
          order_id?: string
          payment_data?: Json | null
          payment_method?: string
          payment_proof_url?: string | null
          reference_number?: string | null
          status?: string
          student_email?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_payments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "member_area_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_payments_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_payments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_student_access: {
        Row: {
          cohort_id: string | null
          created_at: string
          granted_at: string
          id: string
          member_area_id: string
          module_id: string
          payment_id: string | null
          student_email: string
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          granted_at?: string
          id?: string
          member_area_id: string
          module_id: string
          payment_id?: string | null
          student_email: string
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          granted_at?: string
          id?: string
          member_area_id?: string
          module_id?: string
          payment_id?: string | null
          student_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_module_student_access_payment"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "module_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_student_access_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "member_area_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_student_access_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_student_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_student_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "module_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          cohort_ids: string[] | null
          coming_soon: boolean | null
          coming_soon_cohort_ids: string[] | null
          cover_image_url: string | null
          cover_orientation: string | null
          created_at: string
          description: string | null
          id: string
          is_paid: boolean | null
          member_area_id: string | null
          order_number: number
          paid_cohort_ids: string[] | null
          paid_price: string | null
          paid_product_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_ids?: string[] | null
          coming_soon?: boolean | null
          coming_soon_cohort_ids?: string[] | null
          cover_image_url?: string | null
          cover_orientation?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          member_area_id?: string | null
          order_number?: number
          paid_cohort_ids?: string[] | null
          paid_price?: string | null
          paid_product_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_ids?: string[] | null
          coming_soon?: boolean | null
          coming_soon_cohort_ids?: string[] | null
          cover_image_url?: string | null
          cover_orientation?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_paid?: boolean | null
          member_area_id?: string | null
          order_number?: number
          paid_cohort_ids?: string[] | null
          paid_price?: string | null
          paid_product_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_paid_product_id_fkey"
            columns: ["paid_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      onesignal_sync_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          player_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          player_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          player_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_bump_items: {
        Row: {
          bump_product_id: string | null
          bump_product_image: string | null
          bump_product_name: string
          bump_product_price: string
          created_at: string
          discount: number | null
          id: string
          order_bump_id: string
          order_position: number | null
          updated_at: string
        }
        Insert: {
          bump_product_id?: string | null
          bump_product_image?: string | null
          bump_product_name: string
          bump_product_price: string
          created_at?: string
          discount?: number | null
          id?: string
          order_bump_id: string
          order_position?: number | null
          updated_at?: string
        }
        Update: {
          bump_product_id?: string | null
          bump_product_image?: string | null
          bump_product_name?: string
          bump_product_price?: string
          created_at?: string
          discount?: number | null
          id?: string
          order_bump_id?: string
          order_position?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bump_items_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bump_items_order_bump_id_fkey"
            columns: ["order_bump_id"]
            isOneToOne: false
            referencedRelation: "order_bump_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      order_bump_settings: {
        Row: {
          access_extension_description: string | null
          access_extension_type: string | null
          access_extension_value: number | null
          bump_category: string | null
          bump_order: number | null
          bump_product_id: string | null
          bump_product_image: string | null
          bump_product_name: string | null
          bump_product_price: string | null
          bump_type: string | null
          created_at: string
          description: string
          discount: number
          enabled: boolean
          id: string
          position: string
          product_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_extension_description?: string | null
          access_extension_type?: string | null
          access_extension_value?: number | null
          bump_category?: string | null
          bump_order?: number | null
          bump_product_id?: string | null
          bump_product_image?: string | null
          bump_product_name?: string | null
          bump_product_price?: string | null
          bump_type?: string | null
          created_at?: string
          description?: string
          discount?: number
          enabled?: boolean
          id?: string
          position?: string
          product_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_extension_description?: string | null
          access_extension_type?: string | null
          access_extension_value?: number | null
          bump_category?: string | null
          bump_order?: number | null
          bump_product_id?: string | null
          bump_product_image?: string | null
          bump_product_name?: string | null
          bump_product_price?: string | null
          bump_type?: string | null
          created_at?: string
          description?: string
          discount?: number
          enabled?: boolean
          id?: string
          position?: string
          product_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_bump_settings_bump_product_id_fkey"
            columns: ["bump_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_bump_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_code: string | null
          affiliate_commission: number | null
          amount: string
          appypay_transaction_id: string | null
          cancellation_reason: string | null
          cohort_id: string | null
          created_at: string
          created_by_impersonation: boolean | null
          currency: string | null
          customer_country: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          has_active_refund: boolean | null
          id: string
          impersonation_session_id: string | null
          order_bump_data: Json | null
          order_id: string
          payment_method: string | null
          payment_proof_data: Json | null
          payment_proof_hash: string | null
          product_id: string
          refund_deadline: string | null
          seller_commission: number | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          amount: string
          appypay_transaction_id?: string | null
          cancellation_reason?: string | null
          cohort_id?: string | null
          created_at?: string
          created_by_impersonation?: boolean | null
          currency?: string | null
          customer_country?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          has_active_refund?: boolean | null
          id?: string
          impersonation_session_id?: string | null
          order_bump_data?: Json | null
          order_id: string
          payment_method?: string | null
          payment_proof_data?: Json | null
          payment_proof_hash?: string | null
          product_id: string
          refund_deadline?: string | null
          seller_commission?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_commission?: number | null
          amount?: string
          appypay_transaction_id?: string | null
          cancellation_reason?: string | null
          cohort_id?: string | null
          created_at?: string
          created_by_impersonation?: boolean | null
          currency?: string | null
          customer_country?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          has_active_refund?: boolean | null
          id?: string
          impersonation_session_id?: string | null
          order_bump_data?: Json | null
          order_id?: string
          payment_method?: string | null
          payment_proof_data?: Json | null
          payment_proof_hash?: string | null
          product_id?: string
          refund_deadline?: string | null
          seller_commission?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "member_area_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_impersonation_session_id_fkey"
            columns: ["impersonation_session_id"]
            isOneToOne: false
            referencedRelation: "admin_impersonation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_transactions: {
        Row: {
          amount: number
          commission_amount: number | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          order_id: string
          partner_id: string | null
          processed_at: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          commission_amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id: string
          partner_id?: string | null
          processed_at?: string | null
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          commission_amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          partner_id?: string | null
          processed_at?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          api_key: string | null
          approved_at: string | null
          approved_by: string | null
          commission_rate: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          current_month_transactions: number | null
          id: string
          monthly_transaction_limit: number | null
          phone: string | null
          status: string
          total_revenue: number | null
          total_transactions: number | null
          updated_at: string
          webhook_events: string[] | null
          webhook_secret: string | null
          webhook_url: string | null
          website: string | null
        }
        Insert: {
          api_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          current_month_transactions?: number | null
          id?: string
          monthly_transaction_limit?: number | null
          phone?: string | null
          status?: string
          total_revenue?: number | null
          total_transactions?: number | null
          updated_at?: string
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Update: {
          api_key?: string | null
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          current_month_transactions?: number | null
          id?: string
          monthly_transaction_limit?: number | null
          phone?: string | null
          status?: string
          total_revenue?: number | null
          total_transactions?: number | null
          updated_at?: string
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payment_releases: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          order_id: string
          processed_at: string | null
          release_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          release_date: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          release_date?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          access_duration_description: string | null
          access_duration_type: string | null
          access_duration_value: number | null
          admin_approved: boolean | null
          allow_affiliates: boolean | null
          allow_custom_price: boolean | null
          ban_reason: string | null
          category: string | null
          commission: string | null
          compare_at_price: string | null
          cover: string | null
          created_at: string
          created_by_impersonation: boolean | null
          custom_prices: Json | null
          description: string | null
          fantasy_name: string | null
          id: string
          image_alt: string | null
          impersonation_session_id: string | null
          member_area_id: string | null
          minimum_price: number | null
          name: string
          payment_methods: Json | null
          price: string
          revision_documents: Json | null
          revision_explanation: string | null
          revision_requested: boolean | null
          revision_requested_at: string | null
          sales: number | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          share_link: string | null
          slug: string | null
          status: string | null
          subscription_config: Json | null
          suggested_price: number | null
          support_email: string | null
          support_whatsapp: string | null
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_duration_description?: string | null
          access_duration_type?: string | null
          access_duration_value?: number | null
          admin_approved?: boolean | null
          allow_affiliates?: boolean | null
          allow_custom_price?: boolean | null
          ban_reason?: string | null
          category?: string | null
          commission?: string | null
          compare_at_price?: string | null
          cover?: string | null
          created_at?: string
          created_by_impersonation?: boolean | null
          custom_prices?: Json | null
          description?: string | null
          fantasy_name?: string | null
          id?: string
          image_alt?: string | null
          impersonation_session_id?: string | null
          member_area_id?: string | null
          minimum_price?: number | null
          name: string
          payment_methods?: Json | null
          price: string
          revision_documents?: Json | null
          revision_explanation?: string | null
          revision_requested?: boolean | null
          revision_requested_at?: string | null
          sales?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_link?: string | null
          slug?: string | null
          status?: string | null
          subscription_config?: Json | null
          suggested_price?: number | null
          support_email?: string | null
          support_whatsapp?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_duration_description?: string | null
          access_duration_type?: string | null
          access_duration_value?: number | null
          admin_approved?: boolean | null
          allow_affiliates?: boolean | null
          allow_custom_price?: boolean | null
          ban_reason?: string | null
          category?: string | null
          commission?: string | null
          compare_at_price?: string | null
          cover?: string | null
          created_at?: string
          created_by_impersonation?: boolean | null
          custom_prices?: Json | null
          description?: string | null
          fantasy_name?: string | null
          id?: string
          image_alt?: string | null
          impersonation_session_id?: string | null
          member_area_id?: string | null
          minimum_price?: number | null
          name?: string
          payment_methods?: Json | null
          price?: string
          revision_documents?: Json | null
          revision_explanation?: string | null
          revision_requested?: boolean | null
          revision_requested_at?: string | null
          sales?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_link?: string | null
          slug?: string | null
          status?: string | null
          subscription_config?: Json | null
          suggested_price?: number | null
          support_email?: string | null
          support_whatsapp?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_impersonation_session_id_fkey"
            columns: ["impersonation_session_id"]
            isOneToOne: false
            referencedRelation: "admin_impersonation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_member_area_id_fkey"
            columns: ["member_area_id"]
            isOneToOne: false
            referencedRelation: "member_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_holder: string | null
          avatar_url: string | null
          balance_retention_percentage: number | null
          ban_reason: string | null
          banned: boolean | null
          bio: string | null
          business_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          iban: string | null
          id: string
          is_creator: boolean | null
          language: string | null
          onesignal_player_id: string | null
          push_notifications_enabled: boolean | null
          retained_fixed_amount: number | null
          retention_reason: string | null
          retention_release_date: string | null
          updated_at: string
          user_id: string
          withdrawal_methods: Json | null
        }
        Insert: {
          account_holder?: string | null
          avatar_url?: string | null
          balance_retention_percentage?: number | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          is_creator?: boolean | null
          language?: string | null
          onesignal_player_id?: string | null
          push_notifications_enabled?: boolean | null
          retained_fixed_amount?: number | null
          retention_reason?: string | null
          retention_release_date?: string | null
          updated_at?: string
          user_id: string
          withdrawal_methods?: Json | null
        }
        Update: {
          account_holder?: string | null
          avatar_url?: string | null
          balance_retention_percentage?: number | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          is_creator?: boolean | null
          language?: string | null
          onesignal_player_id?: string | null
          push_notifications_enabled?: boolean | null
          retained_fixed_amount?: number | null
          retention_reason?: string | null
          retention_release_date?: string | null
          updated_at?: string
          user_id?: string
          withdrawal_methods?: Json | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_configurations: {
        Row: {
          created_at: string
          id: string
          product_id: string
          questions: Json
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          questions?: Json
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          questions?: Json
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          completed_at: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          ip_address: string | null
          quiz_id: string
          responses: Json
          score: number | null
          user_agent: string | null
        }
        Insert: {
          completed_at?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          ip_address?: string | null
          quiz_id: string
          responses?: Json
          score?: number | null
          user_agent?: string | null
        }
        Update: {
          completed_at?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          ip_address?: string | null
          quiz_id?: string
          responses?: Json
          score?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      read_notifications: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_email_logs: {
        Row: {
          abandoned_purchase_id: string
          clicked_at: string | null
          created_at: string
          delivery_status: string
          email_content: string
          email_sent_at: string
          email_subject: string
          error_message: string | null
          id: string
          opened_at: string | null
        }
        Insert: {
          abandoned_purchase_id: string
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_content: string
          email_sent_at?: string
          email_subject: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
        }
        Update: {
          abandoned_purchase_id?: string
          clicked_at?: string | null
          created_at?: string
          delivery_status?: string
          email_content?: string
          email_sent_at?: string
          email_subject?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_email_logs_abandoned_purchase_id_fkey"
            columns: ["abandoned_purchase_id"]
            isOneToOne: false
            referencedRelation: "abandoned_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_fees: {
        Row: {
          abandoned_purchase_id: string
          created_at: string
          currency: string
          fee_amount: number
          fee_percentage: number
          id: string
          order_id: string
          processed_at: string
          recovery_amount: number
          seller_user_id: string
        }
        Insert: {
          abandoned_purchase_id: string
          created_at?: string
          currency?: string
          fee_amount: number
          fee_percentage?: number
          id?: string
          order_id: string
          processed_at?: string
          recovery_amount: number
          seller_user_id: string
        }
        Update: {
          abandoned_purchase_id?: string
          created_at?: string
          currency?: string
          fee_amount?: number
          fee_percentage?: number
          id?: string
          order_id?: string
          processed_at?: string
          recovery_amount?: number
          seller_user_id?: string
        }
        Relationships: []
      }
      refund_logs: {
        Row: {
          action: string
          actor_email: string
          actor_id: string | null
          actor_role: string
          comment: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_status: string | null
          old_status: string | null
          refund_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email: string
          actor_id?: string | null
          actor_role: string
          comment?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          old_status?: string | null
          refund_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          actor_id?: string | null
          actor_role?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_status?: string | null
          old_status?: string | null
          refund_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_logs_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_comment: string | null
          amount: number
          buyer_email: string
          buyer_user_id: string | null
          created_at: string | null
          currency: string
          id: string
          order_id: string
          processed_at: string | null
          product_id: string | null
          reason: string
          refund_deadline: string
          seller_comment: string | null
          seller_user_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_comment?: string | null
          amount: number
          buyer_email: string
          buyer_user_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          order_id: string
          processed_at?: string | null
          product_id?: string | null
          reason: string
          refund_deadline: string
          seller_comment?: string | null
          seller_user_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_comment?: string | null
          amount?: number
          buyer_email?: string
          buyer_user_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          product_id?: string | null
          reason?: string
          refund_deadline?: string
          seller_comment?: string | null
          seller_user_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_recovery_analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          product_id: string | null
          recovery_rate: number
          total_abandoned: number
          total_recovered: number
          total_recovered_amount: number
          total_recovery_emails_sent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          product_id?: string | null
          recovery_rate?: number
          total_abandoned?: number
          total_recovered?: number
          total_recovered_amount?: number
          total_recovery_emails_sent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          product_id?: string | null
          recovery_rate?: number
          total_abandoned?: number
          total_recovered?: number
          total_recovered_amount?: number
          total_recovery_emails_sent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_recovery_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_recovery_settings: {
        Row: {
          created_at: string
          email_delay_hours: number
          email_subject: string
          email_template: string
          enabled: boolean
          id: string
          max_recovery_attempts: number
          product_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_delay_hours?: number
          email_subject?: string
          email_template?: string
          enabled?: boolean
          id?: string
          max_recovery_attempts?: number
          product_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_delay_hours?: number
          email_subject?: string
          email_template?: string
          enabled?: boolean
          id?: string
          max_recovery_attempts?: number
          product_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_recovery_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          event_type: string
          id: string
          ip_address: string | null
          location: string | null
          requires_2fa: boolean | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          location?: string | null
          requires_2fa?: boolean | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          requires_2fa?: boolean | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      seller_notifications: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          customer_name: string | null
          id: string
          message: string
          order_id: string | null
          product_name: string | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          id?: string
          message: string
          order_id?: string | null
          product_name?: string | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          customer_name?: string | null
          id?: string
          message?: string
          order_id?: string | null
          product_name?: string | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_retention_history: {
        Row: {
          admin_email: string
          created_at: string
          id: string
          new_percentage: number
          old_percentage: number
          reason: string
          retention_days: number | null
          user_id: string
        }
        Insert: {
          admin_email: string
          created_at?: string
          id?: string
          new_percentage: number
          old_percentage?: number
          reason: string
          retention_days?: number | null
          user_id: string
        }
        Update: {
          admin_email?: string
          created_at?: string
          id?: string
          new_percentage?: number
          old_percentage?: number
          reason?: string
          retention_days?: number | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          data: Json | null
          event_type: string
          id: string
          stripe_event_id: string | null
          subscription_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          data?: Json | null
          event_type: string
          id?: string
          stripe_event_id?: string | null
          subscription_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          data?: Json | null
          event_type?: string
          id?: string
          stripe_event_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_renewal_reminders: {
        Row: {
          days_before: number
          error_message: string | null
          id: string
          reminder_type: string
          sent_at: string
          status: string
          subscription_id: string
        }
        Insert: {
          days_before: number
          error_message?: string | null
          id?: string
          reminder_type: string
          sent_at?: string
          status?: string
          subscription_id: string
        }
        Update: {
          days_before?: number
          error_message?: string | null
          id?: string
          reminder_type?: string
          sent_at?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_renewal_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_renewal_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          subscription_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          subscription_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          subscription_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_renewal_tokens_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          last_used: string | null
          location: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_used?: string | null
          location?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_used?: string | null
          location?: string | null
          user_id?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string
          event_type: string
          expires_at: string
          id: string
          used: boolean
          user_email: string
        }
        Insert: {
          code: string
          created_at?: string
          event_type: string
          expires_at?: string
          id?: string
          used?: boolean
          user_email: string
        }
        Update: {
          code?: string
          created_at?: string
          event_type?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_email?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          method: string | null
          phone_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          method?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          device_fingerprint: string
          device_info: Json
          first_seen_at: string
          id: string
          is_trusted: boolean | null
          last_seen_at: string
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          device_info: Json
          first_seen_at?: string
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          device_info?: Json
          first_seen_at?: string
          id?: string
          is_trusted?: boolean | null
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json | null
          response_body: string | null
          response_status: number | null
          user_id: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          user_id: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_status?: number | null
          user_id?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_settings: {
        Row: {
          active: boolean | null
          created_at: string | null
          events: string[] | null
          headers: Json | null
          id: string
          product_id: string | null
          retries: number | null
          secret: string | null
          success: boolean | null
          timeout: number | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          headers?: Json | null
          id?: string
          product_id?: string | null
          retries?: number | null
          secret?: string | null
          success?: boolean | null
          timeout?: number | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          events?: string[] | null
          headers?: Json | null
          id?: string
          product_id?: string | null
          retries?: number | null
          secret?: string | null
          success?: boolean | null
          timeout?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      withdraw_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          admin_processed_by: string | null
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_processed_by?: string | null
          amount: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_processed_by?: string | null
          amount?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      balance_audit_discrepancies: {
        Row: {
          calculated_balance: number | null
          discrepancy: number | null
          email: string | null
          full_name: string | null
          stored_balance: number | null
          total_transactions: number | null
          user_id: string | null
        }
        Relationships: []
      }
      webhook_status: {
        Row: {
          created_at: string | null
          id: string | null
          order_id: string | null
          partner_name: string | null
          payment_status: string | null
          updated_at: string | null
          webhook_attempts: number | null
          webhook_last_error: string | null
          webhook_sent: boolean | null
          webhook_sent_at: string | null
          webhook_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_product: {
        Args: { admin_id?: string; p_admin_email?: string; product_id: string }
        Returns: undefined
      }
      admin_ban_product: {
        Args: {
          admin_id?: string
          ban_reason_text?: string
          p_admin_email?: string
          p_jwt_token?: string
          product_id: string
        }
        Returns: undefined
      }
      admin_confirm_user_email: {
        Args: { user_id: string }
        Returns: undefined
      }
      admin_fix_duplicate_balance_transaction: {
        Args: {
          p_correct_balance: number
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_get_all_balances: {
        Args: never
        Returns: {
          balance: number
          user_id: string
        }[]
      }
      admin_get_all_withdrawals: {
        Args: never
        Returns: {
          amount: number
          status: string
          user_id: string
        }[]
      }
      admin_has_permission: {
        Args: { admin_email: string; required_permission: string }
        Returns: boolean
      }
      admin_process_refund: {
        Args: {
          p_action: string
          p_admin_email: string
          p_comment?: string
          p_refund_id: string
        }
        Returns: Json
      }
      admin_process_transfer_request: {
        Args: { p_action: string; p_transfer_id: string }
        Returns: Json
      }
      admin_process_withdrawal_request: {
        Args: {
          admin_id?: string
          new_status: string
          notes_text?: string
          request_id: string
        }
        Returns: undefined
      }
      admin_recalculate_all_seller_balances: { Args: never; Returns: Json }
      admin_recalculate_seller_balance: {
        Args: {
          delete_old_credit_transactions?: boolean
          target_user_id: string
        }
        Returns: Json
      }
      admin_remove_seller_retention: {
        Args: { target_user_id: string }
        Returns: Json
      }
      admin_set_retention_release_date: {
        Args: { days_until_release: number; target_user_id: string }
        Returns: Json
      }
      admin_set_seller_retention:
        | {
            Args: {
              p_admin_email: string
              p_reason: string
              p_retention_days?: number
              p_retention_percentage: number
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              fixed_amount?: number
              retention_percentage: number
              target_user_id: string
            }
            Returns: Json
          }
      admin_update_balance: {
        Args: { p_new_balance: number; p_user_id: string }
        Returns: undefined
      }
      admin_update_identity_verification: {
        Args: {
          p_admin_email?: string
          p_admin_id?: string
          p_rejection_reason?: string
          p_status: string
          p_verification_id: string
        }
        Returns: undefined
      }
      apply_commission_to_all_transfers: {
        Args: never
        Returns: {
          acao: string
          order_id: string
          seller_email: string
          taxa_aplicada: number
          valor_liquido: number
          valor_original: number
        }[]
      }
      approve_partner: {
        Args: { admin_id?: string; partner_id: string }
        Returns: undefined
      }
      audit_balance_transactions: {
        Args: never
        Returns: {
          order_id: string
          total_amount: number
          transaction_count: number
          types: string[]
          user_id: string
        }[]
      }
      auto_fix_balance_discrepancy: {
        Args: { target_user_id: string }
        Returns: Json
      }
      calculate_access_expiration: {
        Args: {
          base_date?: string
          duration_type: string
          duration_value: number
        }
        Returns: string
      }
      calculate_commissions: {
        Args: {
          commission_rate: string
          has_affiliate: boolean
          order_amount: number
        }
        Returns: {
          affiliate_commission: number
          seller_commission: number
        }[]
      }
      check_balance_health: { Args: never; Returns: Json }
      check_customer_access: {
        Args: { p_customer_email: string; p_product_id: string }
        Returns: boolean
      }
      cleanup_duplicate_transactions_and_create_index: {
        Args: never
        Returns: Json
      }
      cleanup_expired_impersonation_sessions: {
        Args: never
        Returns: undefined
      }
      cleanup_expired_member_sessions: { Args: never; Returns: undefined }
      cleanup_passwordless_users: { Args: never; Returns: undefined }
      complete_refund: { Args: { p_refund_id: string }; Returns: undefined }
      count_duplicate_withdrawals: { Args: never; Returns: number }
      create_admin_user:
        | {
            Args: {
              p_email: string
              p_full_name: string
              p_password: string
              p_permissions?: string[]
              p_role?: Database["public"]["Enums"]["admin_role"]
            }
            Returns: string
          }
        | {
            Args: {
              p_admin_email?: string
              p_email: string
              p_full_name: string
              p_password: string
              p_permissions?: string[]
              p_role: Database["public"]["Enums"]["admin_role"]
            }
            Returns: string
          }
      create_customer_access_manual: {
        Args: {
          p_access_expires_at?: string
          p_customer_email: string
          p_customer_name: string
          p_order_id: string
          p_product_id: string
        }
        Returns: string
      }
      create_refund_request: {
        Args: { p_buyer_email?: string; p_order_id: string; p_reason: string }
        Returns: string
      }
      detect_abandoned_purchase: {
        Args: {
          _amount: number
          _currency?: string
          _customer_email: string
          _customer_name: string
          _customer_phone?: string
          _ip_address?: string
          _product_id: string
          _user_agent?: string
        }
        Returns: string
      }
      extend_customer_access: {
        Args: {
          p_customer_email: string
          p_extension_type: string
          p_extension_value: number
          p_order_id: string
          p_product_id: string
        }
        Returns: string
      }
      fix_all_balance_discrepancies: { Args: never; Returns: Json }
      fix_all_transfer_seller_commission: {
        Args: never
        Returns: {
          atualizado: boolean
          order_id_result: string
          status_venda: string
          valor_bruto: number
          valor_liquido_calculado: number
        }[]
      }
      fix_bank_transfer_commissions: {
        Args: never
        Returns: {
          corrigido: boolean
          order_id: string
          seller_user_id: string
          taxa_devida: number
          valor_creditado: number
          valor_original: number
        }[]
      }
      fix_bunny_cdn_urls: { Args: never; Returns: undefined }
      fix_seller_commission_values: {
        Args: never
        Returns: {
          atualizado: boolean
          order_id_result: string
          seller_commission_anterior: number
          valor_bruto: number
          valor_liquido_calculado: number
        }[]
      }
      generate_api_key: { Args: never; Returns: string }
      generate_renewal_token: {
        Args: { p_subscription_id: string }
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          pending_withdrawals: number
          total_paid_out: number
          total_products: number
          total_transactions: number
          total_users: number
        }[]
      }
      get_admin_permissions: {
        Args: { p_admin_email?: string; p_admin_id: string }
        Returns: {
          granted_at: string
          permission: string
        }[]
      }
      get_all_identity_verifications_for_admin: {
        Args: never
        Returns: {
          birth_date: string
          created_at: string
          document_back_url: string
          document_front_url: string
          document_number: string
          document_type: string
          full_name: string
          id: string
          rejection_reason: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string
          verified_by: string
        }[]
      }
      get_all_withdrawal_requests_for_admin: {
        Args: never
        Returns: {
          admin_notes: string
          admin_processed_by: string
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_available_balance_with_retention: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_current_user_email: { Args: never; Returns: string }
      get_lessons_for_student: {
        Args: { p_member_area_id: string; p_student_email: string }
        Returns: {
          bunny_embed_url: string
          bunny_video_id: string
          complementary_links: Json
          created_at: string
          description: string
          duration: number
          hls_url: string
          id: string
          is_scheduled: boolean
          lesson_materials: Json
          member_area_id: string
          module_id: string
          order_number: number
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
          video_data: Json
          video_url: string
        }[]
      }
      get_onesignal_stats: {
        Args: never
        Returns: {
          failed_syncs_count: number
          recent_syncs_count: number
          success_rate: number
          total_users: number
          users_with_player_id: number
        }[]
      }
      get_order_details_for_admin: {
        Args: { p_order_id: string }
        Returns: {
          amount: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          id: string
          member_area_url: string
          order_bump_data: Json
          order_id: string
          payment_method: string
          product_access_duration_type: string
          product_access_duration_value: number
          product_id: string
          product_member_area_id: string
          product_name: string
          product_share_link: string
          product_type: string
          product_user_id: string
          seller_commission: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_pending_transfers_for_admin: {
        Args: never
        Returns: {
          amount: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          id: string
          order_id: string
          payment_method: string
          payment_proof_data: Json
          payment_proof_hash: string
          product_id: string
          product_name: string
          status: string
          user_id: string
        }[]
      }
      get_product_for_checkout: {
        Args: { p_product_id: string }
        Returns: {
          access_duration_description: string
          access_duration_type: string
          access_duration_value: number
          allow_custom_price: boolean
          compare_at_price: string
          cover: string
          custom_prices: Json
          description: string
          fantasy_name: string
          id: string
          image_alt: string
          member_area_id: string
          minimum_price: string
          name: string
          payment_methods: Json
          price: string
          seo_description: string
          seo_keywords: string
          seo_title: string
          slug: string
          status: string
          subscription_config: Json
          suggested_price: string
          type: string
        }[]
      }
      get_product_for_checkout_by_slug: {
        Args: { p_slug: string }
        Returns: {
          access_duration_description: string
          access_duration_type: string
          access_duration_value: number
          allow_custom_price: boolean
          compare_at_price: string
          cover: string
          custom_prices: Json
          description: string
          fantasy_name: string
          id: string
          image_alt: string
          member_area_id: string
          minimum_price: string
          name: string
          payment_methods: Json
          price: string
          seo_description: string
          seo_keywords: string
          seo_title: string
          slug: string
          status: string
          subscription_config: Json
          suggested_price: string
          type: string
        }[]
      }
      get_public_product_data: {
        Args: { p_product_id: string }
        Returns: {
          access_duration_description: string
          access_duration_type: string
          access_duration_value: number
          allow_affiliates: boolean
          allow_custom_price: boolean
          commission_rate: number
          compare_at_price: string
          cover: string
          custom_prices: Json
          description: string
          fantasy_name: string
          id: string
          image_alt: string
          member_area_id: string
          minimum_price: string
          name: string
          payment_methods: Json
          price: string
          seo_description: string
          seo_keywords: string[]
          seo_title: string
          slug: string
          status: string
          subscription_config: Json
          suggested_price: string
          type: string
          user_id: string
        }[]
      }
      get_seller_public_info: {
        Args: { p_product_id: string }
        Returns: {
          avatar_url: string
          business_name: string
          country: string
          full_name: string
        }[]
      }
      get_seller_stats: { Args: { seller_id: string }; Returns: Json }
      get_top_sellers_of_month: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          total_revenue: number
          total_sales: number
        }[]
      }
      get_total_revenue_stats: {
        Args: never
        Returns: {
          total_orders: number
          total_revenue: number
        }[]
      }
      is_admin_session: { Args: never; Returns: boolean }
      is_admin_user: { Args: { check_email: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: { user_email: string }; Returns: boolean }
      is_suspicious_ip: {
        Args: { _ip_address: string; _user_id: string }
        Returns: boolean
      }
      is_trusted_device: {
        Args: { _device_fingerprint: string; _user_id: string }
        Returns: boolean
      }
      log_api_usage: {
        Args: {
          _endpoint: string
          _ip_address?: string
          _method: string
          _partner_id: string
          _response_time_ms?: number
          _status_code: number
          _user_agent?: string
        }
        Returns: undefined
      }
      process_missing_customer_access: {
        Args: never
        Returns: {
          details: Json
          processed_count: number
        }[]
      }
      process_recovery_fee: {
        Args: {
          _abandoned_purchase_id: string
          _fee_percentage?: number
          _order_id: string
        }
        Returns: string
      }
      recalculate_user_balance: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      release_expired_retentions: { Args: never; Returns: Json }
      remove_duplicate_withdrawals: { Args: never; Returns: number }
      reopen_refund_request: {
        Args: { p_order_id: string; p_reason: string }
        Returns: string
      }
      seller_process_refund: {
        Args: { p_action: string; p_comment?: string; p_refund_id: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_admin_permissions: {
        Args: {
          p_admin_email?: string
          p_admin_id: string
          p_permissions: string[]
        }
        Returns: undefined
      }
      update_old_commission_rates: {
        Args: never
        Returns: {
          diferenca: number
          order_id: string
          taxa_antiga: number
          taxa_nova: number
          updated: boolean
        }[]
      }
      verify_admin_jwt: {
        Args: { jwt_token: string }
        Returns: {
          email: string
          is_valid: boolean
          role: string
        }[]
      }
      verify_webhook_signature: {
        Args: { payload: string; secret: string; signature: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "admin" | "support" | "moderator"
      community_category:
        | "duvidas"
        | "dicas"
        | "novidades"
        | "produtos"
        | "marketing"
        | "tecnologia"
        | "geral"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super_admin", "admin", "support", "moderator"],
      community_category: [
        "duvidas",
        "dicas",
        "novidades",
        "produtos",
        "marketing",
        "tecnologia",
        "geral",
      ],
    },
  },
} as const
