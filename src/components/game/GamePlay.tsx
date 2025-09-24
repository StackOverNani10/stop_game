import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Zap, Users, Send, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { useGame } from '../../contexts/GameContext'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const GamePlay: React.FC = () => {
  const { currentGame, playerAnswers, updateAnswer, submitAnswers, callStop } = useGame()
  const { user } = useAuth()
  const [timeLeft, setTimeLeft] = useState(currentGame?.round_time_limit || 120)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    if (!currentGame || currentGame.status !== 'playing') return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          if (!hasSubmitted) {
            handleSubmitAnswers()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentGame, hasSubmitted])

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
    if (hasSubmitted) return

    try {
      await submitAnswers(playerAnswers)
      setHasSubmitted(true)
      toast.success('¡Respuestas enviadas!')
    } catch (error) {
      console.error('Error submitting answers:', error)
    }
  }

  const handleCallStop = async () => {
    if (hasSubmitted) return

    // Check if user has at least one answer
    const hasAnswers = Object.values(playerAnswers).some(answer => answer.trim().length > 0)
    if (!hasAnswers) {
      toast.error('Debes tener al menos una respuesta para llamar STOP')
      return
    }

    try {
      await callStop()
      await handleSubmitAnswers()
    } catch (error) {
      console.error('Error calling stop:', error)
    }
  }

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
        {currentGame.categories.map((category, index) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {category}
              </label>
              <Input
                type="text"
                placeholder={`${category} con "${currentGame.current_letter}"`}
                value={playerAnswers[category] || ''}
                onChange={(e) => updateAnswer(category, e.target.value)}
                disabled={hasSubmitted}
                className={`w-full ${
                  playerAnswers[category]?.trim() 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300'
                }`}
              />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={handleSubmitAnswers}
          disabled={hasSubmitted || completedAnswers === 0}
          variant="secondary"
          size="lg"
          className="flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          Enviar Respuestas ({completedAnswers})
        </Button>

        <Button
          onClick={handleCallStop}
          disabled={hasSubmitted || completedAnswers === 0}
          variant="danger"
          size="lg"
          className="flex items-center gap-2"
        >
          <Zap className="w-5 h-5" />
          ¡STOP!
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