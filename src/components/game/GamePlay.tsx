import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Zap, Users, Send, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { useGame } from '../../contexts/GameContext'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { useCallback } from 'react'

export const GamePlay: React.FC = () => {
  const { currentGame, playerAnswers, updateAnswer, submitAnswers, callStop, availableCategories } = useGame()
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
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Función para obtener el nombre de una categoría por su ID
  const getCategoryName = useCallback((categoryId: string): string => {
    const category = availableCategories.find(cat => cat.id === categoryId)
    return category ? category.name : categoryId // Si no se encuentra, devuelve el ID como último recurso
  }, [availableCategories])

  useEffect(() => {
    if (!currentGame || currentGame.status !== 'playing') return

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

  // ✅ Temporizador específico para STOP countdown
  useEffect(() => {
    if (!currentGame || !currentGame.stop_countdown || currentGame.stop_countdown <= 0) {
      return // No ejecutar si no hay STOP activo
    }

    // ✅ Solo ejecutar si efectivamente se ha activado el STOP
    const isStopActive = currentGame.round_time_remaining === currentGame.stop_countdown
    if (!isStopActive) {
      return // No ejecutar si no está activado
    }

    const stopTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // STOP time's up - auto submit (only if not already submitted)
          if (!hasSubmitted && !isSubmitting) {
            handleSubmitAnswers()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(stopTimer)
  }, [currentGame?.stop_countdown, currentGame?.round_time_remaining, hasSubmitted, isSubmitting])

  // Actualizar tiempo restante cuando cambia el estado del juego
  useEffect(() => {
    if (currentGame?.round_time_remaining !== undefined) {
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
  }, [currentGame?.round_time_remaining, currentGame?.stop_countdown])

  // ✅ Actualizar inmediatamente cuando cambie stop_countdown
  useEffect(() => {
    if (currentGame?.stop_countdown !== undefined && currentGame.stop_countdown > 0) {
      // ✅ Solo actualizar si efectivamente se ha activado el STOP
      const isStopActive = currentGame.round_time_remaining === currentGame.stop_countdown
      if (isStopActive) {
        setTimeLeft(currentGame.stop_countdown)
      }
    }
  }, [currentGame?.stop_countdown, currentGame?.round_time_remaining])

  // Handle STOP countdown
  useEffect(() => {
    if (currentGame?.stop_countdown && currentGame.stop_countdown > 0) {
      const countdown = setInterval(() => {
        // This would be handled by the real-time subscription
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [currentGame?.stop_countdown])

  const handleSubmitAnswers = async () => {
    if (hasSubmitted || isSubmitting || !currentGame || !user) return

    setIsSubmitting(true)
    try {
      await submitAnswers(playerAnswers)
      setHasSubmitted(true)
      toast.success('¡Respuestas enviadas!')
    } catch (error: any) {
      console.error('Error submitting answers:', error)
      if (error.message?.includes('duplicate key') || error.message?.includes('Respuestas ya enviadas')) {
        console.log('Respuestas ya enviadas')
        setHasSubmitted(true)
        toast.success('¡Respuestas enviadas!')
      } else {
        toast.error(error.message || 'Error al enviar respuestas')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCallStop = async () => {
    if (hasSubmitted) return

    // Check if user has completed all categories
    if (completedAnswers !== totalCategories) {
      toast.error('Debes completar todas las categorías antes de terminar el juego')
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

    // ✅ Validar que el tiempo restante > stop_countdown (no extender tiempo)
    const timeRemaining = timeLeft
    const stopCountdownValue = currentGame?.stop_countdown || 10

    if (stopCountdownValue >= timeRemaining) {
      toast.error(`No puedes llamar STOP. El countdown configurado (${stopCountdownValue}s) es mayor o igual al tiempo restante (${timeRemaining}s)`)
      return
    }

    try {
      // First call STOP to notify other players
      await callStop()
      // Then submit the answers
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

  const completedAnswers = Object.values(playerAnswers).filter(answer => answer.trim().length > 0).length
  const totalCategories = currentGame?.categories.length || 0
  const progressPercentage = totalCategories > 0 ? (completedAnswers / totalCategories) * 100 : 0

  if (!currentGame) return null

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
                value={playerAnswers[categoryId] || ''}
                onChange={(e) => updateAnswer(categoryId, e.target.value)}
                disabled={hasSubmitted}
                className={`w-full ${
                  playerAnswers[categoryId]?.trim() 
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