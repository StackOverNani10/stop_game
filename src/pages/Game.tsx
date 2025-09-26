import React, { useEffect, useState } from 'react'
import { useGame } from '../contexts/GameContext'
import { GameLobby } from '../components/game/GameLobby'
import { GamePlay } from '../components/game/GamePlay'
import { GameResults } from '../components/game/GameResults'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import LoadingScreen from '../components/screen/LoadingScreen'

export const Game: React.FC = () => {
  const { gameCode } = useParams<{ gameCode: string }>()
  const { currentGame, joinGame } = useGame()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGame = async () => {
      if (!gameCode) {
        navigate('/dashboard')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Verificar si ya estamos en el juego correcto
        if (currentGame?.code === gameCode.toUpperCase()) {
          setIsLoading(false)
          return
        }

        // Intentar cargar el juego directamente por el código
        const { data: game, error } = await supabase
          .from('games')
          .select('*')
          .eq('code', gameCode.toUpperCase())
          .single()

        if (error || !game) {
          setError('No se encontró la partida')
          toast.error('No se encontró la partida')
          navigate('/dashboard')
          return
        }

        // Unirse al juego
        await joinGame(gameCode.toUpperCase())
      } catch (error: any) {
        console.error('Error al cargar la partida:', error)
        setError('Error al cargar la partida')
        toast.error(error.message || 'Error al cargar la partida')
        navigate('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadGame()
  }, [gameCode])

  // Mostrar pantalla de carga
  if (isLoading) {
    return <LoadingScreen message="Cargando partida..." />
  }

  // Mostrar mensaje de error
  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  // Si no hay juego cargado, redirigir al dashboard
  if (!currentGame) {
    return <Navigate to="/dashboard" replace />
  }

  switch (currentGame.status) {
    case 'waiting':
      return <GameLobby />
    case 'playing':
      return <GamePlay />
    case 'finished':
      return <GameResults />
    default:
      return <Navigate to="/dashboard" replace />
  }
}