import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, UserPlus, Users, Clock, Hash, Crown, Copy, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useGame } from '../../contexts/GameContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { ShareGameDialog } from './ShareGameDialog';
import { GameSettingsDialog } from './GameSettingsDialog';
import { ConfirmDialog } from './ConfirmDialog';
import toast from 'react-hot-toast';

export const GameLobby: React.FC = () => {
  const { 
    currentGame, 
    startGame, 
    leaveGame, 
    setPlayerReady, 
    availableCategories, 
    loadCategories, 
    categoriesLoading,
    updateGameSettings 
  } = useGame()
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [localCategories, setLocalCategories] = useState<{id: string, name: string}[]>([])

  // Cargar categorías disponibles cuando se monte el componente
  useEffect(() => {
    const fetchCategories = async () => {
      await loadCategories()
    }
    fetchCategories()
  }, [loadCategories])

  // Sincronizar las categorías disponibles con el estado local
  useEffect(() => {
    if (availableCategories && availableCategories.length > 0 && currentGame?.categories) {
      const loadedCategories = currentGame.categories
        .map(categoryId => {
          const category = availableCategories.find(cat => cat.id === categoryId)
          return category ? { id: categoryId, name: category.name } : { id: categoryId, name: categoryId }
        })
      setLocalCategories(loadedCategories)
    }
  }, [availableCategories, currentGame?.categories])

  if (!currentGame) return null

  const isHost = currentGame.host_id === user?.id
  const gameUrl = `${window.location.origin}/join/${currentGame.code}`
  const allPlayersReady = currentGame.players.length > 1 && currentGame.players.every(p => p.is_ready)

  // Si el juego está iniciando (waiting + starting_countdown), mostrar estado especial
  if (currentGame.status === 'waiting' && currentGame.starting_countdown) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <span className="text-white font-bold text-6xl">
                {currentGame.starting_countdown}
              </span>
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ¡El juego está por comenzar!
            </h1>
            <p className="text-xl text-gray-600">
              Preparándote para la primera ronda...
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  const handleShareClick = () => {
    setShowShareDialog(true)
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
      await startGame();
    }
  };

  const handleUpdateSettings = async (settings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  }) => {
    try {
      // Usar la función del contexto para actualizar la configuración
      await updateGameSettings({
        max_rounds: settings.max_rounds,
        round_time_limit: Number(settings.round_time_limit) || 30,
        stop_countdown: Number(settings.stop_countdown) || 10
      });
    } catch (error) {
      console.error('Error al actualizar la configuración:', error);
      toast.error('Error al actualizar la configuración');
      throw error;
    }
  };
  
  if (!currentGame) return null;
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sala de espera</h1>
            <p className="text-sm text-gray-600">Esperando jugadores para empezar la partida</p>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
                <Button 
                  variant="secondary"
                  onClick={() => setShowSettingsDialog(true)}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 transition-colors shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  Configuración
                </Button>
            )}
          </div>
        </div>
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
                  size="sm"
                  onClick={copyGameCode}
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-100 text-white hover:text-blue-800 border border-blue-600 hover:border-blue-200 transition-all duration-200 flex items-center justify-center gap-1.5 py-1.5 font-medium shadow-sm hover:shadow-md"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar código</span>
                </Button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-700 font-semibold text-xl">
                  {currentGame.max_rounds}
                </p>
                <p className="text-green-600 text-sm">Rondas totales</p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <p className="text-yellow-700 font-semibold text-xl">
                    {currentGame.round_time_limit} seg
                  </p>
                </div>
                <p className="text-yellow-600 text-sm">Tiempo de respuesta</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-red-600" />
                  <p className="text-red-700 font-semibold text-xl">
                    {currentGame.stop_countdown} seg
                  </p>
                </div>
                <p className="text-red-600 text-sm">Tiempo de STOP</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Categorías:</h3>
              <div className="flex flex-wrap gap-2">
                {categoriesLoading ? (
                  <div className="flex gap-2 w-full">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                    ))}
                  </div>
                ) : localCategories.length > 0 ? (
                  localCategories.map((category, index) => (
                    <span
                      key={category.id}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      title={category.name}
                    >
                      {category.name}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500">No hay categorías seleccionadas</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <Button
                onClick={handleShareClick}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invitar jugadores
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
            onClick={() => setShowConfirmLeave(true)}
            variant="danger"
            size="sm"
            className="w-full"
          >
            Salir de la Partida
          </Button>
          
          <ConfirmDialog
            isOpen={showConfirmLeave}
            onClose={() => setShowConfirmLeave(false)}
            onConfirm={leaveGame}
            title={isHost ? "¿Eliminar partida?" : "¿Salir de la partida?"}
            message={
              isHost 
                ? "Eres el anfitrión. Si sales, la partida se eliminará para todos los jugadores. ¿Estás seguro?"
                : "¿Estás seguro de que quieres salir de la partida?"
            }
            confirmText={isHost ? "Sí, eliminar" : "Sí, salir"}
            cancelText="Cancelar"
            isDanger={isHost}
          />
        </div>
      </div>

      <ShareGameDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        gameCode={currentGame.code}
        categories={localCategories}
        maxRounds={currentGame.max_rounds}
        playerCount={currentGame.players?.length || 0}
      />

      {isHost && (
        <GameSettingsDialog
          isOpen={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          currentSettings={{
            max_rounds: currentGame.max_rounds,
            round_time_limit: currentGame.round_time_limit,
            stop_countdown: currentGame.stop_countdown
          }}
          onSave={handleUpdateSettings}
        />
      )}
    </div>
  )
}