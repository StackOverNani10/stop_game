import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Award, Crown, Star, TrendingUp } from 'lucide-react'
import { BottomNavBar } from '../components/layout/BottomNavBar'
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

  const currentUserRank = topPlayers.findIndex(p => p.id === currentUserProfile?.id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center pt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando ranking...</p>
          </div>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ranking Global
          </h1>
          <p className="text-gray-600">
            Los mejores jugadores de STOP ordenados por puntos totales
          </p>
        </div>

      {/* Current User Stats */}
      {currentUserProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-300" />
                  Tu Posición en el Ranking
                </h2>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
                  {currentUserRank > 0 ? `#${currentUserRank} de ${topPlayers.length}` : 'Sin ranking'}
                </div>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className={`relative w-16 h-16 ${getRankColor(currentUserRank)} rounded-xl flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl font-bold">
                    {currentUserProfile.full_name?.[0]?.toUpperCase() || currentUserProfile.email[0]?.toUpperCase() || 'U'}
                  </span>
                  {currentUserRank <= 3 && (
                    <div className="absolute -top-2 -right-2 bg-white text-yellow-600 rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                      {currentUserRank === 1 ? '🥇' : currentUserRank === 2 ? '🥈' : '🥉'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{currentUserProfile.full_name || 'Usuario'}</h3>
                  <p className="text-blue-100 text-sm truncate">Nivel: {Math.floor(currentUserProfile.total_points / 100) + 1}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-yellow-300" />
                    {currentUserProfile.total_points}
                  </div>
                  <p className="text-xs text-blue-100 mt-1">Puntos</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{currentUserProfile.games_won}</div>
                  <p className="text-xs text-blue-100 mt-1">Victorias</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{currentUserProfile.games_played}</div>
                  <p className="text-xs text-blue-100 mt-1">Partidas</p>
                </div>
              </div>
              
              {currentUserRank > 0 && topPlayers.length > 0 && currentUserRank > 1 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-100">Para el siguiente puesto:</span>
                    <span className="font-medium">
                      {topPlayers[currentUserRank - 2].total_points - currentUserProfile.total_points} pts
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (currentUserProfile.total_points / topPlayers[0].total_points) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Top Players */}
      <div className="space-y-3">
        {topPlayers.map((player, index) => {
          const position = index + 1;
          const isCurrentUser = player.id === currentUserProfile?.id;
          const winRate = player.games_played > 0 ? (player.games_won / player.games_played * 100).toFixed(0) : '0';
          const isTop3 = position <= 3;
          
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="w-full"
            >
              <Card className={`overflow-hidden border-0 shadow-sm transition-all duration-200 hover:shadow-md relative ${
                isCurrentUser 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 pr-28 sm:pr-40' 
                  : isTop3 
                    ? 'bg-white pr-28 sm:pr-40' 
                    : 'bg-white hover:bg-gray-50 pr-28 sm:pr-40'
              }`}>
                <div className="flex items-center p-3 sm:p-5 h-24 sm:h-28">
                  {/* Posición */}
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex-shrink-0 flex items-center justify-center mr-1 sm:mr-2 ${
                    isTop3 ? 'text-white' : 'bg-gray-100 text-gray-600'
                  } ${getRankColor(position)}`}>
                    <span className="font-bold text-xs sm:text-sm">#{position}</span>
                  </div>
                  
                  {/* Avatar y Nombre */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                      isTop3 ? 'ring-2 ring-yellow-400' : 'ring-1 ring-gray-200'
                    } ${getRankColor(position)}`}>
                      <span className="text-white font-bold text-xl sm:text-2xl">
                        {player.full_name?.[0]?.toUpperCase() || player.email[0]?.toUpperCase() || 'U'}
                      </span>
                      {isTop3 && (
                        <div className="absolute -top-2 -right-2 bg-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-md">
                          <span className="text-xs sm:text-sm">
                            {position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {player.full_name || 'Usuario'}
                        </h3>
                        {isCurrentUser && (
                          <span className="text-[9px] sm:text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-1.5 text-[11px] sm:text-xs text-gray-500">
                        <span className="flex items-center whitespace-nowrap">
                          <Star className="w-3 h-3 text-yellow-500 mr-0.5" />
                          {player.total_points}
                        </span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{winRate}% victorias</span>
                      </div>
                      
                      {/* Estadísticas en móvil */}
                      <div className="sm:hidden flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-medium">{player.games_played}</span>
                          <span className="text-gray-400 text-[10px]">partidas</span>
                        </div>
                        <div className="h-3 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-medium">{player.games_won}</span>
                          <span className="text-gray-400 text-[10px]">victorias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Estadísticas en desktop */}
                  <div className="hidden sm:flex items-center gap-4 ml-4">
                    <div className="text-center min-w-[50px]">
                      <div className="font-bold text-gray-900">{player.games_played}</div>
                      <div className="text-xs text-gray-500">Partidas</div>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div className="text-center min-w-[50px]">
                      <div className="font-bold text-gray-900">{player.games_won}</div>
                      <div className="text-xs text-gray-500">Victorias</div>
                    </div>
                  </div>
                </div>
                
                {/* Barra de progreso (solo para top 3) */}
                {(isTop3 || isCurrentUser) && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-24 sm:w-32 z-10">
                    <div className="text-xs text-gray-500 text-right mb-1 truncate">
                      {Math.round((player.total_points / Math.max(1, topPlayers[0]?.total_points)) * 100)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                        style={{
                          width: `${(player.total_points / Math.max(1, topPlayers[0]?.total_points || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {topPlayers.length === 0 && (
        <Card className="p-6 sm:p-8 text-center">
          <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            Aún no hay jugadores en el ranking
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            ¡Sé el primero en jugar y aparecer en el ranking!
          </p>
        </Card>
      )}
      </motion.div>
      <BottomNavBar />
    </div>
  );
}