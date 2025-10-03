import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { supabase, insert } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { GameState, PlayerAnswers, LETTERS, PlayerData, RoundCompletionWithProfile } from '../types/game';
import { RoundCompletion } from '../types/database';
import { useCountdown } from '../hooks/useCountdown';

// Interfaz para el perfil del jugador
interface PlayerProfile {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface DatabaseGame {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'starting' | 'playing' | 'finished'
  current_round_number: number
  current_letter: string | null
  categories: string[]
  max_rounds: number
  round_time_limit: number
  stop_countdown: number
  created_at: string
  updated_at: string
  // Campos para cuenta regresiva de inicio
  starting_countdown?: number
}

interface ActivePlayerWithGame {
  id: string
  game_id: string
  player_id: string
  is_ready: boolean
  score: number
  joined_at: string
  game: DatabaseGame
}

interface GameCategory {
  id: string;
  game_id: string;
  category_id: string;
  created_at: string;
}

interface GameContextType {
  currentGame: GameState | null
  playerAnswers: PlayerAnswers
  gameLoading: boolean
  availableCategories: DBCategory[]
  categoriesLoading: boolean
  roundResults: RoundResults[]
  roundCompletions: RoundCompletionWithProfile[]
  createGame: (categories: string[], maxRounds: number) => Promise<string>
  joinGame: (code: string) => Promise<string>
  leaveGame: () => Promise<void>
  startGame: () => Promise<void>
  updateGameSettings: (settings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  }) => Promise<void>
  submitAnswers: (answers: PlayerAnswers) => Promise<void>
  callStop: () => Promise<void>
  setPlayerReady: (ready: boolean) => Promise<void>
  updateAnswer: (category: string, answer: string) => void
  resetAnswers: () => void
  loadCategories: () => Promise<void>
  checkActiveGame: () => Promise<DatabaseGame | null>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

// Interfaz para la respuesta de la base de datos
export interface DBCategory {
  id: string;
  name: string;
  created_at: string;
}

interface RoundAnswerData {
  id: string;
  game_id: string;
  player_id: string;
  round_number: number;
  category: string;
  answer: string;
  points: number;
  is_unique: boolean;
  created_at: string;
}

interface AnswerWithMetadata {
  id: string;
  player_id: string;
  answer: string;
  points: number;
  is_unique: boolean;
}

interface RoundResults {
  player_id: string;
  player_name?: string;
  answers: {
    [category: string]: {
      answer: string;
      points: number;
      is_unique: boolean;
    }
  };
  total_points: number;
  completed_at?: string;
}

export interface ExistingRoundAnswer {
  category: string;
  answer: string;
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth()
  const [currentGame, setCurrentGame] = useState<GameState | null>(null)
  const [existingRoundAnswers, setExistingRoundAnswers] = useState<ExistingRoundAnswer[]>([])
  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswers>({})
  const [gameLoading, setGameLoading] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<DBCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [roundResults, setRoundResults] = useState<RoundResults[]>([])
  const [roundCompletions, setRoundCompletions] = useState<RoundCompletionWithProfile[]>([])

