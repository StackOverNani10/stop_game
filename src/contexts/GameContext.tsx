import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { supabase, insert } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { GameState, PlayerAnswers, LETTERS, PlayerData } from '../types/game';
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
  is_starting?: boolean
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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth()
  const [currentGame, setCurrentGame] = useState<GameState | null>(null)
  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswers>({})
  const [gameLoading, setGameLoading] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<DBCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

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
        console.log('Estado de la suscripción a jugadores:', status);
      });

    // Suscripción a cambios en el estado del juego
    const gameSubscription = supabase
      .channel(`game_state_${currentGame.id}`)
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
      .subscribe((status) => {
        console.log('Estado de la suscripción al juego:', status);
      });

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
          // Aquí podrías actualizar el estado de las respuestas si es necesario
        }
      )
      .subscribe();

    // Suscripción para eventos de countdown
    const countdownChannel = supabase
      .channel(`game_countdown_${currentGame.id}`)
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
      .subscribe()

    // Limpieza al desmontar
    return () => {
      console.log('Limpiando suscripciones')
      supabase.removeChannel(playersSubscription)
      supabase.removeChannel(gameSubscription)
      supabase.removeChannel(answersSubscription)
      supabase.removeChannel(countdownChannel)
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

  const generateGameCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

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
        stop_countdown: 10
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

      setCurrentGame({
        ...gameData,
        categories: categoriesToUse,
        players: [],
        stop_countdown: gameData.stop_countdown || 0,
        current_round_number: gameData.current_round_number || 0 // Asegurar que current_round_number esté definido
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
      const randomLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)]
      const now = new Date().toISOString()
      const currentRound = 1;
      const gameId = currentGame.id;
      const isHost = currentGame.host_id === user.id;

      // Actualizar el estado local inmediatamente para una mejor experiencia de usuario
      setCurrentGame(prev => prev ? {
        ...prev,
        status: 'playing',
        starting_countdown: undefined,
        current_letter: randomLetter,
        current_round: currentRound,
        current_round_number: currentRound,
        updated_at: now
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
      // Verificar que tengamos respuestas para enviar
      if (Object.keys(answers).length === 0) {
        console.warn('No answers to submit');
        return;
      }

      // Crear el objeto de respuesta con los nombres de columna correctos
      const roundAnswers = Object.entries(answers).map(([category, answer]) => ({
        game_id: currentGame.id,
        player_id: user.id,
        round_number: currentGame.current_round_number,
        category: category,
        answer: answer.trim(),
        points: 0,
        is_unique: false,
        created_at: new Date().toISOString()
      }));

      // Intentar insertar las respuestas usando la función insert del helper
      const { data, error } = await insert('round_answers', roundAnswers);

      if (error) {
        console.error('Database error details:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      toast.success('Respuestas enviadas');
    } catch (error: any) {
      console.error('Error submitting answers:', error);
      toast.error(error.message || 'Error al enviar respuestas');
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
    loadCategories
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}