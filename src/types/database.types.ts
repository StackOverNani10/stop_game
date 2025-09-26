export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          code: string
          host_id: string
          categories: string[]
          max_rounds: number
          status: 'waiting' | 'playing' | 'finished'
          current_letter: string | null
          current_round: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          categories: string[] | Json
          max_rounds: number
          status?: 'waiting' | 'playing' | 'finished'
          current_letter?: string | null
          current_round?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          code?: string
          host_id?: string
          categories?: string[] | Json
          max_rounds?: number
          status?: 'waiting' | 'playing' | 'finished'
          current_letter?: string | null
          current_round?: number
          created_at?: string
          updated_at?: string
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
          created_at?: string
        }
        Update: {
          id?: never
          game_id?: string
          player_id?: string
          round?: number
          category?: string
          answer?: string
          points?: number
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: never
          name?: string
          created_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          joined_at: string
          is_ready: boolean
          score: number
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          joined_at?: string
          is_ready?: boolean
          score?: number
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          joined_at?: string
          is_ready?: boolean
          score?: number
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          username: string | null
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
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: never
          email?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
