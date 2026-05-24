export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      daily_stats: {
        Row: {
          biggest_win_cents: number
          day: string
          game: string
          spin_count: number
          total_bet_cents: number
          total_won_cents: number
          user_id: string
        }
        Insert: {
          biggest_win_cents?: number
          day: string
          game: string
          spin_count?: number
          total_bet_cents?: number
          total_won_cents?: number
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['daily_stats']['Insert']>
        Relationships: []
      }
      game_events: {
        Row: {
          balance_after_cents: number
          bet_cents: number
          created_at: string
          game: string
          id: number
          meta: Json | null
          spin_id: string
          user_id: string
          win_cents: number
        }
        Insert: Omit<Database['public']['Tables']['game_events']['Row'], 'created_at' | 'id'> & {
          created_at?: string
          id?: number
        }
        Update: Partial<Database['public']['Tables']['game_events']['Insert']>
        Relationships: []
      }
      game_sessions: {
        Row: {
          closed_at: string | null
          game: string
          id: string
          phase: string
          seed_hash: string | null
          spin_count: number
          started_at: string
          state: Json
          total_bet_cents: number
          total_win_cents: number
          user_id: string
        }
        Insert: Partial<Database['public']['Tables']['game_sessions']['Row']> & {
          game: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['game_sessions']['Insert']>
        Relationships: []
      }
      games: {
        Row: {
          bet_step_cents: number
          game: string
          label: string
          max_bet_cents: number
          min_bet_cents: number
        }
        Insert: Database['public']['Tables']['games']['Row']
        Update: Partial<Database['public']['Tables']['games']['Row']>
        Relationships: []
      }
      jackpot_config: {
        Row: {
          contribution_rate_bps: number
          label: string
          tier: string
          trigger_odds_per_million: number
        }
        Insert: Database['public']['Tables']['jackpot_config']['Row']
        Update: Partial<Database['public']['Tables']['jackpot_config']['Row']>
        Relationships: []
      }
      jackpot_meters: {
        Row: {
          amount_cents: number
          last_updated: string
          last_won_at: string | null
          last_won_by: string | null
          seed_cents: number
          tier: string
        }
        Insert: Partial<Database['public']['Tables']['jackpot_meters']['Row']> & {
          amount_cents: number
          seed_cents: number
          tier: string
        }
        Update: Partial<Database['public']['Tables']['jackpot_meters']['Row']>
        Relationships: []
      }
      luxury_config: {
        Row: { key: string; value: Json }
        Insert: { key: string; value: Json }
        Update: Partial<{ key: string; value: Json }>
        Relationships: []
      }
      play_sessions: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          id: string
          loss_cents: number
          max_loss_cents: number
          opened_at: string
          server_seed: string
          server_seed_hash: string
          spin_count: number
          time_cap_seconds: number | null
          user_id: string
        }
        Insert: Partial<Database['public']['Tables']['play_sessions']['Row']> & {
          user_id: string
          server_seed: string
          server_seed_hash: string
        }
        Update: Partial<Database['public']['Tables']['play_sessions']['Insert']>
        Relationships: []
      }
      player_limits: {
        Row: {
          daily_loss_limit_cents: number
          self_exclude_until: string | null
          session_loss_limit_cents: number
          session_time_cap_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: Partial<Database['public']['Tables']['player_limits']['Row']> & {
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['player_limits']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          username: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string
          username: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      wallet_grants: {
        Row: {
          amount_cents: number
          granted_at: string
          granted_by: string | null
          id: number
          reason: string | null
          source: string
          user_id: string
        }
        Insert: Partial<Database['public']['Tables']['wallet_grants']['Row']> & {
          amount_cents: number
          source: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['wallet_grants']['Insert']>
        Relationships: []
      }
      wallets: {
        Row: { balance_cents: number; updated_at: string; user_id: string }
        Insert: { balance_cents?: number; updated_at?: string; user_id: string }
        Update: Partial<Database['public']['Tables']['wallets']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      claim_daily_grant: {
        Args: never
        Returns: { granted_cents: number; new_balance_cents: number; next_claim_at: string }[]
      }
      close_play_session: {
        Args: never
        Returns: {
          session_id: string
          opened_at: string
          closed_at: string
          server_seed_hex: string
          server_seed_hash: string
          spin_count: number
          loss_cents: number
          close_reason: string
        }[]
      }
      leaderboard_alltime: {
        Args: { p_limit?: number }
        Returns: {
          biggest_win_cents: number
          spin_count: number
          total_bet_cents: number
          total_won_cents: number
          user_id: string
          username: string
        }[]
      }
      leaderboard_today: {
        Args: { p_limit?: number }
        Returns: {
          biggest_win_cents: number
          spin_count: number
          total_won_cents: number
          user_id: string
          username: string
        }[]
      }
      open_play_session: {
        Args: { p_max_loss_cents?: number; p_time_cap_seconds?: number }
        Returns: {
          session_id: string
          server_seed_hash: string
          opened_at: string
          max_loss_cents: number
          time_cap_seconds: number
        }[]
      }
      play_diamond: {
        Args: { p_spin_id: string; p_line_bet_cents: number; p_line_count: number }
        Returns: {
          grid: number[]
          reel_stops: number[]
          winning_lines: Json
          scatter_count: number
          base_win_cents: number
          is_bonus_spin: boolean
          multiplier_applied: number
          total_win_cents: number
          diamonds_collected: number
          free_spins_remaining: number
          bonus_triggered: boolean
          retriggered: boolean
          jackpot_won: string | null
          jackpot_amount_cents: number
          new_balance_cents: number
          fever1_cents: number
          fever2_cents: number
          fever3_cents: number
          was_replay: boolean
        }[]
      }
      play_keno_open: {
        Args: { p_round_id: string; p_picks: number[]; p_bet_cents: number }
        Returns: {
          session_id: string
          first_half: number[]
          first_half_hits: number
          new_balance_cents: number
          was_replay: boolean
        }[]
      }
      play_keno_resolve: {
        Args: { p_round_id: string; p_double_up: boolean }
        Returns: {
          all_balls: number[]
          second_half: number[]
          total_hits: number
          round_bet_cents: number
          win_cents: number
          jackpot_won: string | null
          jackpot_amount_cents: number
          total_win_cents: number
          new_balance_cents: number
          fever1_cents: number
          fever2_cents: number
          fever3_cents: number
          was_replay: boolean
        }[]
      }
      play_triple7: {
        Args: { p_spin_id: string; p_total_bet_cents: number }
        Returns: {
          grid: number[]
          per_line_bets: number[]
          per_line_wins: number[]
          winning_lines: number[]
          base_win_cents: number
          jackpot_won: string | null
          jackpot_amount_cents: number
          total_win_cents: number
          new_balance_cents: number
          fever1_cents: number
          fever2_cents: number
          fever3_cents: number
          was_replay: boolean
        }[]
      }
      triple7_preview_grid: {
        Args: Record<string, never>
        Returns: { grid: number[] }[]
      }
      keno_quick_pick: {
        Args: { p_count: number }
        Returns: { picks: number[] }[]
      }
      set_player_limits: {
        Args: {
          p_daily_loss_limit_cents?: number
          p_session_loss_limit_cents?: number
          p_session_time_cap_seconds?: number
          p_self_exclude_days?: number
        }
        Returns: {
          user_id: string
          daily_loss_limit_cents: number
          session_loss_limit_cents: number
          session_time_cap_seconds: number
          self_exclude_until: string | null
          updated_at: string
        }
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
