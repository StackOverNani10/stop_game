import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, Trophy, Clock, Gamepad2, Star } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CreateGameModal } from '../components/game/CreateGameModal'
import { useAuth } from '../contexts/AuthContext'
import { useGame } from '../contexts/GameContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export const Dashboard: React.FC = () => {
  const { profile, loading: authLoading } = useAuth()
  const { createGame, gameLoading } = useGame()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleCreateGame = async (categories: string[], maxRounds: number) => {
    try {
      const gameCode = await createGame(categories, maxRounds)
      setShowCreateModal(false)
      navigate('/game')
      toast.success(`¡Partida creada! Código: ${gameCode}`)
    } catch (error) {
      console.error('Error creating game:', error)
    }
  }

  // Efecto para manejar la carga del perfil
  useEffect(() => {
    if (!authLoading) {
      // Pequeño retraso para asegurar que la animación de carga se vea
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, profile]);

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

  // Mostrar carga mientras se verifica la autenticación y se carga el perfil
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ¡Bienvenido a STOP! 🎯
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          El clásico juego de palabras ahora online. Crea una partida, invita a tus amigos 
          y demuestra quién tiene el vocabulario más rápido.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 text-center">
              <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Create Game */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-8 text-center h-full flex flex-col justify-center" hoverable>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear Partida</h2>
            <p className="text-gray-600 mb-6 flex-1">
              Inicia una nueva partida, personaliza las categorías y invita a tus amigos a jugar.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="w-full"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Partida
            </Button>
          </Card>
        </motion.div>

        {/* Join Game */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-8 text-center h-full flex flex-col justify-center" hoverable>
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Unirse a Partida</h2>
            <p className="text-gray-600 mb-6 flex-1">
              ¿Tienes un código de partida? Únete a una partida existente y comienza a jugar.
            </p>
            <Button
              onClick={() => navigate('/join')}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Users className="w-5 h-5 mr-2" />
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
      >
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ¿Cómo se juega?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Crear o Unirse</h3>
              <p className="text-sm text-gray-600">
                Crea una nueva partida o únete con un código
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Letra Aleatoria</h3>
              <p className="text-sm text-gray-600">
                Se elige una letra al azar para cada ronda
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Completar Categorías</h3>
              <p className="text-sm text-gray-600">
                Escribe palabras que empiecen con esa letra
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">¡STOP!</h3>
              <p className="text-sm text-gray-600">
                El primero en completar grita STOP y gana puntos
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

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