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
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
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
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string
          email: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description: string
          email?: string | null
          id?: string
          order_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string
          email?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
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
      facebook_api_settings: {
        Row: {
          access_token: string
          app_id: string
          app_secret: string
          created_at: string | null
          enabled: boolean | null
          id: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          created_at: string
          description: string | null
          duration: number
          id: string
          member_area_id: string | null
          module_id: string | null
          order_number: number
          status: string
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          member_area_id?: string | null
          module_id?: string | null
          order_number?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          member_area_id?: string | null
          module_id?: string | null
          order_number?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          created_at: string
          id: string
          member_area_id: string
          student_email: string
          student_name: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          member_area_id: string
          student_email: string
          student_name: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          member_area_id?: string
          student_email?: string
          student_name?: string
        }
        Relationships: [
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
          created_at: string
          description: string | null
          hero_description: string | null
          hero_image_url: string | null
          hero_title: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_description?: string | null
          hero_image_url?: string | null
          hero_title?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          member_area_id: string | null
          order_number: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_area_id?: string | null
          order_number?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_area_id?: string | null
          order_number?: number
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
        ]
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
          bump_product_name: string
          bump_product_price: string
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
          bump_product_name: string
          bump_product_price: string
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
          bump_product_name?: string
          bump_product_price?: string
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
          created_at: string
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          order_bump_data: Json | null
          order_id: string
          payment_method: string | null
          payment_proof_data: Json | null
          product_id: string
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
          created_at?: string
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          order_bump_data?: Json | null
          order_id: string
          payment_method?: string | null
          payment_proof_data?: Json | null
          product_id: string
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
          created_at?: string
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          order_bump_data?: Json | null
          order_id?: string
          payment_method?: string | null
          payment_proof_data?: Json | null
          product_id?: string
          seller_commission?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
          ban_reason: string | null
          category: string | null
          commission: string | null
          cover: string | null
          created_at: string
          custom_prices: Json | null
          description: string | null
          fantasy_name: string | null
          id: string
          image_alt: string | null
          member_area_id: string | null
          name: string
          payment_methods: Json | null
          price: string
          revision_requested: boolean | null
          revision_requested_at: string | null
          sales: number | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          share_link: string | null
          slug: string | null
          status: string | null
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
          ban_reason?: string | null
          category?: string | null
          commission?: string | null
          cover?: string | null
          created_at?: string
          custom_prices?: Json | null
          description?: string | null
          fantasy_name?: string | null
          id?: string
          image_alt?: string | null
          member_area_id?: string | null
          name: string
          payment_methods?: Json | null
          price: string
          revision_requested?: boolean | null
          revision_requested_at?: string | null
          sales?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_link?: string | null
          slug?: string | null
          status?: string | null
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
          ban_reason?: string | null
          category?: string | null
          commission?: string | null
          cover?: string | null
          created_at?: string
          custom_prices?: Json | null
          description?: string | null
          fantasy_name?: string | null
          id?: string
          image_alt?: string | null
          member_area_id?: string | null
          name?: string
          payment_methods?: Json | null
          price?: string
          revision_requested?: boolean | null
          revision_requested_at?: string | null
          sales?: number | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_link?: string | null
          slug?: string | null
          status?: string | null
          support_email?: string | null
          support_whatsapp?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          ban_reason: string | null
          banned: boolean | null
          bio: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          iban: string | null
          id: string
          is_creator: boolean | null
          push_notifications_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          is_creator?: boolean | null
          push_notifications_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned?: boolean | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          is_creator?: boolean | null
          push_notifications_enabled?: boolean | null
          updated_at?: string
          user_id?: string
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
      reference_payments: {
        Row: {
          amount: number
          appypay_transaction_id: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          expires_at: string
          id: string
          order_id: string
          paid_at: string | null
          product_id: string
          reference_number: string | null
          status: string
          updated_at: string
          user_id: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          appypay_transaction_id?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          expires_at: string
          id?: string
          order_id: string
          paid_at?: string | null
          product_id: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          appypay_transaction_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          product_id?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          webhook_data?: Json | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      admin_approve_product: {
        Args: { admin_id?: string; product_id: string }
        Returns: undefined
      }
      admin_ban_product: {
        Args:
          | { admin_id?: string; ban_reason_text?: string; product_id: string }
          | { admin_id?: string; product_id: string }
        Returns: undefined
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
      approve_partner: {
        Args: { admin_id?: string; partner_id: string }
        Returns: undefined
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
      check_customer_access: {
        Args: { p_customer_email: string; p_product_id: string }
        Returns: boolean
      }
      cleanup_expired_member_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          pending_withdrawals: number
          total_paid_out: number
          total_products: number
          total_transactions: number
          total_users: number
        }[]
      }
      get_all_identity_verifications_for_admin: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_seller_stats: {
        Args: { seller_id: string }
        Returns: Json
      }
      is_admin_session: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
      process_recovery_fee: {
        Args: {
          _abandoned_purchase_id: string
          _fee_percentage?: number
          _order_id: string
        }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
