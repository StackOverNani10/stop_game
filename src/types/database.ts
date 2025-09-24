export interface Database {
  public: {
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

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type GamePlayer = Database['public']['Tables']['game_players']['Row']
export type RoundAnswer = Database['public']['Tables']['round_answers']['Row']