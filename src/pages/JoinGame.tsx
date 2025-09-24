import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Hash, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useGame } from '../contexts/GameContext'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

export const JoinGame: React.FC = () => {
  const { joinGame, gameLoading } = useGame()
  const navigate = useNavigate()
  const { code: urlCode } = useParams()
  const [gameCode, setGameCode] = useState(urlCode || '')

  useEffect(() => {
    if (urlCode) {
      setGameCode(urlCode.toUpperCase())
    }
  }, [urlCode])

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!gameCode.trim()) {
      toast.error('Por favor ingresa un código de partida')
      return
    }

    try {
      await joinGame(gameCode.trim())
      navigate('/game')
    } catch (error) {
      console.error('Error joining game:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Unirse a Partida
        </h1>
        <p className="text-gray-600">
          Ingresa el código de la partida para unirte y comenzar a jugar
        </p>
      </motion.div>

      <Card className="p-8">
        <form onSubmit={handleJoinGame} className="space-y-6">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Código de la partida (ej: ABC123)"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              className="pl-10 text-center text-lg font-mono tracking-wider"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            loading={gameLoading}
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Unirse a la Partida
            <ArrowRight className="w-5 h-5" />
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              ¿No tienes un código? Crea tu propia partida
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Consejos:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• El código de partida tiene 6 caracteres (letras y números)</li>
            <li>• Asegúrate de que la partida esté en estado de espera</li>
            <li>• Una vez que te unas, podrás ver a los otros jugadores</li>
            <li>• El anfitrión iniciará la partida cuando todos estén listos</li>
          </ul>
        </Card>
      </motion.div>
    </div>
  )
}