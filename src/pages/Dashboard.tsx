import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Trophy, Gamepad2, Star } from 'lucide-react'
import { BottomNavBar } from '../components/layout/BottomNavBar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CreateGameModal } from '../components/game/CreateGameModal'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAutoReconnect } from '../hooks/useAutoReconnect'

export const Dashboard: React.FC = () => {
  const { profile, loading: authLoading, user } = useAuth()
  const { createGame, gameLoading } = useGame()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Hook para reconectar automáticamente a juegos activos
  useAutoReconnect()

  const handleCreateGame = async (categoryIds: string[], maxRounds: number) => {
    try {
      const gameCode = await createGame(categoryIds, maxRounds)
      setShowCreateModal(false)
      // Navegar a la URL con el código del juego
      navigate(`/game/${gameCode}`, { replace: true })
      toast.success(`¡Partida creada! Código: ${gameCode}`)
    } catch (error) {
      console.error('Error creating game:', error)
      toast.error('Error al crear la partida. Por favor intenta de nuevo.')
    }
  }

  // Si aún está cargando la autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, redirigir a /auth
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  const stats = [
    {
      label: 'Partidas Jugadas',
      value: profile?.games_played ?? 0,
      icon: Gamepad2,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      label: 'Victorias',
      value: profile?.games_won ?? 0,
      icon: Trophy,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100'
    },
    {
      label: 'Puntos Totales',
      value: profile?.total_points ?? 0,
      icon: Star,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-12 px-2"
      >
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
          ¡Bienvenido a STOP! 🎯
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          El clásico juego de palabras ahora online. Crea una partida, invita a tus amigos
          y demuestra quién tiene el vocabulario más rápido.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="h-full"
          >
            <Card className="p-3 sm:p-4 md:p-6 text-center h-full">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${stat.bg} rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0 sm:mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 h-8 sm:h-auto">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-12">
        {/* Create Game */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.3 }}
          className="h-full"
        >
          <Card className="p-4 sm:p-6 md:p-8 text-center h-full flex flex-col justify-center" hoverable>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Crear Partida</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 flex-1">
              Inicia una nueva partida, personaliza las categorías y juega con amigos.
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)} 
              size="lg" 
              className="w-full py-2 sm:py-3 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              Nueva Partida
            </Button>
          </Card>
        </motion.div>

        {/* Join Game */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ delay: 0.4 }}
          className="h-full"
        >
          <Card className="p-4 sm:p-6 md:p-8 text-center h-full flex flex-col justify-center" hoverable>
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Unirse a Partida</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 flex-1">
              ¿Tienes un código de partida? Únete y comienza a jugar.
            </p>
            <Button 
              onClick={() => navigate('/join')} 
              variant="secondary" 
              size="lg" 
              className="w-full py-2 sm:py-3 text-sm sm:text-base"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              Unirse con Código
            </Button>
          </Card>
        </motion.div>
      </div>

      {/* How to Play */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5 }}
        className="mb-16 sm:mb-8"
      >
        <Card className="p-4 sm:p-6 md:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">¿Cómo se juega?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {['Crear o Unirse', 'Letra Aleatoria', 'Completar Categorías', '¡STOP!'].map((title, i) => (
              <div key={i} className="text-center px-1">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 font-bold text-sm sm:text-base md:text-lg 
                  ${i === 0 ? 'bg-blue-100 text-blue-600' :
                    i === 1 ? 'bg-green-100 text-green-600' :
                      i === 2 ? 'bg-purple-100 text-purple-600' :
                        'bg-yellow-100 text-yellow-600'}`}>
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 sm:mb-2">{title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-tight sm:leading-normal">
                  {i === 0 && 'Crea o únete con un código'}
                  {i === 1 && 'Letra al azar cada ronda'}
                  {i === 2 && 'Escribe palabras que empiecen con esa letra'}
                  {i === 3 && 'Grita STOP al terminar para ganar puntos'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNavBar />

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateGame={handleCreateGame}
        loading={gameLoading}
      />
    </div>
  )
}
