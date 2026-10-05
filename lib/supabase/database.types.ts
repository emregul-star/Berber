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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string
          blocked_until: string
          cancelled_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_note: string | null
          customer_phone: string
          ends_at: string
          id: string
          kvkk_consent_at: string | null
          manage_token_hash: string | null
          price_at_booking: number
          service_id: string
          shop_id: string
          source: string
          starts_at: string
          status: string
        }
        Insert: {
          barber_id: string
          blocked_until: string
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_note?: string | null
          customer_phone: string
          ends_at: string
          id?: string
          kvkk_consent_at?: string | null
          manage_token_hash?: string | null
          price_at_booking: number
          service_id: string
          shop_id: string
          source?: string
          starts_at: string
          status?: string
        }
        Update: {
          barber_id?: string
          blocked_until?: string
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string
          ends_at?: string
          id?: string
          kvkk_consent_at?: string | null
          manage_token_hash?: string | null
          price_at_booking?: number
          service_id?: string
          shop_id?: string
          source?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_shop_id_fkey"
            columns: ["barber_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "appointments_service_id_shop_id_fkey"
            columns: ["service_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_services: {
        Row: {
          barber_id: string
          created_at: string
          service_id: string
          shop_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          service_id: string
          shop_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          service_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_shop_id_fkey"
            columns: ["barber_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "barber_services_service_id_shop_id_fkey"
            columns: ["service_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "barber_services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          shop_id: string
          sort_order: number
          title: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          shop_id: string
          sort_order?: number
          title?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          shop_id?: string
          sort_order?: number
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          shop_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          shop_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          paid_at: string
          period_end: string | null
          period_start: string | null
          provider: string | null
          provider_ref: string | null
          recorded_by: string | null
          shop_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          provider_ref?: string | null
          recorded_by?: string | null
          shop_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          provider?: string | null
          provider_ref?: string | null
          recorded_by?: string | null
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          key: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          shop_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          shop_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_members: {
        Row: {
          created_at: string
          id: string
          role: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          allow_any_barber: boolean
          buffer_minutes: number
          cancel_deadline_minutes: number
          created_at: string
          id: string
          max_advance_days: number
          min_notice_minutes: number
          requires_approval: boolean
          shop_id: string
          slot_interval_minutes: number
        }
        Insert: {
          allow_any_barber?: boolean
          buffer_minutes?: number
          cancel_deadline_minutes?: number
          created_at?: string
          id?: string
          max_advance_days?: number
          min_notice_minutes?: number
          requires_approval?: boolean
          shop_id: string
          slot_interval_minutes?: number
        }
        Update: {
          allow_any_barber?: boolean
          buffer_minutes?: number
          cancel_deadline_minutes?: number
          created_at?: string
          id?: string
          max_advance_days?: number
          min_notice_minutes?: number
          requires_approval?: boolean
          shop_id?: string
          slot_interval_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          accent_color: string | null
          address: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          custom_domain: string | null
          description: string | null
          email: string | null
          google_maps_embed_url: string | null
          google_reviews_url: string | null
          id: string
          instagram_url: string | null
          is_demo: boolean
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          slug: string
          status: string
          theme_preset: string
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          google_maps_embed_url?: string | null
          google_reviews_url?: string | null
          id?: string
          instagram_url?: string | null
          is_demo?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          slug: string
          status?: string
          theme_preset?: string
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          google_maps_embed_url?: string | null
          google_reviews_url?: string | null
          id?: string
          instagram_url?: string | null
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          slug?: string
          status?: string
          theme_preset?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_day: number
          created_at: string
          id: string
          monthly_fee: number
          notes: string | null
          paid_until: string | null
          setup_fee: number
          shop_id: string
          status: string
        }
        Insert: {
          billing_day?: number
          created_at?: string
          id?: string
          monthly_fee?: number
          notes?: string | null
          paid_until?: string | null
          setup_fee?: number
          shop_id: string
          status?: string
        }
        Update: {
          billing_day?: number
          created_at?: string
          id?: string
          monthly_fee?: number
          notes?: string | null
          paid_until?: string | null
          setup_fee?: number
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_visible: boolean
          rating: number
          shop_id: string
          sort_order: number
          source: string | null
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_visible?: boolean
          rating: number
          shop_id: string
          sort_order?: number
          source?: string | null
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          rating?: number
          shop_id?: string
          sort_order?: number
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          barber_id: string | null
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          shop_id: string
          starts_at: string
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          shop_id: string
          starts_at: string
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          shop_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_barber_id_shop_id_fkey"
            columns: ["barber_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "time_off_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          barber_id: string | null
          break_end: string | null
          break_start: string | null
          created_at: string
          end_time: string | null
          id: string
          is_closed: boolean
          shop_id: string
          start_time: string | null
          weekday: number
        }
        Insert: {
          barber_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          shop_id: string
          start_time?: string | null
          weekday: number
        }
        Update: {
          barber_id?: string | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          shop_id?: string
          start_time?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_barber_id_shop_id_fkey"
            columns: ["barber_id", "shop_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id", "shop_id"]
          },
          {
            foreignKeyName: "working_hours_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rate_limit_hit: {
        Args: { p_key: string; p_window_seconds: number }
        Returns: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
