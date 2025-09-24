import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Play, UserPlus, Users, Clock, Hash, Crown } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useGame } from '../../contexts/GameContext'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const GameLobby: React.FC = () => {
  const { currentGame, startGame, leaveGame, setPlayerReady } = useGame()
  const { user } = useAuth()
  const [ready, setReady] = useState(false)

  if (!currentGame) return null

  const isHost = currentGame.host_id === user?.id
  const gameUrl = `${window.location.origin}/join/${currentGame.code}`
  const allPlayersReady = currentGame.players.length > 1 && currentGame.players.every(p => p.is_ready)

  const copyGameUrl = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl)
      toast.success('Enlace copiado al portapapeles')
    } catch (error) {
      toast.error('Error al copiar enlace')
    }
  }

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(currentGame.code)
      toast.success('Código copiado al portapapeles')
    } catch (error) {
      toast.error('Error al copiar código')
    }
  }

  const handleReadyToggle = async () => {
    const newReadyState = !ready
    setReady(newReadyState)
    await setPlayerReady(newReadyState)
  }

  const handleStartGame = async () => {
    if (isHost && currentGame.players.length >= 2) {
      await startGame()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sala de Espera
        </h1>
        <p className="text-gray-600">
          Esperando jugadores para comenzar la partida
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-500" />
              Información del Juego
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-700 font-semibold text-xl">
                  {currentGame.code}
                </p>
                <p className="text-blue-600 text-sm">Código de la sala</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyGameCode}
                  className="mt-2 w-full"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-700 font-semibold text-xl">
                  {currentGame.max_rounds}
                </p>
                <p className="text-green-600 text-sm">Rondas totales</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Categorías:</h3>
              <div className="flex flex-wrap gap-2">
                {currentGame.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <Button
                onClick={copyGameUrl}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Compartir enlace de invitación
              </Button>
            </div>
          </Card>

          {/* Ready Status */}
          {!isHost && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">¿Estás listo?</h3>
                  <p className="text-sm text-gray-600">
                    Marca cuando estés preparado para jugar
                  </p>
                </div>
                <Button
                  onClick={handleReadyToggle}
                  variant={ready ? 'success' : 'secondary'}
                  className="min-w-24"
                >
                  {ready ? 'Listo ✓' : 'No listo'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Players */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Jugadores ({currentGame.players.length})
            </h2>
            
            <div className="space-y-3">
              {currentGame.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {player.profile.full_name?.[0] || player.profile.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {player.profile.full_name || 'Usuario'}
                        {player.player_id === currentGame.host_id && (
                          <Crown className="w-4 h-4 text-yellow-500 inline ml-1" />
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{player.score} puntos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {player.is_ready && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Listo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {currentGame.players.length < 2 && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mt-4">
                <Clock className="w-4 h-4 inline mr-1" />
                Mínimo 2 jugadores para comenzar
              </p>
            )}
          </Card>

          {/* Start Game */}
          {isHost && (
            <Card className="p-6">
              <Button
                onClick={handleStartGame}
                disabled={currentGame.players.length < 2}
                variant="success"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Iniciar Juego
              </Button>
              {currentGame.players.length >= 2 && !allPlayersReady && (
                <p className="text-sm text-gray-600 text-center mt-2">
                  Puedes iniciar aunque no todos estén listos
                </p>
              )}
            </Card>
          )}

          {/* Leave Game */}
          <Button
            onClick={leaveGame}
            variant="danger"
            size="sm"
            className="w-full"
          >
            Salir de la Partida
          </Button>
        </div>
      </div>
    </div>
  )
}