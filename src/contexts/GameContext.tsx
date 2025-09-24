import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, insert } from '../lib/supabase'
import type { Database } from '../types/database.types'
import { useAuth } from './AuthContext'
import { GameState, PlayerAnswers, RoundResults, LETTERS, PlayerData } from '../types/game'

interface DatabaseGame {
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

interface GameData {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  code: string;
  host_id: string;
}
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

interface GameContextType {
  currentGame: GameState | null
  playerAnswers: PlayerAnswers
  gameLoading: boolean
  createGame: (categories: string[], maxRounds: number) => Promise<string>
  joinGame: (code: string) => Promise<void>
  leaveGame: () => Promise<void>
  startGame: () => Promise<void>
  submitAnswers: (answers: PlayerAnswers) => Promise<void>
  callStop: () => Promise<void>
  setPlayerReady: (ready: boolean) => Promise<void>
  updateAnswer: (category: string, answer: string) => void
  resetAnswers: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth()
  const [currentGame, setCurrentGame] = useState<GameState | null>(null)
  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswers>({})
  const [gameLoading, setGameLoading] = useState(false)

  // Subscribe to game updates
  useEffect(() => {
    if (!currentGame?.id) return

    const subscription = supabase
      .channel(`game:${currentGame.id}`)
      .on('system' as any, { event: 'postgres_changes' } as any, (payload: any) => {
        if (payload.table === 'games' && payload.new?.id === currentGame.id) {
          handleGameUpdate(payload)
        } else if (payload.table === 'game_players' && payload.new?.game_id === currentGame.id) {
          handlePlayersUpdate()
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentGame?.id])

  const handleGameUpdate = useCallback((payload: any) => {
    if (!payload.new) return;
    
    setCurrentGame(prev => ({
      ...(prev || {}),
      ...payload.new,
      // Make sure players array is preserved if not in the update
      players: prev?.players || []
    }));
    
    // Handle different game states
    if (payload.new.status === 'playing' && payload.old?.status === 'waiting') {
      toast.success('¡El juego ha comenzado!');
      resetAnswers();
    }
    
    if (payload.new.current_letter && payload.new.current_letter !== payload.old?.current_letter) {
      toast.success(`Nueva letra: ${payload.new.current_letter}`);
      resetAnswers();
    }
  }, [currentGame])

  const handlePlayersUpdate = useCallback(async () => {
    if (!currentGame?.id) return
    
    // Reload players
    await loadGamePlayers(currentGame.id)
  }, [currentGame?.id])

  const loadGamePlayers = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('game_players')
        .select(`
          *,
          profile:profiles(full_name, avatar_url, email)
        `)
        .eq('game_id', gameId)

      if (error) throw error

      // Cast the data to PlayerData[] to ensure type safety
      const playersData = data as unknown as PlayerData[]

      setCurrentGame(prev => prev ? {
        ...prev,
        players: playersData.map(player => ({
          id: player.id,
          player_id: player.player_id,
          profile: player.profile,
          score: player.score,
          is_ready: player.is_ready,
          joined_at: player.joined_at
        }))
      } : null)
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const generateGameCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const createGame = async (categories: string[], maxRounds: number): Promise<string> => {
    if (!user) throw new Error('User not authenticated')
    
    setGameLoading(true)
    try {
      const gameCode = generateGameCode()
      const gameId = uuidv4()

      // Create game
      const gameData = {
        id: gameId,
        code: gameCode,
        host_id: user.id,
        categories,
        max_rounds: maxRounds,
        status: 'waiting' as const
      }

      const { error: gameError } = await insert('games', gameData)

      if (gameError) throw gameError

      // Join as host
      const { error: playerError } = await insert('game_players', {
        game_id: gameId,
        player_id: user.id,
        is_ready: false,
        score: 0
      })

      if (playerError) throw playerError

      // Load the game
      await joinGameById(gameId)

      return gameCode
    } catch (error: any) {
      toast.error('Error al crear el juego')
      throw error
    } finally {
      setGameLoading(false)
    }
  }

  const joinGame = async (code: string) => {
    if (!user) throw new Error('User not authenticated')
    
    setGameLoading(true)
    try {
      // Find game by code
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, status, code, host_id')
        .eq('code', code.toUpperCase())
        .eq('status', 'waiting')
        .single<GameData>()

      if (gameError || !gameData) {
        throw new Error('Juego no encontrado o ya iniciado')
      }

      // Check if already joined
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameData.id)
        .eq('player_id', user.id)
        .single()

      if (!existingPlayer) {
        // Join game
        const { error: playerError } = await insert('game_players', {
          game_id: gameData.id,
          player_id: user.id,
          is_ready: false,
          score: 0,
          joined_at: new Date().toISOString()
        })

        if (playerError) throw playerError
      }

      await joinGameById(gameData.id)
      toast.success('Te has unido al juego')
    } catch (error: any) {
      toast.error(error.message || 'Error al unirse al juego')
      throw error
    } finally {
      setGameLoading(false)
    }
  }

  const joinGameById = async (gameId: string) => {
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single<DatabaseGame>()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Juego no encontrado')

      setCurrentGame({
        ...gameData,
        players: [],
        stop_countdown: gameData.stop_countdown || 0
      })

      await loadGamePlayers(gameId)
    } catch (error) {
      console.error('Error al cargar el juego:', error)
      throw error
    }
  }

  const leaveGame = async () => {
    if (!currentGame || !user) return

    try {
      const { error } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', currentGame.id)
        .eq('player_id', user.id)

      if (error) throw error

      setCurrentGame(null)
      resetAnswers()
      toast.success('Has salido del juego')
    } catch (error: any) {
      toast.error('Error al salir del juego')
    }
  }

  const startGame = async () => {
    if (!currentGame || !user || currentGame.host_id !== user.id) return

    try {
      const randomLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
      const now = new Date().toISOString()

      // Use type assertion to specify the type of the update
      const { error } = await (supabase
        .from('games')
        .update as any)({
        status: 'playing',
        current_letter: randomLetter,
        current_round: 1,
        updated_at: now
      })
      .eq('id', currentGame.id)

      if (error) throw error
    } catch (error: any) {
      console.error('Error starting game:', error)
      toast.error('Error al iniciar el juego')
    }
  }

  const submitAnswers = async (answers: PlayerAnswers) => {
    if (!currentGame || !user) return

    try {
      const roundAnswers: Database['public']['Tables']['round_answers']['Insert'][] = Object.entries(answers).map(([category, answer]) => ({
        game_id: currentGame.id,
        player_id: user.id,
        round: currentGame.current_round,
        category,
        answer: answer.trim(),
        points: 0
      }))

      const { error } = await insert('round_answers', roundAnswers)

      if (error) throw error

      toast.success('Respuestas enviadas')
    } catch (error: any) {
      console.error('Error submitting answers:', error)
      toast.error('Error al enviar respuestas')
    }
  }

  const callStop = async () => {
    if (!currentGame || !user) return

    try {
      // Update local state to show stop countdown
      setCurrentGame(prev => prev ? { 
        ...prev, 
        stop_countdown: 10 
      } : null);

      // If you need to notify other players, consider using Supabase Realtime
      // or another method that doesn't require a database schema change
      
      toast.success('¡STOP! 10 segundos para terminar')
    } catch (error: any) {
      console.error('Error calling STOP:', error);
      toast.error('Error al llamar STOP')
    }
  }

  // Type-safe update function for game_players
  const updateGamePlayer = async (gameId: string, playerId: string, isReady: boolean) => {
    // Use the HTTP API directly as a workaround for type issues
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/game_players?game_id=eq.${gameId}&player_id=eq.${playerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        is_ready: isReady,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${error}`);
    }
  };

  const setPlayerReady = async (ready: boolean) => {
    if (!currentGame || !user) return;

    try {
      await updateGamePlayer(currentGame.id, user.id, ready);
    } catch (error: any) {
      console.error('Error updating ready status:', error);
      toast.error('Error al actualizar estado');
    }
  }

  const updateAnswer = (category: string, answer: string) => {
    setPlayerAnswers(prev => ({
      ...prev,
      [category]: answer
    }))
  }

  const resetAnswers = () => {
    setPlayerAnswers({})
  }

  const value: GameContextType = {
    currentGame,
    playerAnswers,
    gameLoading,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    submitAnswers,
    callStop,
    setPlayerReady,
    updateAnswer,
    resetAnswers
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}