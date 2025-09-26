import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { BottomNavBar } from '../components/layout/BottomNavBar'
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto px-4 py-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Unirse a Partida
          </h1>
          <p className="text-gray-600">
            Ingresa el código de la partida a la que deseas unirte
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleJoinGame} className="space-y-6">
            <div>
              <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-1">
                Código de Partida
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="gameCode"
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  className="pl-10 text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || gameLoading}
            >
              {isLoading || gameLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uniéndose...
                </>
              ) : (
                <>
                  Unirse a Partida
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              className="w-full"
            >
              Volver al Inicio
            </Button>
          </div>
        </Card>

        <div className="mt-8">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">💡 Consejos:</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• El código de partida tiene 6 caracteres (letras y números)</li>
              <li>• Asegúrate de que la partida esté en estado de espera</li>
              <li>• Una vez que te unas, podrás ver a los otros jugadores</li>
              <li>• El anfitrión iniciará la partida cuando todos estén listos</li>
            </ul>
          </Card>
        </div>
      </motion.div>
      <BottomNavBar />
    </div>
  )
}