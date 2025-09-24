import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Star, RotateCcw, Home, Crown } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useGame } from '../../contexts/GameContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { RoundAnswer } from '../../types/database'

interface PlayerResult {
  player_id: string
  player_name: string
  answers: { [category: string]: { answer: string; points: number; is_unique: boolean } }
  total_points: number
  round_points: number
}

export const GameResults: React.FC = () => {
  const { currentGame, leaveGame } = useGame()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [results, setResults] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentGame) {
      loadResults()
    }
  }, [currentGame])

  const loadResults = async () => {
    if (!currentGame) return

    try {
      // Get all answers for the current round
      const { data: answers, error } = await supabase
        .from('round_answers')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .eq('game_id', currentGame.id)
        .eq('round', currentGame.current_round)

      if (error) throw error

      // Process results
      const playerResults: { [playerId: string]: PlayerResult } = {}

      // Initialize player results
      currentGame.players.forEach(player => {
        playerResults[player.player_id] = {
          player_id: player.player_id,
          player_name: player.profile.full_name || 'Usuario',
          answers: {},
          total_points: player.score,
          round_points: 0
        }
      })

      // Process answers
      answers?.forEach(answer => {
        if (playerResults[answer.player_id]) {
          playerResults[answer.player_id].answers[answer.category] = {
            answer: answer.answer,
            points: answer.points,
            is_unique: answer.is_unique
          }
          playerResults[answer.player_id].round_points += answer.points
        }
      })

      // Sort by total points
      const sortedResults = Object.values(playerResults)
        .sort((a, b) => b.total_points - a.total_points)

      setResults(sortedResults)
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayAgain = () => {
    // This would create a new game with the same players
    navigate('/dashboard')
  }

  const handleGoHome = async () => {
    await leaveGame()
    navigate('/dashboard')
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />
      case 3:
        return <Star className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{position}</span>
    }
  }

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500'
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600'
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600'
    }
  }

  if (!currentGame) return null

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculando resultados...</p>
        </div>
      </div>
    )
  }

  const winner = results[0]
  const isCurrentUserWinner = winner?.player_id === user?.id

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentGame.status === 'finished' ? '¡Juego Terminado!' : 'Resultados de la Ronda'}
        </h1>
        <p className="text-gray-600">
          Ronda {currentGame.current_round} - Letra "{currentGame.current_letter}"
        </p>
      </motion.div>

      {/* Winner Announcement */}
      {winner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className={`p-6 text-center ${isCurrentUserWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}`}>
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isCurrentUserWinner ? '¡Felicidades! 🎉' : `¡${winner.player_name} ganó!`}
            </h2>
            <p className="text-gray-600">
              {winner.total_points} puntos totales • +{winner.round_points} esta ronda
            </p>
          </Card>
        </motion.div>
      )}

      {/* Results Table */}
      <div className="space-y-4 mb-8">
        {results.map((result, index) => {
          const position = index + 1
          const isCurrentUser = result.player_id === user?.id

          return (
            <motion.div
              key={result.player_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 ${isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {getPositionIcon(position)}
                    <div className={`w-12 h-12 ${getPositionColor(position)} rounded-full flex items-center justify-center`}>
                      <span className="text-white font-bold">
                        {result.player_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {result.player_name}
                        {isCurrentUser && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Tú</span>}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {result.total_points} puntos totales • +{result.round_points} esta ronda
                      </p>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {currentGame.categories.map(category => {
                    const answer = result.answers[category]
                    return (
                      <div key={category} className="bg-white p-3 rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">{category}</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {answer?.answer || '-'}
                        </p>
                        {answer && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              answer.points > 0 
                                ? answer.is_unique 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {answer.points} pts
                              {answer.is_unique && ' ⭐'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {currentGame.status !== 'finished' && (
          <Button
            onClick={handlePlayAgain}
            variant="success"
            size="lg"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Siguiente Ronda
          </Button>
        )}
        
        <Button
          onClick={handleGoHome}
          variant="secondary"
          size="lg"
          className="flex items-center gap-2"
        >
          <Home className="w-5 h-5" />
          Volver al Inicio
        </Button>
      </div>

      {/* Game Summary */}
      {currentGame.status === 'finished' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="p-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">
              Resumen del Juego
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{currentGame.max_rounds}</p>
                <p className="text-sm text-gray-600">Rondas jugadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{currentGame.players.length}</p>
                <p className="text-sm text-gray-600">Jugadores</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{currentGame.categories.length}</p>
                <p className="text-sm text-gray-600">Categorías</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{winner?.total_points || 0}</p>
                <p className="text-sm text-gray-600">Puntos máximos</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}