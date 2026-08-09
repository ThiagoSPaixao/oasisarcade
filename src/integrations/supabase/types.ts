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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string
          game_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
      games: {
        Row: {
          category: Database["public"]["Enums"]["game_category"]
          created_at: string
          description: string
          is_premium: boolean
          name: string
          slug: string
          sort_order: number
          state: Database["public"]["Enums"]["game_state"]
          thumbnail: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["game_category"]
          created_at?: string
          description?: string
          is_premium?: boolean
          name: string
          slug: string
          sort_order?: number
          state?: Database["public"]["Enums"]["game_state"]
          thumbnail?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"]
          created_at?: string
          description?: string
          is_premium?: boolean
          name?: string
          slug?: string
          sort_order?: number
          state?: Database["public"]["Enums"]["game_state"]
          thumbnail?: string | null
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          game_slug: string
          level: number
          score: number
          scored_at: string
          user_id: string
          username: string
        }
        Insert: {
          game_slug: string
          level: number
          score: number
          scored_at: string
          user_id: string
          username: string
        }
        Update: {
          game_slug?: string
          level?: number
          score?: number
          scored_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          level: number
          plano_status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          level?: number
          plano_status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          username?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          level?: number
          plano_status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      score_submissions: {
        Row: {
          difficulty: string | null
          duration_ms: number | null
          game_slug: string
          game_version: string | null
          id: string
          score: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          difficulty?: string | null
          duration_ms?: number | null
          game_slug: string
          game_version?: string | null
          id?: string
          score: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          difficulty?: string | null
          duration_ms?: number | null
          game_slug?: string
          game_version?: string | null
          id?: string
          score?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_status"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_status"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_status"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          created_at: string
          difficulty: string | null
          duration_ms: number | null
          game_slug: string
          game_version: string | null
          id: string
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          duration_ms?: number | null
          game_slug: string
          game_version?: string | null
          id?: string
          played_at?: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          duration_ms?: number | null
          game_slug?: string
          game_version?: string | null
          id?: string
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { _game_slug: string; _limit?: number }
        Returns: {
          created_at: string
          level: number
          rank: number
          score: number
          user_id: string
          username: string
        }[]
      }
      grant_xp: {
        Args: { _amount: number }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          level: number
          plano_status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          username: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_xp_for: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          level: number
          plano_status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          username: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      simulate_subscription: {
        Args: { _plan: Database["public"]["Enums"]["plan_status"] }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          level: number
          plano_status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          username: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      simulate_subscription_for: {
        Args: {
          _plan: Database["public"]["Enums"]["plan_status"]
          _user_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string
          id: string
          level: number
          plano_status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          username: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_score: {
        Args: {
          _difficulty?: string
          _duration_ms?: number
          _game_slug: string
          _game_version?: string
          _score: number
        }
        Returns: boolean
      }
      submit_score_for: {
        Args: {
          _difficulty?: string
          _duration_ms?: number
          _game_slug: string
          _game_version?: string
          _score: number
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      game_category: "mais_jogados" | "classicos_8bits"
      game_state: "playable" | "soon"
      plan_status: "free" | "premium"
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
      game_category: ["mais_jogados", "classicos_8bits"],
      game_state: ["playable", "soon"],
      plan_status: ["free", "premium"],
    },
  },
} as const