  // Cargar categorías disponibles
  const loadCategories = useCallback(async () => {
    console.log('Cargando categorías...');
    try {
      setCategoriesLoading(true);

      // Limpiar categorías existentes
      setAvailableCategories([]);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error en la consulta de categorías:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`Categorías cargadas: ${data.length}`);
        setAvailableCategories(data);
      } else {
        console.warn('No se encontraron categorías en la base de datos');
        toast.error('No se encontraron categorías disponibles');
      }
    } catch (error: any) {
      console.error('Error al cargar categorías:', error);
      toast.error(error.message || 'Error al cargar las categorías');
    } finally {
      setCategoriesLoading(false);
    }
  }, [])

  // Cargar categorías al montar el componente
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Función para actualizar el tiempo restante de la ronda
  const updateRoundTimeRemaining = useCallback(async () => {
    if (!currentGame || currentGame.status !== 'playing' || !currentGame.updated_at) return

    // ✅ NO actualizar tiempo si hay STOP activo
    if (currentGame.stop_countdown && currentGame.stop_countdown > 0) {
      return // Salir temprano si hay STOP activo
    }

    const gameStartTime = new Date(currentGame.updated_at).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - gameStartTime) / 1000)
    const remaining = Math.max(0, currentGame.round_time_limit - elapsed)

    if (remaining !== currentGame.round_time_remaining) {
      setCurrentGame(prev => prev ? {
        ...prev,
        round_time_remaining: remaining
      } : null)

      // Notificar a otros jugadores sobre el tiempo restante actualizado
      try {
        const channel = supabase.channel(`game_round_timer_${currentGame.id}`)
        await channel.send({
          type: 'broadcast',
          event: 'round_time_update',
          payload: {
            game_id: currentGame.id,
            round_time_remaining: remaining,
            timestamp: Date.now()
          }
        })
      } catch (error) {
        console.error('Error notifying round time update:', error)
      }
    }
  }, [currentGame])

  // Efecto para actualizar el tiempo restante cada segundo
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'playing') return

    const interval = setInterval(updateRoundTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [currentGame, updateRoundTimeRemaining])

  // Efecto para manejar suscripciones en tiempo real
  useEffect(() => {
    if (!currentGame) return;

    console.log('Iniciando suscripciones para el juego:', currentGame.id);

    // Suscripción a cambios en los jugadores del juego
    const playersSubscription = supabase
      .channel(`game_players_${currentGame.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${currentGame.id}`
        },
        async (payload) => {
          // Recargar la lista de jugadores inmediatamente
          if (currentGame.id) {
            await loadGamePlayers(currentGame.id);
          }

          // Mostrar notificación cuando un jugador nuevo se una
          if (payload.eventType === 'INSERT' && payload.new) {
            const { data: playerProfile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.player_id)
              .single<PlayerProfile>();

            if (playerProfile && !error) {
              toast.success(`${playerProfile.full_name || 'Un jugador'} se ha unido al juego`);
            } else if (error) {
              console.error('Error al cargar el perfil del jugador:', error);
            }
          }

          // Mostrar notificación cuando un jugador se retire
          if (payload.eventType === 'DELETE' && payload.old) {
            const { data: playerProfile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.old.player_id)
              .single<PlayerProfile>();

            if (playerProfile && !error) {
              toast.success(`${playerProfile.full_name || 'Un jugador'} salió del juego 👋`);
            } else if (error) {
              console.error('Error al cargar el perfil del jugador:', error);
            }
          }
        }
      )
      .on('broadcast', { event: 'player_left' }, (payload) => {
        // Si el jugador que se va no soy yo, recargar la lista
        if (payload.payload.player_id !== user?.id && payload.payload.game_id === currentGame?.id) {
          loadGamePlayers(payload.payload.game_id);
        }
      })
      .on('broadcast', { event: 'settings_updated' }, (payload) => {
        // Si la actualización no viene de mí mismo, aplicar los cambios
        if (payload.payload.game_id === currentGame?.id) {
          setCurrentGame(prev => prev ? {
            ...prev,
            max_rounds: payload.payload.settings.max_rounds,
            round_time_limit: payload.payload.settings.round_time_limit,
            stop_countdown: payload.payload.settings.stop_countdown,
            updated_at: new Date().toISOString()
          } : null);
        }
      })
      .subscribe((status) => {
        console.log(`Estado de la suscripción al juego ${currentGame?.id}:`, status);
      });

    // Suscripción a cambios en el estado del juego
    const gameSubscription = supabase
      .channel(`game_state_${currentGame?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${currentGame.id}`
        },
        async (payload) => {
          console.log('Cambio en el estado del juego:', payload);

          if (payload.eventType === 'UPDATE') {
            // Actualizar el estado local del juego
            setCurrentGame(prev => {
              if (!prev) return null;

              // Si el juego está iniciando (waiting + starting_countdown)
              if (payload.new.status === 'waiting' && payload.old?.status === 'waiting' && payload.new.starting_countdown) {
                toast.success('¡Iniciando cuenta regresiva!', { duration: 2000 });
                resetAnswers();
              }

              // Si el juego acaba de comenzar
              if (payload.new.status === 'playing' && payload.old?.status === 'waiting') {
                toast.success('¡El juego ha comenzado!', { duration: 3000 });
                resetAnswers();
              }

              // Si el juego ha terminado
              if (payload.new.status === 'finished' && prev.status !== 'finished') {
                toast('La partida ha terminado', { icon: '🏁' });
              }

              return { ...prev, ...payload.new };
            });
          }

          // Mostrar notificación cuando el juego se ha eliminado
          if (payload.eventType === 'DELETE') {
            toast.error('La partida fue eliminada por el anfitrión');
            setCurrentGame(null);
          }
        }
      )
      .on('broadcast', { event: 'game_started' }, (payload) => {
        console.log('🎉 Game started broadcast received:', payload)
        if (payload.payload.game_id === currentGame.id) {
          console.log('✅ Actualizando estado del juego para:', payload.payload.game_id)
          // Actualizar el estado local del juego
          setCurrentGame(prev => prev ? {
            ...prev,
            status: payload.payload.status,
            current_letter: payload.payload.current_letter,
            current_round: payload.payload.current_round,
            current_round_number: payload.payload.current_round,
            updated_at: new Date().toISOString(),
            round_time_remaining: prev.round_time_limit
          } : null)

          toast.success('¡El juego ha comenzado!', { duration: 3000 })
          resetAnswers()
        }
      })

    // Suscripción a cambios en las respuestas de los jugadores
    const answersSubscription = supabase
      .channel(`game_answers_${currentGame.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_answers',
          filter: `game_id=eq.${currentGame.id}`
        },
        (payload) => {
          console.log('Cambio en respuestas:', payload);
          // Recalcular puntos cuando se detecte un cambio en respuestas
          if (currentGame && payload.eventType === 'INSERT') {
            const roundNumber = currentGame.current_round_number || currentGame.current_round || 1;
            // Recalcular puntos para manejar duplicados correctamente
            recalculatePointsForDuplicates(currentGame.id, roundNumber);
          }
        }
      )
      .subscribe();

    // Suscripción a cambios en completaciones de rondas
    const completionsSubscription = supabase
      .channel(`game_completions_${currentGame.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'round_completions',
          filter: `game_id=eq.${currentGame.id}`
        },
        (payload) => {
          console.log('Cambio en completaciones de ronda:', payload);
          // Actualizar resultados cuando se registra una nueva completación
          if (currentGame && payload.eventType === 'INSERT') {
            const roundNumber = currentGame.current_round_number || currentGame.current_round || 1;
            loadRoundResults(currentGame.id, roundNumber);
          }
        }
      )
      .on('broadcast', { event: 'countdown_start' }, (payload) => {
        console.log('Countdown started:', payload)
        // Solo iniciar cuenta regresiva si no es el anfitrión quien la inició
        if (payload.payload.game_id === currentGame.id && user?.id !== currentGame.host_id) {
          const elapsed = Math.floor((Date.now() - payload.payload.timestamp) / 1000)
          const countdownValue = Math.max(0, 10 - elapsed)

          setCurrentGame(prev => prev ? {
            ...prev,
            starting_countdown: countdownValue,
            updated_at: new Date().toISOString()
          } : null)
          toast.success('¡Iniciando cuenta regresiva!', { duration: 2000 })
        }
      })
      .on('broadcast', { event: 'game_started' }, (payload) => {
        console.log('🎉 Game started broadcast received:', payload)
        if (payload.payload.game_id === currentGame.id) {
          console.log('✅ Actualizando estado del juego para:', payload.payload.game_id)
          // Actualizar el estado local del juego
          setCurrentGame(prev => prev ? {
            ...prev,
            status: payload.payload.status,
            current_letter: payload.payload.current_letter,
            current_round: payload.payload.current_round,
            current_round_number: payload.payload.current_round,
            updated_at: new Date().toISOString(),
            round_time_remaining: prev.round_time_limit
          } : null)

          toast.success('¡El juego ha comenzado!', { duration: 3000 })
          resetAnswers()
        }
      })
      .subscribe((status) => {
        console.log(`Estado de la suscripción countdown ${currentGame?.id}:`, status);
      });

    // Suscripción para eventos de jugadores (STOP, configuración, etc.)
    const playersChannel = supabase
      .channel(`game_players_${currentGame.id}`)
      .on('broadcast', { event: 'stop_called' }, (payload) => {
        if (payload.payload.game_id === currentGame.id) {
          const stopCountdown = payload.payload.stop_countdown
          const newTimeRemaining = payload.payload.round_time_remaining
          const currentTimeRemaining = currentGame?.round_time_remaining || stopCountdown

          // ✅ Usar el valor que viene del payload (ya calculado correctamente)
          setCurrentGame(prev => prev ? {
            ...prev,
            stop_countdown: stopCountdown,
            round_time_remaining: newTimeRemaining
          } : null)

          toast.success(`¡STOP! ${newTimeRemaining} segundos para terminar`)
        }
      })
      .on('broadcast', { event: 'settings_updated' }, (payload) => {
        if (payload.payload.game_id === currentGame.id) {
          const settings = payload.payload.settings

          setCurrentGame(prev => prev ? {
            ...prev,
            ...settings,
            updated_at: new Date().toISOString()
          } : null)

          toast.success('Configuración del juego actualizada')
        }
      })
      .subscribe()

    // Suscripción para eventos de tiempo restante de ronda
    const roundTimerChannel = supabase
      .channel(`game_round_timer_${currentGame.id}`)
      .on('broadcast', { event: 'round_time_update' }, (payload) => {
        if (payload.payload.game_id === currentGame.id) {
          // ✅ NO actualizar si hay STOP activo
          if (currentGame?.stop_countdown && currentGame.stop_countdown > 0) {
            return // Ignorar actualizaciones de tiempo si hay STOP activo
          }

          setCurrentGame(prev => prev ? {
            ...prev,
            round_time_remaining: payload.payload.round_time_remaining
          } : null)
        }
      })
      .subscribe()

    // Limpieza al desmontar
    return () => {
      console.log('Limpiando suscripciones')
      supabase.removeChannel(playersSubscription)
      supabase.removeChannel(gameSubscription)
      supabase.removeChannel(answersSubscription)
      supabase.removeChannel(completionsSubscription)
      supabase.removeChannel(playersChannel)
      supabase.removeChannel(roundTimerChannel)
    };
  }, [currentGame?.id])

  const handleGameUpdate = useCallback((payload: any) => {
    if (!payload.new) return;

    setCurrentGame(prev => {
      const newGame = {
        ...(prev || {}),
        ...payload.new,
        // Make sure players array is preserved if not in the update
        players: prev?.players || []
      };

      return newGame;
    });

    // Handle different game states
    if (payload.new.status === 'starting' && payload.old?.status === 'waiting') {
      toast.success('¡Iniciando cuenta regresiva!', { duration: 2000 });
      resetAnswers();
    }

    if (payload.new.status === 'playing' && payload.old?.status === 'waiting') {
      toast.success('¡El juego ha comenzado!');
      resetAnswers();
    }

    if (payload.new.current_letter && payload.new.current_letter !== payload.old?.current_letter) {
      toast.success(`Nueva letra: ${payload.new.current_letter}`);
      resetAnswers();
    }
  }, [currentGame?.id])

  // Efecto para manejar polling del estado del juego (fallback si Realtime falla)
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'waiting' || !currentGame.starting_countdown) return

    const pollInterval = setInterval(async () => {
      try {
        const { data: gameData, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', currentGame.id)
          .single<DatabaseGame>()

        if (error) {
          console.error('Error polling game state:', error)
          return
        }

        if (gameData && gameData.status === 'playing' && gameData.current_letter) {
          // Actualizar el estado local del juego
          setCurrentGame(prev => prev ? {
            ...prev,
            ...gameData,
            categories: prev.categories, // Preservar categorías
            players: prev.players, // Preservar jugadores
            // ✅ NO revertir round_time_remaining si hay STOP activo
            round_time_remaining: (gameData as any).round_time_remaining || prev.round_time_limit
          } : null)

          toast.success('¡El juego ha comenzado!', { duration: 3000 })
          resetAnswers()

          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error in polling:', error)
      }
    }, 1000) // Verificar cada segundo

    return () => {
      clearInterval(pollInterval)
    }
  }, [currentGame?.id, currentGame?.status, currentGame?.starting_countdown])

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
        players: [...playersData.map(player => ({
          id: player.id,
          player_id: player.player_id,
          profile: player.profile,
          score: player.score,
          is_ready: player.is_ready,
          joined_at: player.joined_at
        }))]
      } : null)
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }

  const loadRoundResults = async (gameId: string, roundNumber: number) => {
    try {
      // Cargar completaciones de jugadores para esta ronda
      const { data: completionsData, error: completionsError } = await supabase
        .from('round_completions')
        .select(`
          *,
          profile:profiles(full_name, avatar_url, email)
        `)
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)
        .order('completed_at', { ascending: true }) as { data: RoundCompletionWithProfile[] | null; error: any };

      if (completionsError) {
        console.error('Error loading round completions:', completionsError)
        return
      }

      if (completionsData && completionsData.length > 0) {
        // Cargar respuestas de jugadores que han terminado
        const { data: answersData, error: answersError } = await supabase
          .from('round_answers')
          .select('*')
          .eq('game_id', gameId)
          .eq('round_number', roundNumber)
          .in('player_id', completionsData.map(c => c.player_id)) as { data: RoundAnswerData[] | null; error: any };

        if (answersError) {
          console.error('Error loading round answers:', answersError)
          return
        }

        // Crear mapa de respuestas por jugador
        const answersByPlayer = new Map<string, any[]>()
        ;(answersData || []).forEach(answer => {
          if (!answersByPlayer.has(answer.player_id)) {
            answersByPlayer.set(answer.player_id, [])
          }
          answersByPlayer.get(answer.player_id)!.push(answer)
        })

        // Crear resultados formateados
        const results: RoundResults[] = completionsData.map(completion => {
          const playerAnswers = answersByPlayer.get(completion.player_id) || []
          const answersMap: { [category: string]: { answer: string; points: number; is_unique: boolean } } = {}
          let totalPoints = 0

          playerAnswers.forEach(answer => {
            answersMap[answer.category] = {
              answer: answer.answer,
              points: answer.points || 0,
              is_unique: answer.is_unique || false
            }
            totalPoints += answer.points || 0
          })

          return {
            player_id: completion.player_id,
            player_name: (completion as any).profile?.full_name || 'Jugador',
            answers: answersMap,
            total_points: totalPoints,
            completed_at: completion.completed_at
          }
        })

        setRoundResults(results)
        setRoundCompletions(completionsData as RoundCompletionWithProfile[])
      } else {
        // Si no hay completaciones, limpiar resultados
        setRoundResults([])
        setRoundCompletions([])
      }
    } catch (error) {
      console.error('Error loading round results:', error)
    }
  }

  const generateGameCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Función para calcular puntos proporcionalmente basado en respuestas duplicadas
  const calculatePoints = (totalDuplicates: number): number => {
    if (totalDuplicates <= 1) return 100 // Respuesta única = 100 puntos
    return Math.floor(100 / totalDuplicates) // Dividir 100 puntos entre la cantidad de respuestas idénticas
  }

  // Función para recalcular puntos cuando se detectan duplicados posteriormente
  const recalculatePointsForDuplicates = async (gameId: string, roundNumber: number) => {
    try {
      // Obtener todas las respuestas de esta ronda
      const { data: allRoundAnswers, error } = await supabase
        .from('round_answers')
        .select('id, player_id, category, answer, points, is_unique')
        .eq('game_id', gameId)
        .eq('round_number', roundNumber) as { data: RoundAnswerData[] | null; error: any };

      if (error || !allRoundAnswers) {
        console.error('Error loading answers for recalculation:', error)
        return
      }

      // Crear mapa para agrupar respuestas por categoría y respuesta (ignorando mayúsculas/minúsculas y espacios)
      const answersByCategoryAndResponse = new Map<string, AnswerWithMetadata[]>()

      allRoundAnswers.forEach((answer: RoundAnswerData) => {
        const key = `${answer.category}:${answer.answer.toLowerCase().trim()}`
        if (!answersByCategoryAndResponse.has(key)) {
          answersByCategoryAndResponse.set(key, [])
        }
        answersByCategoryAndResponse.get(key)!.push({
          id: answer.id,
          player_id: answer.player_id,
          answer: answer.answer,
          points: answer.points,
          is_unique: answer.is_unique
        })
      })

      // Actualizar puntos para respuestas duplicadas
      const updatePromises = []

      for (const [key, answerList] of answersByCategoryAndResponse) {
        if (answerList.length > 1) {
          // Esta respuesta aparece múltiples veces, calcular puntos proporcionales
          const correctPoints = calculatePoints(answerList.length)

          // Actualizar cada respuesta duplicada con los puntos correctos
          for (const answer of answerList) {
            // Siempre actualizar si los puntos no son correctos O si is_unique no es false
            if (answer.points !== correctPoints || answer.is_unique !== false) {
              updatePromises.push(
                (supabase as any)
                  .from('round_answers')
                  .update({
                    points: correctPoints,
                    is_unique: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', answer.id)
              )
            }
          }

          console.log(`Recalculated points for ${answerList.length} duplicate answers in ${key}: ${correctPoints} points each`)
        } else {
          // Respuesta única, asegurar que tenga 100 puntos y esté marcada como única
          const uniqueAnswer = answerList[0]
          if (uniqueAnswer.points !== 100 || uniqueAnswer.is_unique !== true) {
            updatePromises.push(
              (supabase as any)
                .from('round_answers')
                .update({
                  points: 100,
                  is_unique: true,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', uniqueAnswer.id)
            )
          }
        }
      }

      // Ejecutar todas las actualizaciones
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
        console.log(`Updated points for ${updatePromises.length} answers`)

        // Recargar resultados después de actualizar puntos
        await loadRoundResults(gameId, roundNumber)
      }
    } catch (error) {
      console.error('Error recalculating points:', error)
    }
  }

  const checkActiveGame = async () => {
    if (!user) return null;

    try {
      // Buscar si el usuario está participando en algún juego activo
      const { data: activePlayer, error } = await supabase
        .from('game_players')
        .select(`
          *,
          game:games(*)
        `)
        .eq('player_id', user.id)
        .single() as { data: ActivePlayerWithGame | null; error: any };

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking active game:', error);
        return null;
      }

      if (activePlayer?.game) {
        const game = activePlayer.game;

        // Reconectar si el juego está activo (waiting, starting, playing) o terminado (finished)
        // Los juegos terminados necesitan ser visibles en la pantalla de resultados
        if (['waiting', 'starting', 'playing', 'finished'].includes(game.status)) {
          console.log('Found game, reconnecting:', game.id, 'Status:', game.status);

          // Cargar el juego completo
          await joinGameById(game.id);
          return game;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking active game:', error);
      return null;
    }
  };

  const createGame = async (categories: string[], maxRounds: number): Promise<string> => {
    // Verificar que el usuario esté autenticado
    const currentUser = user;
    if (!currentUser) throw new Error('User not authenticated');

    setGameLoading(true);
    try {
      const gameCode = generateGameCode();
      const gameId = uuidv4();
      const now = new Date().toISOString();

      // 1. Primero, insertar el juego con solo los campos mínimos requeridos
      const minimalGameData = {
        id: gameId,
        code: gameCode,
        host_id: currentUser.id,
        status: 'waiting' as const,
        created_at: now,
        updated_at: now,
        current_round: 1,
        current_letter: null,
        max_rounds: maxRounds,
        round_time_limit: 120,
        stop_countdown: 0
      };

      console.log('Creating game with data:', minimalGameData);

      // Insertar el juego con solo los campos mínimos
      const { error } = await supabase
        .from('games')
        .insert([minimalGameData] as any);

      if (error) {
        console.error('Error creating game:', error);
        throw new Error(`No se pudo crear la partida: ${error.message}`);
      }

      console.log('Game created successfully');

      // 2. Guardar las categorías en la tabla game_categories
      const categoriesToInsert = categories.map(category => ({
        game_id: gameId,
        category_id: category,
        created_at: now
      }));

      // Insertar cada categoría por separado para evitar problemas de tipos
      for (const category of categoriesToInsert) {
        const { error: categoryError } = await supabase
          .from('game_categories')
          .insert([category] as any);

        if (categoryError) {
          console.error('Error saving category:', category, categoryError);
          // Continuar con las demás categorías
        }
      }

      // 3. Unir al jugador como anfitrión
      const { error: playerError } = await insert('game_players', {
        game_id: gameId,
        player_id: currentUser.id,
        is_ready: false,
        score: 0,
        joined_at: now
      });

      if (playerError) {
        console.error('Error joining game as host:', playerError);
        throw new Error('No se pudo unir a la partida como anfitrión');
      }

      // 4. Crear un objeto de juego local con todos los campos necesarios
      const localGameState: GameState = {
        ...minimalGameData,
        categories: categories,
        current_round_number: 0, // Inicializar en 0
        players: [
          {
            id: currentUser.id,
            player_id: currentUser.id,
            profile: {
              id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || null,
              avatar_url: currentUser.user_metadata?.avatar_url || null,
              email: currentUser.email || ''
            },
            score: 0,
            is_ready: false,
            joined_at: new Date().toISOString()
          }
        ]
      };

      // 5. Actualizar el estado local
      setCurrentGame(localGameState);

      // 6. Cargar el juego completo
      await joinGameById(gameId);

      // 7. Retornar el código del juego para la navegación
      return gameCode;
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
      // 1. Buscar el juego por código
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('status', 'waiting')
        .single()

      if (gameError || !gameData) {
        throw new Error('Juego no encontrado o ya iniciado')
      }

      // 2. Obtener las categorías del juego
      const gameId = (gameData as any).id;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('game_categories')
        .select('*')
        .eq('game_id', gameId) as { data: GameCategory[] | null; error: any };

      const categories = categoriesError || !categoriesData
        ? []
        : categoriesData.map(cat => cat.category_id);

      // 3. Verificar si el usuario ya está unido al juego
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', user.id)
        .single()

      if (!existingPlayer) {
        // Unirse al juego
        const { error: playerError } = await insert('game_players', {
          game_id: gameId,
          player_id: user.id,
          is_ready: false,
          score: 0,
          joined_at: new Date().toISOString()
        });

        if (playerError) throw playerError;
      }

      // 4. Cargar el juego completo con jugadores y categorías
      await joinGameById(gameId, categories);

      // 5. Retornar el código del juego para la navegación
      return code.toUpperCase();
    } catch (error: any) {
      console.error('Error al unirse al juego:', error);
      toast.error(error.message || 'Error al unirse al juego');
      throw error;
    } finally {
      setGameLoading(false);
    }
  }

  const joinGameById = async (gameId: string, initialCategories: string[] = []) => {
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single<DatabaseGame>()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Juego no encontrado')

      // Si no se proporcionaron categorías, intentar cargarlas
      let categoriesToUse = [...initialCategories];
      if (categoriesToUse.length === 0) {
        const { data: categoriesData } = await supabase
          .from('game_categories')
          .select('*')
          .eq('game_id', gameId) as { data: GameCategory[] | null };

        if (categoriesData) {
          categoriesToUse = categoriesData.map(cat => cat.category_id);
        }
      }

      // Calcular tiempo restante de la ronda si el juego está jugando
      let roundTimeRemaining = undefined;
      if (gameData.status === 'playing' && gameData.updated_at) {
        // ✅ NO usar stop_countdown para determinar el tiempo restante
        // ✅ Siempre calcular basado en tiempo transcurrido desde que empezó el juego
        const gameStartTime = new Date(gameData.updated_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - gameStartTime) / 1000);
        roundTimeRemaining = Math.max(0, gameData.round_time_limit - elapsed);

        console.log('⏰ Cálculo de tiempo restante:', {
          gameStartTime: gameData.updated_at,
          now: new Date().toISOString(),
          elapsed,
          roundTimeLimit: gameData.round_time_limit,
          roundTimeRemaining,
          stopCountdown: gameData.stop_countdown,
          roundTimeRemainingFromDB: (gameData as any).round_time_remaining
        });
      }

      setCurrentGame({
        ...gameData,
        categories: categoriesToUse,
        players: [],
        stop_countdown: gameData.stop_countdown || 0,
        current_round_number: gameData.current_round_number || 0,
        // ✅ Mantener round_time_remaining si existe, sino calcularlo
        round_time_remaining: (gameData as any).round_time_remaining || roundTimeRemaining
      });

      await loadGamePlayers(gameId);
    } catch (error) {
      console.error('Error al cargar el juego:', error);
      throw error;
    }
  }

  const leaveGame = async () => {
    if (!currentGame || !user) return;

    try {
      // Verificar si el usuario es el anfitrión
      const isHost = currentGame.host_id === user.id;

      // Eliminar al jugador de la partida
      const { error: playerError } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', currentGame.id)
        .eq('player_id', user.id);

      if (playerError) throw playerError;

      // Si el anfitrión abandona, eliminar la partida
      if (isHost) {
        // Primero eliminamos a todos los jugadores
        const { error: deletePlayersError } = await supabase
          .from('game_players')
          .delete()
          .eq('game_id', currentGame.id);

        if (deletePlayersError) throw deletePlayersError;

        // Eliminamos las categorías asociadas a la partida
        const { error: deleteCategoriesError } = await supabase
          .from('game_categories')
          .delete()
          .eq('game_id', currentGame.id);

        if (deleteCategoriesError) throw deleteCategoriesError;

        // Luego eliminamos la partida
        const { error: deleteGameError } = await supabase
          .from('games')
          .delete()
          .eq('id', currentGame.id);

        if (deleteGameError) throw deleteGameError;

        toast.success('La partida ha sido eliminada');
      } else {
        // Notificar a otros jugadores que este jugador se va
        await notifyPlayerLeft();

        toast.success('Has salido de la partida');
      }

      // Limpiar el estado local DESPUÉS de notificar a otros jugadores
      setTimeout(() => {
        setCurrentGame(null);
        resetAnswers();
      }, 100);
    } catch (error: any) {
      console.error('Error al salir del juego:', error);
      toast.error(error.message || 'Error al salir del juego');
    }
  }

  const updateGameSettings = async (settings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  }) => {
    if (!currentGame || !user || currentGame.host_id !== user.id) return;

    try {
      const now = new Date().toISOString();

      // Actualizar el estado local inmediatamente para una mejor experiencia de usuario
      setCurrentGame(prev => prev ? {
        ...prev,
        max_rounds: settings.max_rounds,
        round_time_limit: settings.round_time_limit,
        stop_countdown: settings.stop_countdown,
        updated_at: now
      } : null);

      // Actualizar la base de datos usando una consulta SQL directa
      const { error } = await supabase.rpc('update_game_settings', {
        p_game_id: currentGame.id,
        p_max_rounds: settings.max_rounds,
        p_round_time_limit: settings.round_time_limit,
        p_stop_countdown: settings.stop_countdown
      });

      if (error) {
        // Revertir el estado local si hay un error
        setCurrentGame(prev => prev ? {
          ...prev,
          max_rounds: currentGame.max_rounds,
          round_time_limit: currentGame.round_time_limit,
          stop_countdown: currentGame.stop_countdown
        } : null);
        throw error;
      }

      // Notificar a otros jugadores sobre la actualización de configuración
      await notifyGameSettingsUpdate(settings);

      // Notificar al usuario
      toast.success('Configuración actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating game settings:', error);
      toast.error(error.message || 'Error al actualizar la configuración del juego');
      throw error;
    }
  };

  // Hook para manejar la sincronización del countdown entre jugadores
  const { notifyCountdownStartToOthers } = useCountdown({
    gameId: currentGame?.id || '',
    hostId: currentGame?.host_id || '',
    userId: user?.id || '',
    onCountdownEnd: () => {
      // La cuenta regresiva terminó, iniciar el juego
      startActualGame();
    },
    onCountdownUpdate: (countdown: number) => {
      setCurrentGame(prev => prev ? {
        ...prev,
        starting_countdown: countdown,
        updated_at: new Date().toISOString()
      } : null);
    }
  });

  // Función para iniciar la secuencia de cuenta regresiva
  const startGameSequence = async () => {
    if (!currentGame || !user || currentGame.host_id !== user.id) return

    try {
      const now = new Date().toISOString()

      // Actualizar el estado local inmediatamente para una mejor experiencia de usuario
      setCurrentGame(prev => prev ? {
        ...prev,
        status: 'waiting', // Mantener como waiting durante la cuenta regresiva
        starting_countdown: 10,
        updated_at: now
      } : null)

      // Actualizar la base de datos
      const { error } = await (supabase
        .from('games')
        .update as any)({
          status: 'waiting', // Mantener como waiting en BD durante cuenta regresiva
          updated_at: now
        })
        .eq('id', currentGame.id)

      if (error) {
        // Revertir el estado local si hay un error
        setCurrentGame(prev => prev ? {
          ...prev,
          status: 'waiting'
        } : null)
        throw error
      }

      // Mostrar notificación solo para el anfitrión
      if (user?.id === currentGame.host_id) {
        toast.success('¡Preparándose para iniciar el juego!', { duration: 3000 })
      }
    } catch (error: any) {
      console.error('Error starting game sequence:', error)
      toast.error(error.message || 'Error al iniciar la cuenta regresiva')
    }
  }

  // Función para notificar a otros jugadores sobre el inicio de cuenta regresiva
  const notifyCountdownStart = async () => {
    if (!currentGame) return

    try {
      const channel = supabase.channel(`game_countdown_${currentGame.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'countdown_start',
        payload: {
          game_id: currentGame.id,
          starting_countdown: 10,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error al notificar inicio de countdown:', error)
    }
  }

  // Función para notificar a otros jugadores que un usuario se va
  const notifyPlayerLeft = async () => {
    if (!currentGame || !user) return

    try {
      const channel = supabase.channel(`game_players_${currentGame.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: {
          game_id: currentGame.id,
          player_id: user.id,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error al notificar salida de usuario:', error)
    }
  }

  // Función para notificar cambios en la configuración del juego
  const notifyGameSettingsUpdate = async (settings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  }) => {
    if (!currentGame) return

    try {
      const channel = supabase.channel(`game_players_${currentGame.id}`)
      await channel.send({
        type: 'broadcast',
        event: 'settings_updated',
        payload: {
          game_id: currentGame.id,
          settings: settings,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error al notificar actualización de configuración:', error)
    }
  }
  // Función que realmente inicia el juego después de la cuenta regresiva
  const startActualGame = async () => {
    if (!currentGame || !user) return

    try {
      const now = new Date().toISOString()
      const currentRound = 1;
      const gameId = currentGame.id;
      const isHost = currentGame.host_id === user.id;

      let randomLetter: string;

      // Solo el anfitrión genera la letra
      if (isHost) {
        randomLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
      } else {
        // Los otros jugadores esperan la letra del anfitrión
        return // Salir temprano, la sincronización vendrá por suscripción
      }

      // Actualizar el estado local inmediatamente para una mejor experiencia de usuario
      setCurrentGame(prev => prev ? {
        ...prev,
        status: 'playing',
        starting_countdown: undefined,
        current_letter: randomLetter,
        current_round: currentRound,
        current_round_number: currentRound,
        updated_at: now,
        round_time_remaining: prev.round_time_limit // Inicializar tiempo de ronda
      } : null)

      // Si soy el anfitrión, actualizar también la base de datos
      if (isHost) {
        const { error } = await (supabase
          .from('games')
          .update as any)({
            status: 'playing',
            current_letter: randomLetter,
            current_round: currentRound,
            updated_at: now
          })
          .eq('id', gameId)

        if (error) {
          console.error('Error actualizando BD:', error)
          // Revertir el estado local si hay un error
          setCurrentGame(prev => prev ? {
            ...prev,
            status: 'waiting',
            starting_countdown: 10,
            current_letter: null,
            current_round: 0
          } : null)
          throw error
        }

        // Notificar manualmente a todos los jugadores sobre el inicio del juego
        try {
          // Usar el mismo canal que ya funciona para countdown
          const channel = supabase.channel(`game_countdown_${gameId}`)

          // Pequeño retardo para asegurar que todos estén suscritos
          await new Promise(resolve => setTimeout(resolve, 500))

          await channel.send({
            type: 'broadcast',
            event: 'game_started',
            payload: {
              game_id: gameId,
              status: 'playing',
              current_letter: randomLetter,
              current_round: currentRound,
              timestamp: Date.now()
            }
          })
        } catch (broadcastError) {
          console.error('Error broadcasting game start:', broadcastError)
          // No fallar si el broadcast falla, la BD ya está actualizada
        }
      }

      // Mostrar notificación (solo el anfitrión muestra el toast, otros lo reciben por suscripción)
      if (isHost) {
        toast.success('¡El juego ha comenzado!', { duration: 3000 })
      }
    } catch (error: any) {
      console.error('Error starting actual game:', error)
      toast.error(error.message || 'Error al iniciar el juego')
    }
  }

  const submitAnswers = async (answers: PlayerAnswers) => {
    if (!currentGame || !user) {
      console.error('No current game or user');
      return;
    }

    try {
      const currentRoundNumber = currentGame.current_round_number || currentGame.current_round || 1;

      // Verificar que no haya respuestas ya enviadas para esta ronda por este jugador
      const { data: existingAnswers } = await supabase
        .from('round_answers')
        .select('id')
        .eq('game_id', currentGame.id)
        .eq('player_id', user.id)
        .eq('round_number', currentRoundNumber)
        .limit(1)

      if (existingAnswers && existingAnswers.length > 0) {
        console.log('Respuestas ya enviadas para esta ronda')
        return
      }

      // Verificar que tengamos respuestas para enviar
      if (Object.keys(answers).length === 0) {
        console.warn('No answers to submit');
        return;
      }

      // Obtener respuestas existentes para esta ronda para calcular is_unique correctamente
      const { data: existingRoundAnswers } = await supabase
        .from('round_answers')
        .select('category, answer')
        .eq('game_id', currentGame.id)
        .eq('round_number', currentRoundNumber) as { data: ExistingRoundAnswer[] | null; error: any };

      // Crear mapa de respuestas existentes por categoría para verificar unicidad
      const existingAnswersByCategory = new Map<string, Set<string>>();
      (existingRoundAnswers || []).forEach(answer => {
        if (!existingAnswersByCategory.has(answer.category)) {
          existingAnswersByCategory.set(answer.category, new Set());
        }
        existingAnswersByCategory.get(answer.category)!.add(answer.answer.toLowerCase().trim());
      });

      // Crear el objeto de respuesta con los nombres de columna correctos y calcular puntos proporcionalmente
      const roundAnswers = Object.entries(answers).map(([category, answer]) => {
        const trimmedAnswer = answer.trim().toLowerCase();
        const categoryAnswers = existingAnswersByCategory.get(category) || new Set();

        // Contar respuestas existentes idénticas (incluyendo la nueva)
        let totalDuplicates = 1; // Contamos nuestra propia respuesta

        // Buscar respuestas existentes idénticas en esta categoría
        for (const existingAnswer of categoryAnswers) {
          if (existingAnswer === trimmedAnswer) {
            totalDuplicates++;
          }
        }

        const isUnique = totalDuplicates === 1;
        const correctPoints = calculatePoints(totalDuplicates);

        return {
          game_id: currentGame.id,
          player_id: user.id,
          round_number: currentRoundNumber,
          category: category,
          answer: answer.trim(),
          points: correctPoints,
          is_unique: isUnique,
          created_at: new Date().toISOString()
        };
      });

      // Insertar las respuestas usando la función insert del helper
      const { data, error } = await insert('round_answers', roundAnswers);

      if (error) {
        console.error('Database error details:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Después de insertar, verificar respuestas no únicas y actualizar todas las respuestas duplicadas
      if (data && Array.isArray(data) && (data as any[]).length > 0) {
        // Obtener todas las respuestas de esta ronda incluyendo las recién insertadas
        const { data: allRoundAnswers } = await supabase
          .from('round_answers')
          .select('id, category, answer, is_unique, points')
          .eq('game_id', currentGame.id)
          .eq('round_number', currentRoundNumber) as { data: Array<{id: string, category: string, answer: string, is_unique: boolean, points: number}> | null; error: any };

        if (allRoundAnswers) {
          // Crear mapa para agrupar respuestas por categoría y respuesta
          const answersByCategoryAndResponse = new Map<string, Array<{id: string, is_unique: boolean, points: number}>>();

          allRoundAnswers.forEach(answer => {
            const key = `${answer.category}:${answer.answer.toLowerCase().trim()}`;
            if (!answersByCategoryAndResponse.has(key)) {
              answersByCategoryAndResponse.set(key, []);
            }
            answersByCategoryAndResponse.get(key)!.push({
              id: answer.id,
              is_unique: answer.is_unique,
              points: answer.points
            });
          });

          // Actualizar respuestas que tienen duplicados con puntos proporcionales
          for (const [key, answerList] of answersByCategoryAndResponse) {
            if (answerList.length > 1) {
              // Esta respuesta aparece múltiples veces, calcular puntos proporcionales
              const correctPoints = calculatePoints(answerList.length);

              // Actualizar cada respuesta duplicada con los puntos correctos
              const updatePromises = answerList.map(answer =>
                (supabase as any)
                  .from('round_answers')
                  .update({
                    points: correctPoints,
                    is_unique: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', answer.id)
              );

              await Promise.all(updatePromises);
              console.log(`Updated ${answerList.length} duplicate answers for ${key} to ${correctPoints} points each`);
            }
          }
        }
      }

      // Marcar al jugador como terminado en esta ronda (tanto para STOP manual como automático)
      // Verificar si el jugador ya está marcado como completado para evitar duplicados
      const { data: existingCompletion } = await supabase
        .from('round_completions')
        .select('id')
        .eq('game_id', currentGame.id)
        .eq('player_id', user.id)
        .eq('round_number', currentRoundNumber)
        .limit(1)

      if (!existingCompletion || existingCompletion.length === 0) {
        try {
          await insert('round_completions', {
            game_id: currentGame.id,
            player_id: user.id,
            round_number: currentRoundNumber,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })
          console.log('Jugador marcado como terminado en round_completions')

          // Cargar resultados inmediatamente después de marcar como completado
          await loadRoundResults(currentGame.id, currentRoundNumber)
        } catch (completionError) {
          console.error('Error marking player as completed:', completionError)
          // No fallar si no se puede marcar como completado, continuar con el proceso normal
        }
      }

      toast.success('Respuestas enviadas');
    } catch (error: any) {
      console.error('Error submitting answers:', error);
      toast.error(error.message || 'Error al enviar respuestas');
      throw error; // Re-throw to allow component-level handling
    }
  }

  const callStop = async () => {
    if (!currentGame || !user) return

    try {
      const stopCountdownValue = currentGame.stop_countdown || 10 // Valor configurado
      const currentTimeRemaining = currentGame.round_time_remaining || stopCountdownValue

      // Verificar si ya hay un STOP activo
      const isStopActive = currentGame.stop_countdown > 0 &&
                          currentGame.round_time_remaining === currentGame.stop_countdown

      if (isStopActive) {
        // Si ya hay STOP activo, solo enviar respuestas (no cambiar tiempo)
        console.log('STOP ya activo, enviando respuestas sin cambiar tiempo')
        toast.success('¡Enviando respuestas!')
        return // Salir sin cambiar el tiempo
      }

      // Validar: Solo permitir STOP si stop_countdown < tiempo restante actual
      if (stopCountdownValue >= currentTimeRemaining) {
        toast.error(`No puedes llamar STOP. El countdown configurado (${stopCountdownValue}s) es mayor o igual al tiempo restante (${currentTimeRemaining}s)`)
        return
      }

      // Usar stop_countdown como nuevo tiempo restante
      const newTimeRemaining = stopCountdownValue

      // Marcar al usuario como terminado en esta ronda
      try {
        await insert('round_completions', {
          game_id: currentGame.id,
          player_id: user.id,
          round_number: currentGame.current_round_number ?? currentGame.current_round,
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        console.log('Jugador marcado como terminado en round_completions')

        // Cargar resultados inmediatamente después de marcar como completado
        const roundNumber = currentGame.current_round_number ?? currentGame.current_round ?? 1
        await loadRoundResults(currentGame.id, roundNumber)
      } catch (completionError) {
        console.error('Error marking player as completed:', completionError)
        // No fallar si no se puede marcar como completado, continuar con el proceso normal
      }

      // Update local state to show stop countdown
      setCurrentGame(prev => prev ? {
        ...prev,
        stop_countdown: stopCountdownValue,
        round_time_remaining: newTimeRemaining
      } : null);

      // Update database so all players see the STOP countdown
      const { error } = await (supabase
        .from('games')
        .update as any)({
          stop_countdown: stopCountdownValue,
          round_time_remaining: newTimeRemaining, // ✅ Usar stop_countdown como tiempo restante
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGame.id)

      if (error) {
        console.error('Error updating stop countdown in database:', error)
        // Don't throw error, continue with local state
      }

      // Notify other players about the STOP
      try {
        const channel = supabase.channel(`game_players_${currentGame.id}`)
        await channel.send({
          type: 'broadcast',
          event: 'stop_called',
          payload: {
            game_id: currentGame.id,
            stop_countdown: stopCountdownValue,
            round_time_remaining: newTimeRemaining, // ✅ Usar stop_countdown como tiempo restante
            timestamp: Date.now()
          }
        })
      } catch (broadcastError) {
        console.error('Error broadcasting stop call:', broadcastError)
        // Don't fail if broadcast fails, the database update is more important
      }

      toast.success(`¡STOP! ${newTimeRemaining} segundos para terminar`)
    } catch (error: any) {
      console.error('Error calling STOP:', error);
      toast.error('Error al llamar STOP')
    }
  }

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

  const startGame = async () => {
    if (!currentGame || !user || currentGame.host_id !== user.id) return

    try {
      // Iniciar la secuencia de cuenta regresiva
      await startGameSequence()

      // Notificar a otros jugadores que debe iniciar la cuenta regresiva
      await notifyCountdownStartToOthers()
    } catch (error: any) {
      console.error('Error starting game:', error)
      toast.error(error.message || 'Error al iniciar el juego')
    }
  }

  const value: GameContextType = {
    currentGame,
    playerAnswers,
    gameLoading,
    availableCategories,
    categoriesLoading,
    roundResults,
    roundCompletions,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    updateGameSettings,
    submitAnswers,
    callStop,
    setPlayerReady,
    updateAnswer,
    resetAnswers,
    loadCategories,
    checkActiveGame
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}