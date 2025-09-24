import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { GameState, PlayerAnswers, RoundResults, LETTERS } from '../types/game'
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

    const gameChannel = supabase
      .channel(`game:${currentGame.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${currentGame.id}`
      }, handleGameUpdate)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${currentGame.id}`
      }, handlePlayersUpdate)
      .subscribe()

    return () => {
      gameChannel.unsubscribe()
    }
  }, [currentGame?.id])

  const handleGameUpdate = useCallback(async (payload: any) => {
    if (payload.new && currentGame) {
      const updatedGame = { ...currentGame, ...payload.new }
      setCurrentGame(updatedGame)
      
      // Handle different game states
      if (payload.new.status === 'playing' && payload.old?.status === 'waiting') {
        toast.success('¡El juego ha comenzado!')
        resetAnswers()
      }
      
      if (payload.new.current_letter && payload.new.current_letter !== payload.old?.current_letter) {
        toast.success(`Nueva letra: ${payload.new.current_letter}`)
        resetAnswers()
      }
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

      setCurrentGame(prev => prev ? {
        ...prev,
        players: data.map(player => ({
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
      const { error: gameError } = await supabase
        .from('games')
        .insert({
          id: gameId,
          code: gameCode,
          host_id: user.id,
          categories,
          max_rounds: maxRounds,
          status: 'waiting'
        })

      if (gameError) throw gameError

      // Join as host
      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameId,
          player_id: user.id
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
        .select('id')
        .eq('code', code.toUpperCase())
        .eq('status', 'waiting')
        .single()

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
        const { error: playerError } = await supabase
          .from('game_players')
          .insert({
            game_id: gameData.id,
            player_id: user.id
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
        .single()

      if (gameError) throw gameError

      setCurrentGame({
        ...gameData,
        players: []
      })

      await loadGamePlayers(gameId)
    } catch (error) {
      console.error('Error loading game:', error)
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

      const { error } = await supabase
        .from('games')
        .update({
          status: 'playing',
          current_letter: randomLetter,
          current_round: 1
        })
        .eq('id', currentGame.id)

      if (error) throw error
    } catch (error: any) {
      toast.error('Error al iniciar el juego')
    }
  }

  const submitAnswers = async (answers: PlayerAnswers) => {
    if (!currentGame || !user) return

    try {
      const roundAnswers = Object.entries(answers).map(([category, answer]) => ({
        game_id: currentGame.id,
        player_id: user.id,
        round: currentGame.current_round,
        category,
        answer: answer.trim(),
        points: 0
      }))

      const { error } = await supabase
        .from('round_answers')
        .insert(roundAnswers)

      if (error) throw error

      toast.success('Respuestas enviadas')
    } catch (error: any) {
      toast.error('Error al enviar respuestas')
    }
  }

  const callStop = async () => {
    if (!currentGame || !user) return

    try {
      const { error } = await supabase
        .from('games')
        .update({
          stop_countdown: 10
        })
        .eq('id', currentGame.id)

      if (error) throw error

      toast.success('¡STOP! 10 segundos para terminar')
    } catch (error: any) {
      toast.error('Error al llamar STOP')
    }
  }

  const setPlayerReady = async (ready: boolean) => {
    if (!currentGame || !user) return

    try {
      const { error } = await supabase
        .from('game_players')
        .update({ is_ready: ready })
        .eq('game_id', currentGame.id)
        .eq('player_id', user.id)

      if (error) throw error
    } catch (error: any) {
      toast.error('Error al actualizar estado')
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