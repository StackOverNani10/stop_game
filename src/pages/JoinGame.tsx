import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
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
  const [gameCode, setGameCode] = useState(urlCode?.toUpperCase() || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAutoJoining, setIsAutoJoining] = useState(!!urlCode)

  useEffect(() => {
    const joinFromUrl = async () => {
      if (urlCode) {
        const code = urlCode.toUpperCase()
        setGameCode(code)
        // Si hay un código en la URL, intentar unirse automáticamente
        if (code.length >= 4) {
          try {
            await handleJoinGame({ preventDefault: () => {} } as React.FormEvent)
          } catch (error) {
            console.error('Error al unirse automáticamente:', error)
          } finally {
            setIsAutoJoining(false)
          }
        } else {
          setIsAutoJoining(false)
        }
      }
    }

    joinFromUrl()
  }, [urlCode])

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const code = gameCode.trim().toUpperCase()
    
    // Validar formato del código (solo letras y números, 4-6 caracteres)
    if (!code) {
      const errorMsg = 'Por favor ingresa un código de partida'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }
    
    if (!/^[A-Z0-9]{4,6}$/.test(code)) {
      const errorMsg = 'El código debe tener entre 4 y 6 caracteres alfanuméricos'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await joinGame(code)
      // Navegar a la URL del juego con el código
      navigate(`/game/${code}`, { replace: true })
    } catch (error: any) {
      console.error('Error al unirse a la partida:', error)
      let errorMessage = 'Error al unirse a la partida'
      
      // Mensajes de error más descriptivos
      if (error.message.includes('No se encontró la partida')) {
        errorMessage = 'No se encontró ninguna partida con ese código'
      } else if (error.message.includes('ya está en la partida')) {
        errorMessage = 'Ya estás en esta partida'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      toast.error(errorMessage, {
        duration: 4000,
        position: 'top-center'
      })
    } finally {
      setIsLoading(false)
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
            <div className="relative">
              <Input
                type="text"
                placeholder="Código de la partida (ej: ABC123)"
                value={gameCode}
                onChange={(e) => {
                  // Solo permitir letras y números, máximo 6 caracteres
                  const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)
                  setGameCode(value)
                  if (error) setError(null)
                }}
                className={`pl-10 text-center text-lg font-mono tracking-wider ${
                  error ? 'border-red-500 pr-10' : ''
                }`}
                maxLength={6}
                required
                disabled={isLoading}
              />
              {error && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
              )}
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-500 mt-2 text-center flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            loading={isLoading || gameLoading}
            size="lg"
            disabled={!gameCode.trim() || isLoading || gameLoading}
            className="w-full flex items-center justify-center gap-2"
          >
            {isLoading || gameLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isAutoJoining ? 'Buscando partida...' : 'Uniéndose...'}
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Unirse a la Partida
                <ArrowRight className="w-5 h-5" />
              </>
            )}
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