export interface GameState {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'playing' | 'finished'
  current_round_number: number  // Cambiado de current_round a current_round_number
  current_letter: string | null
  categories: string[]
  max_rounds: number
  round_time_limit: number
  stop_countdown: number
  players: GamePlayerState[]
  created_at: string
  updated_at: string
  // Mantener current_round como opcional para compatibilidad
  current_round?: number
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

export interface Category {
  id: string;
  name: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Nombre' },
  { id: '2', name: 'País' },
  { id: '3', name: 'Ciudad' },
  { id: '4', name: 'Animal' },
  { id: '5', name: 'Fruta' },
  { id: '6', name: 'Comida' },
  { id: '7', name: 'Objeto' },
  { id: '8', name: 'Profesión' }
]

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')