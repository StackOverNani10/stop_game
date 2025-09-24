export interface GameState {
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
  players: GamePlayerState[]
  created_at: string
  updated_at: string
}

export interface PlayerProfile {
  full_name: string | null
  avatar_url: string | null
  email: string
}

export interface GamePlayerState {
  id: string
  player_id: string
  profile: PlayerProfile
  score: number
  is_ready: boolean
  joined_at: string
}

export interface PlayerData extends Omit<GamePlayerState, 'profile'> {
  profile: PlayerProfile
}

export interface PlayerAnswers {
  [category: string]: string
}

export interface RoundResults {
  player_id: string
  answers: {
    [category: string]: {
      answer: string
      points: number
      is_unique: boolean
    }
  }
  total_points: number
}

export const DEFAULT_CATEGORIES = [
  'Nombre',
  'País',
  'Ciudad',
  'Animal',
  'Fruta',
  'Comida',
  'Objeto',
  'Profesión'
]

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')