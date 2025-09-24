import React from 'react'
import { useGame } from '../contexts/GameContext'
import { GameLobby } from '../components/game/GameLobby'
import { GamePlay } from '../components/game/GamePlay'
import { GameResults } from '../components/game/GameResults'
import { Navigate } from 'react-router-dom'

export const Game: React.FC = () => {
  const { currentGame } = useGame()

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