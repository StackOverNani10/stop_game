import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAutoReconnect = () => {
  const { user } = useAuth();
  const { checkActiveGame, currentGame } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const reconnectToActiveGame = async () => {
      if (!user || currentGame) return;

      // No redirigir si ya estamos en la página del juego
      if (location.pathname.startsWith('/game/')) {
        return;
      }

      try {
        console.log('Checking for active game on auth...');
        const activeGame = await checkActiveGame();

        if (activeGame) {
          console.log('Auto-reconnecting to game:', activeGame.id);

          // Si el juego está activo, redirigir a la página del juego
          if (['waiting', 'starting', 'playing'].includes(activeGame.status)) {
            navigate(`/game/${activeGame.code}`);
          }
        }
      } catch (error) {
        console.error('Error during auto-reconnection:', error);
      }
    };

    reconnectToActiveGame();
  }, [user, currentGame, checkActiveGame, navigate, location.pathname]);

  return null;
};
