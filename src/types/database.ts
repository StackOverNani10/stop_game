export interface Database {
  public: {
    Functions: {
      create_user_profile: {
        Args: {
          user_id: string;
          user_email: string;
          user_full_name: string;
        };
        Returns: unknown;
      };
    };
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          games_played: number
          games_won: number
          total_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          code: string
          host_id: string
          status: 'waiting' | 'playing' | 'finished'
          current_round: number
          current_letter: string | null
          categories: string[]
          max_rounds: number
          round_time_limit: number
          stop_countdown: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          status?: 'waiting' | 'playing' | 'finished'
          current_round?: number
          current_letter?: string | null
          categories: string[]
          max_rounds?: number
          round_time_limit?: number
          stop_countdown?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          host_id?: string
          status?: 'waiting' | 'playing' | 'finished'
          current_round?: number
          current_letter?: string | null
          categories?: string[]
          max_rounds?: number
          round_time_limit?: number
          stop_countdown?: number
          created_at?: string
          updated_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          score: number
          is_ready: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          score?: number
          is_ready?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          score?: number
          is_ready?: boolean
          joined_at?: string
        }
      }
      round_answers: {
        Row: {
          id: string
          game_id: string
          player_id: string
          round: number
          category: string
          answer: string
          points: number
          is_unique: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          round: number
          category: string
          answer: string
          points?: number
          is_unique?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          round?: number
          category?: string
          answer?: string
          points?: number
          is_unique?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Helper types for database tables
type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Game = Tables['games']['Row']
export type GamePlayer = Tables['game_players']['Row']
export type RoundAnswer = Tables['round_answers']['Row']