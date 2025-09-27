import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CountdownConfig {
  gameId: string;
  hostId: string;
  userId: string;
  onCountdownStart?: (initialCountdown: number) => void;
  onCountdownUpdate?: (countdown: number) => void;
  onCountdownEnd?: () => void;
}

export const useCountdown = ({ gameId, hostId, userId, onCountdownStart, onCountdownUpdate, onCountdownEnd }: CountdownConfig) => {
  useEffect(() => {
    if (!gameId) return;

    const countdownChannel = supabase
      .channel(`game_countdown_${gameId}`)
      .on('broadcast', { event: 'countdown_start' }, (payload) => {
        // Procesar para todos los jugadores (incluyendo el host)
        if (payload.payload.game_id === gameId) {
          const elapsed = Math.floor((Date.now() - payload.payload.timestamp) / 1000);
          const countdownValue = Math.max(0, 10 - elapsed);

          if (countdownValue > 0) {
            // Iniciar countdown local
            startLocalCountdown(countdownValue);
          } else {
            // Si ya terminó, solo el anfitrión inicia el juego
            if (userId === hostId) {
              onCountdownEnd?.();
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(countdownChannel);
    };
  }, [gameId, hostId, userId, onCountdownStart, onCountdownUpdate, onCountdownEnd]);

  const startLocalCountdown = (initialValue: number) => {
    let countdown = initialValue;

    const updateCountdown = () => {
      if (countdown <= 0) {
        // Solo el anfitrión inicia el juego cuando termina el countdown local
        if (userId === hostId) {
          onCountdownEnd?.();
        }
        return;
      }

      onCountdownUpdate?.(countdown);
      countdown--;

      setTimeout(updateCountdown, 1000);
    };

    updateCountdown();
  };

  const notifyCountdownStartToOthers = async () => {
    try {
      const channel = supabase.channel(`game_countdown_${gameId}`);
      await channel.send({
        type: 'broadcast',
        event: 'countdown_start',
        payload: {
          game_id: gameId,
          starting_countdown: 10,
          timestamp: Date.now()
        }
      });

      // Iniciar countdown local inmediatamente para el host
      startLocalCountdown(10);
    } catch (error) {
      console.error('Error notifying countdown start:', error);
    }
  };

  return {
    notifyCountdownStartToOthers,
    startLocalCountdown
  };
};
