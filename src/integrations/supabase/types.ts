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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_store_transactions: {
        Row: {
          created_at: string
          environment: string | null
          expires_at: string | null
          latest_transaction_id: string | null
          original_transaction_id: string
          product_id: string | null
          raw: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          latest_transaction_id?: string | null
          original_transaction_id: string
          product_id?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          latest_transaction_id?: string | null
          original_transaction_id?: string
          product_id?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          stripe_event_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json
          event_type: string
          id?: string
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      ble_diagnostics: {
        Row: {
          app_version: string
          created_at: string
          device_model: string
          events: Json
          id: string
          os_version: string
          self_check: string | null
          user_id: string
        }
        Insert: {
          app_version: string
          created_at?: string
          device_model: string
          events: Json
          id?: string
          os_version: string
          self_check?: string | null
          user_id: string
        }
        Update: {
          app_version?: string
          created_at?: string
          device_model?: string
          events?: Json
          id?: string
          os_version?: string
          self_check?: string | null
          user_id?: string
        }
        Relationships: []
      }
      firmware_releases: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          file_size: number
          hardware_model: string
          id: string
          is_published: boolean
          mandatory: boolean
          min_app_version: string | null
          release_notes: Json
          sha256: string | null
          updated_at: string
          version: string
          version_code: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          file_size?: number
          hardware_model?: string
          id?: string
          is_published?: boolean
          mandatory?: boolean
          min_app_version?: string | null
          release_notes?: Json
          sha256?: string | null
          updated_at?: string
          version: string
          version_code: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_size?: number
          hardware_model?: string
          id?: string
          is_published?: boolean
          mandatory?: boolean
          min_app_version?: string | null
          release_notes?: Json
          sha256?: string | null
          updated_at?: string
          version?: string
          version_code?: number
        }
        Relationships: []
      }
      learn_content_versions: {
        Row: {
          channel: string
          checksum: string | null
          content_version: string
          id: string
          is_current: boolean
          notes: string | null
          payload: Json
          published_at: string
        }
        Insert: {
          channel?: string
          checksum?: string | null
          content_version: string
          id?: string
          is_current?: boolean
          notes?: string | null
          payload: Json
          published_at?: string
        }
        Update: {
          channel?: string
          checksum?: string | null
          content_version?: string
          id?: string
          is_current?: boolean
          notes?: string | null
          payload?: Json
          published_at?: string
        }
        Relationships: []
      }
      learn_experiences: {
        Row: {
          created_at: string
          est_seconds_per_level: number | null
          icon: string | null
          id: string
          is_active: boolean
          level_count: number | null
          module_id: string
          name: string
          order: number
          response_mechanic: string | null
          short_desc: string | null
          skill_focus: string | null
          updated_at: string
          uses_led: boolean
        }
        Insert: {
          created_at?: string
          est_seconds_per_level?: number | null
          icon?: string | null
          id: string
          is_active?: boolean
          level_count?: number | null
          module_id: string
          name: string
          order?: number
          response_mechanic?: string | null
          short_desc?: string | null
          skill_focus?: string | null
          updated_at?: string
          uses_led?: boolean
        }
        Update: {
          created_at?: string
          est_seconds_per_level?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          level_count?: number | null
          module_id?: string
          name?: string
          order?: number
          response_mechanic?: string | null
          short_desc?: string | null
          skill_focus?: string | null
          updated_at?: string
          uses_led?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "learn_experiences_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learn_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_haptic_patterns: {
        Row: {
          created_at: string
          description: string | null
          erm_ok: boolean | null
          f005_level: number | null
          id: string
          led_pattern: Json | null
          module_id: string | null
          role: string | null
          vibration_pattern: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          erm_ok?: boolean | null
          f005_level?: number | null
          id: string
          led_pattern?: Json | null
          module_id?: string | null
          role?: string | null
          vibration_pattern?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          erm_ok?: boolean | null
          f005_level?: number | null
          id?: string
          led_pattern?: Json | null
          module_id?: string | null
          role?: string | null
          vibration_pattern?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "learn_haptic_patterns_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learn_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_levels: {
        Row: {
          created_at: string
          difficulty: number | null
          experience_id: string
          f005_level: number | null
          goal: string | null
          id: string
          is_active: boolean
          led_pattern: Json | null
          name: string | null
          order: number
          params: Json
          scoring: Json
          success_criteria: Json
          unlock_after: string | null
          updated_at: string
          vibration_pattern: Json
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          experience_id: string
          f005_level?: number | null
          goal?: string | null
          id: string
          is_active?: boolean
          led_pattern?: Json | null
          name?: string | null
          order?: number
          params?: Json
          scoring?: Json
          success_criteria?: Json
          unlock_after?: string | null
          updated_at?: string
          vibration_pattern: Json
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          experience_id?: string
          f005_level?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean
          led_pattern?: Json | null
          name?: string | null
          order?: number
          params?: Json
          scoring?: Json
          success_criteria?: Json
          unlock_after?: string | null
          updated_at?: string
          vibration_pattern?: Json
        }
        Relationships: [
          {
            foreignKeyName: "learn_levels_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "learn_experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_modules: {
        Row: {
          audience: string | null
          color_theme: string | null
          content_version: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          number: number | null
          skill_focus: Json
          tagline: string | null
          updated_at: string
        }
        Insert: {
          audience?: string | null
          color_theme?: string | null
          content_version?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id: string
          is_active?: boolean
          name: string
          number?: number | null
          skill_focus?: Json
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string | null
          color_theme?: string | null
          content_version?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          number?: number | null
          skill_focus?: Json
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      learn_user_progress: {
        Row: {
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempts: number
          email: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempts?: number
          email: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempts?: number
          email?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      personal_accounts: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          granted_free_until: string | null
          payment_provider: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          granted_free_until?: string | null
          payment_provider?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          granted_free_until?: string | null
          payment_provider?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          has_used_trial: boolean
          id: string
          is_active: boolean
          is_verified: boolean
          last_name: string | null
          mother_user_id: string | null
          updated_at: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          has_used_trial?: boolean
          id: string
          is_active?: boolean
          is_verified?: boolean
          last_name?: string | null
          mother_user_id?: string | null
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          has_used_trial?: boolean
          id?: string
          is_active?: boolean
          is_verified?: boolean
          last_name?: string | null
          mother_user_id?: string | null
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          admin_notes: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          discount_percent: number | null
          free_until: string | null
          granted_by: string | null
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          discount_percent?: number | null
          free_until?: string | null
          granted_by?: string | null
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          discount_percent?: number | null
          free_until?: string | null
          granted_by?: string | null
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string | null
          email_sent: boolean
          expires_at: string
          id: string
          resend_id: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string | null
          email_sent?: boolean
          expires_at: string
          id?: string
          resend_id?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string | null
          email_sent?: boolean
          expires_at?: string
          id?: string
          resend_id?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_data: { Args: { target: string }; Returns: undefined }
      expire_lapsed_trials: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      learn_validate_pattern: { Args: { p: Json }; Returns: string }
    }
    Enums: {
      account_type: "end_user" | "team_supervisor" | "super_admin"
      app_role: "super_admin" | "team_supervisor" | "end_user"
      plan_tier: "free" | "basic" | "pro" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
        | "unpaid"
      verification_status: "pending" | "verified" | "rejected"
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
    Enums: {
      account_type: ["end_user", "team_supervisor", "super_admin"],
      app_role: ["super_admin", "team_supervisor", "end_user"],
      plan_tier: ["free", "basic", "pro", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "paused",
        "unpaid",
      ],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
