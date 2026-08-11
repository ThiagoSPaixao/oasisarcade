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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_hidden: boolean
          name: string
          slug: string
          sort_order: number
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name: string
          slug: string
          sort_order?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean
          name?: string
          slug?: string
          sort_order?: number
          xp_reward?: number
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          created_at: string
          description: string
          game_slug: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          target: number
          title: string
          type: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string
          game_slug?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order: number
          target: number
          title: string
          type: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          game_slug?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          target?: number
          title?: string
          type?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_game_slug_fkey"
            columns: ["game_slug"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["slug"]
          },
        ]
      }
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
      game_sessions: {
        Row: {
          created_at: string
          expires_at: string
          game_slug: string
          id: string
          started_at: string
          user_id: string
          validated_at: string | null
          validated_score: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          game_slug: string
          id?: string
          started_at?: string
          user_id: string
          validated_at?: string | null
          validated_score?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          game_slug?: string
          id?: string
          started_at?: string
          user_id?: string
          validated_at?: string | null
          validated_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_game_slug_fkey"
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
      payment_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          provider: string
          received_at: string
          user_id: string | null
        }
        Insert: {
          environment: string
          event_id: string
          event_type: string
          provider?: string
          received_at?: string
          user_id?: string | null
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          provider?: string
          received_at?: string
          user_id?: string | null
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          is_comped: boolean
          plan: Database["public"]["Enums"]["plan_status"]
          price_id: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          is_comped?: boolean
          plan?: Database["public"]["Enums"]["plan_status"]
          price_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          is_comped?: boolean
          plan?: Database["public"]["Enums"]["plan_status"]
          price_id?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_rewards: {
        Row: {
          activity_date: string
          challenge_slug: string
          granted_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          activity_date: string
          challenge_slug: string
          granted_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          activity_date?: string
          challenge_slug?: string
          granted_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      user_daily_activity: {
        Row: {
          activity_date: string
          challenge_completed_at: string | null
          challenge_progress: number
          challenge_slug: string | null
          created_at: string
          played_slugs: string[]
          plays: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          challenge_completed_at?: string | null
          challenge_progress?: number
          challenge_slug?: string | null
          created_at?: string
          played_slugs?: string[]
          plays?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          challenge_completed_at?: string | null
          challenge_progress?: number
          challenge_slug?: string | null
          created_at?: string
          played_slugs?: string[]
          plays?: number
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
      user_stats: {
        Row: {
          best_score: number
          created_at: string
          current_streak: number
          games_played: string[]
          last_activity_date: string | null
          longest_streak: number
          plays_total: number
          records_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_score?: number
          created_at?: string
          current_streak?: number
          games_played?: string[]
          last_activity_date?: string | null
          longest_streak?: number
          plays_total?: number
          records_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_score?: number
          created_at?: string
          current_streak?: number
          games_played?: string[]
          last_activity_date?: string | null
          longest_streak?: number
          plays_total?: number
          records_total?: number
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
      apply_provider_subscription: {
        Args: {
          _cancel_at_period_end?: boolean
          _current_period_end: string
          _current_period_start: string
          _environment: string
          _plan: Database["public"]["Enums"]["plan_status"]
          _price_id: string
          _provider: string
          _provider_customer_id: string
          _provider_subscription_id: string
          _status: string
          _user_id: string
        }
        Returns: undefined
      }
      can_play_game_for: {
        Args: { _environment?: string; _game_slug: string; _user_id: string }
        Returns: boolean
      }
      daily_challenge_for: {
        Args: { _date: string }
        Returns: {
          created_at: string
          description: string
          game_slug: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          target: number
          title: string
          type: string
          xp_reward: number
        }
        SetofOptions: {
          from: "*"
          to: "daily_challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_achievements_for: { Args: { _user_id: string }; Returns: Json }
      get_gamification_state_for: { Args: { _user_id: string }; Returns: Json }
      get_leaderboard: {
        Args: { _game_slug: string; _limit?: number }
        Returns: {
          created_at: string
          is_premium: boolean
          level: number
          rank: number
          score: number
          username: string
        }[]
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
      level_for_xp: { Args: { _xp: number }; Returns: number }
      my_gamification_state: { Args: never; Returns: Json }
      my_process_game_result: {
        Args: {
          _environment?: string
          _game_slug: string
          _is_record?: boolean
          _score: number
          _session_id: string
        }
        Returns: Json
      }
      my_start_game_session: {
        Args: { _environment?: string; _game_slug: string }
        Returns: string
      }
      my_submit_score: {
        Args: {
          _difficulty?: string
          _duration_ms?: number
          _environment?: string
          _game_slug: string
          _game_version?: string
          _score: number
          _session_id: string
        }
        Returns: boolean
      }
      my_subscription_state: { Args: { _environment?: string }; Returns: Json }
      process_game_result_for: {
        Args: {
          _environment?: string
          _game_slug: string
          _is_record?: boolean
          _score: number
          _session_id: string
          _user_id: string
        }
        Returns: Json
      }
      reconcile_plan_cache: { Args: never; Returns: number }
      refresh_plan_cache_for: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["plan_status"]
      }
      register_payment_event: {
        Args: {
          _environment: string
          _event_id: string
          _event_type: string
          _user_id?: string
        }
        Returns: boolean
      }
      start_game_session_for: {
        Args: { _environment?: string; _game_slug: string; _user_id: string }
        Returns: string
      }
      submit_score_for: {
        Args: {
          _difficulty?: string
          _duration_ms?: number
          _environment?: string
          _game_slug: string
          _game_version?: string
          _score: number
          _session_id: string
          _user_id: string
        }
        Returns: boolean
      }
      subscription_state_for: {
        Args: { _environment?: string; _user_id: string }
        Returns: Json
      }
      validate_game_session_for: {
        Args: {
          _game_slug: string
          _score: number
          _session_id: string
          _user_id: string
        }
        Returns: boolean
      }
      xp_for_level: { Args: { _level: number }; Returns: number }
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
