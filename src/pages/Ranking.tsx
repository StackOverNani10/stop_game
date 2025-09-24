import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Award, Crown, Star, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database'
import { useAuth } from '../contexts/AuthContext'

export const Ranking: React.FC = () => {
  const { profile: currentUserProfile } = useAuth()
  const [topPlayers, setTopPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRanking()
  }, [])

  const loadRanking = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(50)

      if (error) throw error
      setTopPlayers(data || [])
    } catch (error) {
      console.error('Error loading ranking:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{position}</span>
    }
  }

  const getRankColor = (position: number) => {
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

  const currentUserRank = topPlayers.findIndex(p => p.id === currentUserProfile?.id) + 1

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando ranking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
          Ranking Global
        </h1>
        <p className="text-gray-600">
          Los mejores jugadores de STOP ordenados por puntos totales
        </p>
      </motion.div>

      {/* Current User Stats */}
      {currentUserProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${getRankColor(currentUserRank)} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold">
                    {currentUserProfile.full_name?.[0] || currentUserProfile.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Tu Posición</h3>
                  <p className="text-sm text-gray-600">
                    {currentUserProfile.full_name || 'Usuario'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  {currentUserRank > 0 ? getRankIcon(currentUserRank) : <TrendingUp className="w-6 h-6 text-gray-400" />}
                  <span className="text-2xl font-bold text-gray-900">
                    {currentUserRank > 0 ? `#${currentUserRank}` : 'Sin ranking'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{currentUserProfile.total_points} pts</span>
                  <span>{currentUserProfile.games_won} victorias</span>
                  <span>{currentUserProfile.games_played} partidas</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Top Players */}
      <div className="space-y-4">
        {topPlayers.map((player, index) => {
          const position = index + 1
          const isCurrentUser = player.id === currentUserProfile?.id
          const winRate = player.games_played > 0 ? (player.games_won / player.games_played * 100).toFixed(1) : '0'

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-6 ${isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getRankIcon(position)}
                      <div className={`w-12 h-12 ${getRankColor(position)} rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold">
                          {player.full_name?.[0] || player.email[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {player.full_name || 'Usuario'}
                        {isCurrentUser && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Tú</span>}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {player.total_points} puntos
                        </span>
                        <span>{player.games_won} victorias</span>
                        <span>{player.games_played} partidas</span>
                        <span>{winRate}% efectividad</span>
                      </div>
                    </div>
                  </div>
                  
                  {position <= 3 && (
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                        position === 1 ? 'bg-yellow-500' :
                        position === 2 ? 'bg-gray-400' :
                        'bg-amber-600'
                      }`}>
                        {position === 1 ? '🥇 Campeón' :
                         position === 2 ? '🥈 Subcampeón' :
                         '🥉 Tercer lugar'}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {topPlayers.length === 0 && (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aún no hay jugadores en el ranking
          </h3>
          <p className="text-gray-600">
            ¡Sé el primero en jugar y aparecer en el ranking!
          </p>
        </Card>
      )}
    </div>
  )
}