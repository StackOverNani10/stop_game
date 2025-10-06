import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Zap, Users, Send, AlertCircle, CheckCircle, XCircle, ArrowRight, Trophy, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { RoundResults } from '../../types/game'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { useGame } from '../../contexts/GameContext'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { RoundCompletion } from '../../types/database'

export const GamePlay: React.FC = () => {
  const gameContext = useGame()
  const { currentGame, playerAnswers, updateAnswer, submitAnswers, callStop, availableCategories } = gameContext || {}
  const [showResults, setShowResults] = useState(false)
  const [roundResults, setRoundResults] = useState<RoundResults[]>([])
  const [playersFinished, setPlayersFinished] = useState(0)
  const [isHost, setIsHost] = useState(false)
  const { user } = useAuth()
  const [timeLeft, setTimeLeft] = useState(120)
  // ✅ Inicializar timeLeft correctamente cuando se carga el juego
  useEffect(() => {
    if (currentGame?.status === 'playing' && currentGame.round_time_remaining !== undefined) {
      console.log('🎯 Inicializando timeLeft:', {
        roundTimeRemaining: currentGame.round_time_remaining,
        stopCountdown: currentGame.stop_countdown,
        isStopActive: currentGame.stop_countdown > 0 && currentGame.round_time_remaining === currentGame.stop_countdown
      });

      // ✅ Usar la misma lógica que en el useEffect de actualización
      const isStopActive = currentGame.stop_countdown > 0 &&
        currentGame.round_time_remaining === currentGame.stop_countdown;

      const initialTime = isStopActive
        ? currentGame.stop_countdown
        : currentGame.round_time_remaining;

      setTimeLeft(initialTime);
    }
  }, [currentGame?.id]) // Solo cuando cambia el ID del juego (nueva carga)

  // ✅ Verificar si debe mostrar resultados al cargar la página
  useEffect(() => {
    if (currentGame && currentGame.status === 'playing') {
      // Verificar si hay resultados disponibles para mostrar
      const checkAndLoadResults = async () => {
        try {
          const currentRoundNumber = currentGame.current_round_number || currentGame.current_round || 1

          // Verificar si hay completaciones para esta ronda
          const { data: completionsData, error } = await supabase
            .from('round_completions')
            .select('player_id')
            .eq('game_id', currentGame.id)
            .eq('round_number', currentRoundNumber)

          if (error) {
            console.error('Error checking for round completions:', error)
            return
          }

          // Si hay completaciones, significa que alguien ya terminó y podría estar mostrando resultados
          if (completionsData && completionsData.length > 0) {
            console.log('🔄 Encontradas completaciones existentes, cargando resultados...')
            await loadRoundResultsRealTime()
            // Los resultados se mostrarán automáticamente cuando se carguen
          }
        } catch (error) {
          console.error('Error checking for existing results:', error)
        }
      }

      checkAndLoadResults()
    }
  }, [currentGame?.id, currentGame?.status]) // Solo cuando cambia el estado del juego
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Función para obtener el nombre de una categoría por su ID
  const getCategoryName = useCallback((categoryId: string): string => {
    const category = availableCategories?.find((cat: any) => cat.id === categoryId)
    return category ? category.name : categoryId // Si no se encuentra, devuelve el ID como último recurso
  }, [availableCategories])

  // Función para cargar resultados en tiempo real
  const loadRoundResultsRealTime = useCallback(async () => {
    if (!currentGame) return

    try {
      const currentRoundNumber = currentGame.current_round_number || currentGame.current_round || 1

      // Cargar completaciones de jugadores para esta ronda
      const { data: completionsData, error: completionsError } = await supabase
        .from('round_completions')
        .select(`
          *,
          profile:profiles(full_name, avatar_url, email)
        `)
        .eq('game_id', currentGame.id)
        .eq('round_number', currentRoundNumber)
        .order('completed_at', { ascending: true })

      if (completionsError) {
        console.error('Error loading round completions:', completionsError)
        return
      }

      if (completionsData && completionsData.length > 0) {
        // Type assertion para ayudar a TypeScript a entender la estructura de datos
        const completionsWithProfiles = completionsData as (RoundCompletion & {
          profile: { full_name: string | null; avatar_url: string | null; email: string } | null
        })[]

        // Cargar respuestas de jugadores que han terminado
        const { data: answersData, error: answersError } = await supabase
          .from('round_answers')
          .select('*')
          .eq('game_id', currentGame.id)
          .eq('round_number', currentRoundNumber)
          .in('player_id', completionsWithProfiles.map(c => c.player_id))

        if (answersError) {
          console.error('Error loading round answers:', answersError)
          return
        }

        // Crear mapa de respuestas por jugador
        const answersByPlayer = new Map<string, any[]>();
        (answersData || []).forEach((answer: any) => {
          if (!answersByPlayer.has(answer.player_id)) {
            answersByPlayer.set(answer.player_id, [])
          }
          answersByPlayer.get(answer.player_id)!.push(answer)
        })

        // Crear resultados formateados
        const results = completionsWithProfiles.map((completion: any) => {
          const playerAnswers = answersByPlayer.get(completion.player_id) || []
          const answersMap: any = {}
          let totalPoints = 0

          playerAnswers.forEach((answer: any) => {
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
        setPlayersFinished(completionsWithProfiles.length)

        console.log(`✅ Actualizados resultados: ${results.length} jugadores terminaron`)

        // ✅ Mostrar resultados automáticamente si hay datos disponibles
        if (results.length > 0 && !showResults) {
          setShowResults(true)
        }
      } else {
        // Si no hay completaciones, limpiar resultados
        setRoundResults([])
        setPlayersFinished(0)
      }
    } catch (error) {
      console.error('Error loading round results in real time:', error)
    }
  }, [currentGame, showResults])

  // Efecto para manejar el temporizador principal
  useEffect(() => {
    if (!currentGame || currentGame.status === 'finished' || currentGame.status !== 'playing' || showResults) return

    // ✅ Solo detener el temporizador si STOP está REALMENTE activo
    const isStopActive = currentGame.stop_countdown && currentGame.stop_countdown > 0 &&
      currentGame.round_time_remaining === currentGame.stop_countdown

    if (isStopActive) {
      console.log('⏸️ Temporizador principal detenido - STOP activo')
      return // Salir si STOP está realmente activo
    }

    console.log('▶️ Temporizador principal ejecutándose:', {
      roundTimeRemaining: currentGame.round_time_remaining,
      stopCountdown: currentGame.stop_countdown,
      isStopActive
    })

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit (only if not already submitted)
          if (!hasSubmitted && !isSubmitting) {
            handleSubmitAnswers()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentGame, currentGame?.round_time_remaining, hasSubmitted, isSubmitting])

  // Efecto para manejar el temporizador principal (SEGUNDO TEMPORIZADOR - ELIMINAR ESTE)
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'playing' || showResults) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Cuando el tiempo se acaba, forzar el envío de respuestas
          if (!hasSubmitted && !isSubmitting) {
            handleSubmitAnswers()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentGame, hasSubmitted, isSubmitting, showResults])

  // Actualizar tiempo restante cuando cambia el estado del juego
  useEffect(() => {
    if (currentGame?.round_time_remaining !== undefined && currentGame.status === 'playing') {
      console.log('🔄 Actualizando timer:', {
        roundTimeRemaining: currentGame.round_time_remaining,
        stopCountdown: currentGame.stop_countdown,
        isStopActive: currentGame.stop_countdown > 0 && currentGame.round_time_remaining === currentGame.stop_countdown
      });

      // ✅ Solo usar stop_countdown si efectivamente está activo
      const isStopActive = currentGame.stop_countdown > 0 &&
        currentGame.round_time_remaining === currentGame.stop_countdown;

      // ✅ Si STOP está activo, usar el countdown como timer
      // ✅ Si no, usar el tiempo restante normal del juego
      const newTimeLeft = isStopActive
        ? currentGame.stop_countdown
        : currentGame.round_time_remaining;

      setTimeLeft(newTimeLeft);
    }
  }, [currentGame?.round_time_remaining, currentGame?.stop_countdown, currentGame?.status])

  // ✅ Actualizar inmediatamente cuando cambie stop_countdown
  useEffect(() => {
    if (currentGame?.stop_countdown !== undefined && currentGame.stop_countdown > 0 && currentGame.status === 'playing') {
      // ✅ Solo actualizar si efectivamente se ha activado el STOP
      const isStopActive = currentGame.round_time_remaining === currentGame.stop_countdown
      if (isStopActive) {
        setTimeLeft(currentGame.stop_countdown)
      }
    }
  }, [currentGame?.stop_countdown, currentGame?.round_time_remaining, currentGame?.status])

  // Efecto para manejar suscripciones en tiempo real cuando se muestran resultados
  useEffect(() => {
    if (!currentGame || !showResults || currentGame.status === 'finished') return

    console.log('🎯 Configurando suscripciones en tiempo real para resultados')

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
          console.log('🔄 Cambio en completaciones detectado:', payload)
          // Recargar resultados cuando alguien termina
          loadRoundResultsRealTime()
        }
      )
      .on('broadcast', { event: 'round_completion' }, (payload) => {
        console.log('🔄 Nueva completación de ronda recibida:', payload)
        // Recargar resultados cuando alguien termina
        loadRoundResultsRealTime()
      })
      .subscribe()

    // Suscripción a cambios en respuestas de rondas
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
          console.log('🔄 Cambio en respuestas detectado:', payload)
          // Recargar resultados cuando llegan nuevas respuestas
          loadRoundResultsRealTime()
        }
      )
      .subscribe()

    // Cargar resultados iniciales
    loadRoundResultsRealTime()

    return () => {
      console.log('🧹 Limpiando suscripciones de resultados')
      supabase.removeChannel(completionsSubscription)
      supabase.removeChannel(answersSubscription)
    }
  }, [currentGame?.id, showResults, loadRoundResultsRealTime, currentGame?.status])

  // Handle game state changes
  useEffect(() => {
    if (!currentGame) return

    // Check if current user is host
    setIsHost(currentGame.host_id === user?.id)

    // Resetear el estado cuando comienza una nueva ronda
    if (currentGame.status === 'playing' && !showResults) {
      setHasSubmitted(false)
    }
  }, [currentGame, user])

  const handleSubmitAnswers = async () => {
    if (hasSubmitted || isSubmitting || !currentGame || !user || !submitAnswers || currentGame.status === 'finished') return

    setIsSubmitting(true)
    try {
      // Solo enviamos las respuestas sin esperar el cambio de estado
      await submitAnswers(playerAnswers || {})
      setHasSubmitted(true)
      // Mostrar los resultados localmente
      setShowResults(true)
    } catch (error: any) {
      console.error('Error submitting answers:', error)
      if (error.message?.includes('duplicate key') || error.message?.includes('Respuestas ya enviadas')) {
        console.log('Respuestas ya enviadas')
        setHasSubmitted(true)
        setShowResults(true)
      } else {
        toast.error(error.message || 'Error al enviar respuestas')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCallStop = async () => {
    if (hasSubmitted || !callStop || currentGame?.status === 'finished') return

    // Check if user has completed all categories
    if (completedAnswers !== totalCategories) {
      toast.error('Debes completar todas las categorías antes de terminar')
      return
    }

    // ✅ Verificar si ya hay un STOP activo
    const isStopActive = currentGame?.stop_countdown && currentGame.stop_countdown > 0 &&
      currentGame.round_time_remaining === currentGame.stop_countdown

    if (isStopActive) {
      // ✅ Si ya hay STOP activo, solo enviar respuestas
      console.log('STOP ya activo, enviando respuestas sin cambiar tiempo')
      try {
        await handleSubmitAnswers()
        toast.success('¡Respuestas enviadas!')
      } catch (error) {
        console.error('Error submitting answers:', error)
      }
      return
    }

    try {
      await callStop()
      await handleSubmitAnswers()
    } catch (error) {
      console.error('Error calling stop:', error)
    }
  }

  // Handle game starting countdown
  useEffect(() => {
    if (currentGame?.status === 'waiting' && currentGame?.starting_countdown) {
      const countdown = setInterval(() => {
        // This would be handled by the real-time subscription
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [currentGame?.status, currentGame?.starting_countdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = () => {
    if (timeLeft > 60) return 'text-green-600'
    if (timeLeft > 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const completedAnswers = Object.values(playerAnswers || {}).filter(answer => answer?.trim().length > 0).length
  const totalCategories = currentGame?.categories.length || 0
  const progressPercentage = totalCategories > 0 ? (completedAnswers / totalCategories) * 100 : 0

  // Render results screen
  if (showResults && currentGame) {
    const allPlayers = currentGame.players.length
    const playersRemaining = allPlayers - playersFinished
    const isFinalRound = (currentGame.current_round_number || 0) >= (currentGame.max_rounds || 5)
    const allPlayersFinished = playersRemaining === 0

    // Función helper para detectar respuestas duplicadas por categoría
    const getDuplicateAnswers = (categoryId: string) => {
      const answersForCategory = roundResults
        .map(result => result.answers[categoryId]?.answer)
        .filter(answer => answer && answer.trim() !== '')

      const uniqueAnswers = new Set(answersForCategory)
      return answersForCategory.length !== uniqueAnswers.size
    }

    // Función para controlar la expansión/contraer de tarjetas
    const toggleCardExpansion = (playerId: string) => {
      const newExpandedCards = new Set(expandedCards)
      if (newExpandedCards.has(playerId)) {
        newExpandedCards.delete(playerId)
      } else {
        newExpandedCards.add(playerId)
      }
      setExpandedCards(newExpandedCards)
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Round Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {currentGame.current_letter}
              </span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Ronda {currentGame.current_round_number || currentGame.current_round}
              </h1>
              <p className="text-indigo-600 font-medium">
                Palabras que empiecen con "{currentGame.current_letter}"
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">{playersFinished} terminaron</span>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-medium">{playersRemaining} restantes</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">Progreso de la ronda</span>
              <span className="font-medium">{playersFinished}/{allPlayers}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-4 rounded-full shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${(playersFinished / allPlayers) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Results Grid - Modern Design */}
        <div className="mb-4">
          {/* Global Controls */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Resultados de la Ronda</h2>
            <button
              onClick={() => {
                if (expandedCards.size === roundResults.length) {
                  // Contraer todas
                  setExpandedCards(new Set())
                } else {
                  // Expandir todas
                  setExpandedCards(new Set(roundResults.map(r => r.player_id)))
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              {expandedCards.size === roundResults.length ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Ocultar Todas
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Mostrar Todas
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
          {roundResults.map((result, playerIndex) => (
            <motion.div
              key={result.player_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: playerIndex * 0.1 }}
              className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${result.player_id === user?.id
                ? 'ring-2 ring-blue-400 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
                : 'bg-gradient-to-br from-white to-gray-50 border border-gray-100'
                }`}
            >
              {/* Player Header */}
              <div className={`p-3 md:p-4 ${result.player_id === user?.id
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white'
                : 'bg-gradient-to-r from-gray-800 to-gray-700 text-white'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg font-bold ${result.player_id === user?.id
                      ? 'bg-white/20'
                      : 'bg-gray-600/50'
                      }`}>
                      {(result.player_name || 'Jugador')[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs md:text-sm">
                        {result.player_id === user?.id ? 'Tú' : (result.player_name || 'Jugador')}
                      </h3>
                      <p className="text-xs opacity-90">
                        {result.total_points || result.total || 0} puntos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.player_id === user?.id && (
                      <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xs">👑</span>
                      </div>
                    )}
                    <button
                      onClick={() => toggleCardExpansion(result.player_id)}
                      className="w-6 h-6 md:w-7 md:h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
                      title={expandedCards.has(result.player_id) ? 'Ocultar respuestas' : 'Mostrar respuestas'}
                    >
                      {expandedCards.has(result.player_id) ? (
                        <ChevronUp className="w-3 h-3 md:w-4 md:h-4" />
                      ) : (
                        <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Answers Grid - Collapsible */}
              {expandedCards.has(result.player_id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-3 md:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                      {currentGame.categories.map(categoryId => {
                        const answerObj = result.answers[categoryId]
                        const answer = answerObj?.answer || ''
                        const points = answerObj?.points || 0
                        const isUnique = answerObj?.is_unique || false
                        const isValid = answer && answer.trim().toLowerCase().startsWith((currentGame.current_letter || '').toLowerCase())

                        return (
                          <div key={categoryId} className="space-y-1 md:space-y-2">
                            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {getCategoryName(categoryId)}
                            </div>
                            <div className={`p-2 md:p-3 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 hover:scale-105 ${!answer
                              ? 'bg-red-100 text-red-600 border border-red-200 shadow-sm'
                              : getDuplicateAnswers(categoryId) && answer.trim() !== ''
                                ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm'
                                : 'bg-green-100 text-green-700 border border-green-200 shadow-sm'
                              }`}>
                              <div className="flex items-center justify-between">
                                <span className="truncate flex-1">
                                  {answer || <span className="italic opacity-75">Sin respuesta</span>}
                                </span>
                                {answer && (
                                  <div className={`ml-1 md:ml-2 ${isValid && points > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                                    {isValid ? (
                                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="text-xs">✓</span>
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-100 flex items-center justify-center">
                                        <span className="text-xs">✗</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {answer && points > 0 && (
                                <div className="mt-1 text-xs font-bold opacity-75">
                                  +{points} pts
                                  {isUnique && <span className="ml-1 text-yellow-500">★</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Collapsed Summary */}
              {!expandedCards.has(result.player_id) && (
                <div className="p-3 md:p-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-2">
                      {Object.values(result.answers).filter(answer => answer.answer && answer.answer.trim() !== '').length} de {currentGame.categories.length} categorías completadas
                    </div>
                    <div className="flex justify-center gap-2">
                      {currentGame.categories.slice(0, 5).map(categoryId => {
                        const answer = result.answers[categoryId]?.answer
                        const points = result.answers[categoryId]?.points || 0
                        const isUnique = result.answers[categoryId]?.is_unique || false
                        const isValid = answer && answer.trim().toLowerCase().startsWith((currentGame.current_letter || '').toLowerCase())

                        let dotColor = 'bg-gray-300' // Por defecto

                        if (!answer) {
                          dotColor = 'bg-red-300'
                        } else if (getDuplicateAnswers(categoryId) && answer.trim() !== '') {
                          dotColor = 'bg-amber-400'
                        } else if (isValid && points > 0) {
                          dotColor = 'bg-green-400'
                        }

                        return (
                          <div
                            key={categoryId}
                            className={`w-3 h-3 rounded-full ${dotColor}`}
                            title={`${getCategoryName(categoryId)}: ${answer || 'Sin respuesta'}`}
                          />
                        )
                      })}
                      {currentGame.categories.length > 5 && (
                        <div className="w-3 h-3 rounded-full bg-gray-300" title={`+${currentGame.categories.length - 5} más`} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Next Round Button (Host Only) */}
        {isHost && allPlayersFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <Button
              onClick={async () => {
                // TODO: Implement endGame and nextRound in GameContext
                toast.success('Funcionalidad de siguiente ronda en desarrollo')
                /*
                if (isFinalRound) {
                  await endGame()
                } else {
                  await nextRound()
                }
                */
              }}
              variant="primary"
              size="lg"
              className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 text-lg"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              {isFinalRound ? (
                <>
                  <Trophy className="w-6 h-6" />
                  <span className="relative z-10">Finalizar Partida</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Siguiente Ronda</span>
                  <ArrowRight className="w-6 h-6 relative z-10" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Waiting Message */}
        {!allPlayersFinished && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-blue-700 font-medium">Esperando a que los demás jugadores terminen...</p>
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse delay-300"></div>
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  if (!currentGame || currentGame.status === 'finished') return null

  // Mostrar cuenta regresiva de inicio si el juego está iniciando (waiting + starting_countdown)
  if (currentGame.status === 'waiting' && currentGame.starting_countdown) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <span className="text-white font-bold text-6xl">
                {currentGame.starting_countdown}
              </span>
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ¡El juego está por comenzar!
            </h1>
            <p className="text-xl text-gray-600">
              Preparándote para la primera ronda...
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">
              {currentGame.current_letter}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ronda {currentGame.current_round} de {currentGame.max_rounds}
            </h1>
            <p className="text-gray-600">
              Palabras que empiecen con "{currentGame.current_letter}"
            </p>
          </div>
        </div>

        {/* Timer and Progress */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${getTimeColor()}`} />
            <span className={`text-xl font-bold ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-gray-700">
              {currentGame.players.length} jugadores
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso</span>
            <span>{completedAnswers}/{totalCategories}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* STOP Countdown */}
        {currentGame.stop_countdown > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg"
          >
            <div className="flex items-center justify-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">
                ¡STOP! Tiempo restante: {currentGame.stop_countdown}s
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {currentGame.categories.map((categoryId, index) => (
          <motion.div
            key={categoryId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getCategoryName(categoryId)}
              </label>
              <Input
                type="text"
                placeholder={`${getCategoryName(categoryId)} con "${currentGame.current_letter}"`}
                value={playerAnswers?.[categoryId] || ''}
                onChange={(e) => updateAnswer?.(categoryId, e.target.value)}
                disabled={hasSubmitted}
                className={`w-full ${playerAnswers?.[categoryId]?.trim()
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
                  }`}
              />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <Button
          onClick={handleCallStop}
          disabled={hasSubmitted || completedAnswers !== totalCategories || isSubmitting}
          variant="danger"
          size="lg"
          className="flex items-center gap-3 text-lg px-8 py-4"
        >
          <Zap className="w-6 h-6" />
          {isSubmitting ? 'Enviando...' : `¡STOP! (${completedAnswers}/${totalCategories})`}
        </Button>
      </div>

      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Card className="p-6 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">
              ¡Respuestas enviadas! ✅
            </h3>
            <p className="text-green-700">
              Esperando a que los demás jugadores terminen...
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  )
}