import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Settings, Plus, Minus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGame } from '../../contexts/GameContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface GameSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  };
  onSave: (settings: {
    max_rounds: number;
    round_time_limit: number;
    stop_countdown: number;
  }) => Promise<void>;
}

export const GameSettingsDialog: React.FC<GameSettingsDialogProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
}) => {
  const [settings, setSettings] = useState(currentSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<{ id: string, name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (data) {
        setAvailableCategories(data);
      }
    };

    fetchCategories();
  }, []);

  // Función helper para convertir segundos a minutos y segundos
  const secondsToMinutesAndSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  };

  // Función helper para convertir minutos y segundos a segundos totales
  const minutesAndSecondsToTotal = (minutes: number, seconds: number) => {
    return minutes * 60 + seconds;
  };

  // Estado separado para minutos y segundos
  const [roundTime, setRoundTime] = useState(secondsToMinutesAndSeconds(settings.round_time_limit));
  const [stopTime, setStopTime] = useState(secondsToMinutesAndSeconds(settings.stop_countdown));

  // Actualizar roundTime cuando cambie settings.round_time_limit
  useEffect(() => {
    setRoundTime(secondsToMinutesAndSeconds(settings.round_time_limit));
  }, [settings.round_time_limit]);

  // Actualizar stopTime cuando cambie settings.stop_countdown
  useEffect(() => {
    setStopTime(secondsToMinutesAndSeconds(settings.stop_countdown));
  }, [settings.stop_countdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseInt(value, 10) || ""
    }));
  };

  const handleTimeChange = (type: 'round' | 'stop', field: 'minutes' | 'seconds', value: number) => {
    if (type === 'round') {
      const newRoundTime = { ...roundTime, [field]: Math.max(0, Math.min(field === 'minutes' ? 5 : 59, value)) };
      setRoundTime(newRoundTime);
      setSettings(prev => ({
        ...prev,
        round_time_limit: minutesAndSecondsToTotal(newRoundTime.minutes, newRoundTime.seconds)
      }));
    } else {
      const newStopTime = { ...stopTime, [field]: Math.max(0, Math.min(field === 'minutes' ? 1 : 59, value)) };
      setStopTime(newStopTime);
      setSettings(prev => ({
        ...prev,
        stop_countdown: minutesAndSecondsToTotal(newStopTime.minutes, newStopTime.seconds)
      }));
    }
  };

  const incrementTime = (type: 'round' | 'stop', field: 'minutes' | 'seconds') => {
    const currentValue = type === 'round' ? roundTime[field] : stopTime[field];
    const maxValue = field === 'minutes' ? (type === 'round' ? 5 : 1) : 59;
    handleTimeChange(type, field, Math.min(maxValue, currentValue + 1));
  };

  const decrementTime = (type: 'round' | 'stop', field: 'minutes' | 'seconds') => {
    const currentValue = type === 'round' ? roundTime[field] : stopTime[field];
    handleTimeChange(type, field, Math.max(0, currentValue - 1));
  };

  const setPresetTime = (type: 'round' | 'stop', totalSeconds: number) => {
    const timeObj = secondsToMinutesAndSeconds(totalSeconds);
    if (type === 'round') {
      setRoundTime(timeObj);
      setSettings(prev => ({
        ...prev,
        round_time_limit: totalSeconds
      }));
    } else {
      setStopTime(timeObj);
      setSettings(prev => ({
        ...prev,
        stop_countdown: totalSeconds
      }));
    }
  };

  const commonRoundTimes = [
    { label: '2:00', seconds: 120 },
    { label: '3:00', seconds: 180 },
    { label: '5:00', seconds: 300 }
  ];

  const commonStopTimes = [
    { label: '0:30', seconds: 30 },
    { label: '0:45', seconds: 45 },
    { label: '1:00', seconds: 60 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(settings);
      toast.success('Configuración actualizada');
      onClose();
    } catch (error) {
      toast.error('Error al actualizar la configuración');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-3xl w-full max-w-md mx-1 sm:mx-2 p-6 z-10 sm:max-h-[90vh] sm:overflow-y-auto shadow-2xl border border-gray-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-6">
          <div className="text-center">
            <Dialog.Title className="text-xl font-black text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              ⚙️ Configuración de la partida
            </Dialog.Title>
          </div>
          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <div className="w-full max-w-[220px]">
              <label htmlFor="max_rounds" className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Número de rondas
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <input
                  type="number"
                  id="max_rounds"
                  name="max_rounds"
                  min="1"
                  max="20"
                  value={settings.max_rounds}
                  onChange={handleChange}
                  className="relative w-full px-5 py-5 text-2xl font-bold text-center border-2 border-blue-200 rounded-2xl shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-400 bg-gradient-to-br from-white via-blue-50 to-blue-100 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-pulse shadow-lg"></div>
                </div>
              </div>
              <div className="text-center mt-4">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">Rondas totales</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tiempo de respuesta
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 items-start">
              {/* Controles manuales */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-yellow-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative flex items-center justify-center space-x-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                  {/* Minutos */}
                  <div className="flex flex-col items-center group/minute">
                    <button
                      type="button"
                      onClick={() => incrementTime('round', 'minutes')}
                      className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={roundTime.minutes >= 5}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="w-14 h-10 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl flex items-center justify-center shadow-inner group-hover/minute:shadow-lg transition-all duration-200">
                      <span className="text-lg font-bold text-gray-800">{roundTime.minutes}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => decrementTime('round', 'minutes')}
                      className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={roundTime.minutes <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium text-blue-600 mt-2 bg-blue-50 px-2 py-0.5 rounded-full">min</span>
                  </div>

                  <div className="text-2xl text-gray-300 font-light">:</div>

                  {/* Segundos */}
                  <div className="flex flex-col items-center group/second">
                    <button
                      type="button"
                      onClick={() => incrementTime('round', 'seconds')}
                      className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={roundTime.seconds >= 59}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="w-14 h-10 bg-gradient-to-br from-white to-yellow-50 border-2 border-yellow-200 rounded-xl flex items-center justify-center shadow-inner group-hover/second:shadow-lg transition-all duration-200">
                      <span className="text-lg font-bold text-gray-800">
                        {roundTime.seconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => decrementTime('round', 'seconds')}
                      className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={roundTime.seconds <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium text-yellow-600 mt-2 bg-yellow-50 px-2 py-0.5 rounded-full">seg</span>
                  </div>
                </div>
              </div>

              {/* Botones de presets */}
              <div className="flex flex-col gap-3 mt-4 sm:mt-0 mx-auto">
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full shadow-sm">Opciones Rápidas</span>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 justify-center">
                  {commonRoundTimes.map((preset) => (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => setPresetTime('round', preset.seconds)}
                      className={`group relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg ${settings.round_time_limit === preset.seconds
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25 scale-105'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-blue-50 hover:to-blue-100 border border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      <span className="relative z-10">{preset.label}</span>
                      {settings.round_time_limit === preset.seconds && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-yellow-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-50 via-white to-yellow-50 border-2 border-blue-200 rounded-2xl px-4 py-3 mt-4 shadow-lg hover:shadow-xl transition-all duration-300 max-w-fit mx-auto">
                <div className="text-center">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-3 py-1 rounded-full">Total Seleccionado</span>
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-600 mt-2">
                    {Math.floor(settings.round_time_limit / 60)}:{(settings.round_time_limit % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tiempo de STOP
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-1.5 items-start">
              {/* Controles manuales */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative flex items-center justify-center space-x-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
                  {/* Minutos */}
                  <div className="flex flex-col items-center group/minute">
                    <button
                      type="button"
                      onClick={() => incrementTime('stop', 'minutes')}
                      className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={stopTime.minutes >= 1}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="w-14 h-10 bg-gradient-to-br from-white to-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center shadow-inner group-hover/minute:shadow-lg transition-all duration-200">
                      <span className="text-lg font-bold text-gray-800">{stopTime.minutes}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => decrementTime('stop', 'minutes')}
                      className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={stopTime.minutes <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium text-red-600 mt-2 bg-red-50 px-2 py-0.5 rounded-full">min</span>
                  </div>

                  <div className="text-2xl text-gray-300 font-light">:</div>

                  {/* Segundos */}
                  <div className="flex flex-col items-center group/second">
                    <button
                      type="button"
                      onClick={() => incrementTime('stop', 'seconds')}
                      className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={stopTime.seconds >= 59}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="w-14 h-10 bg-gradient-to-br from-white to-orange-50 border-2 border-orange-200 rounded-xl flex items-center justify-center shadow-inner group-hover/second:shadow-lg transition-all duration-200">
                      <span className="text-lg font-bold text-gray-800">
                        {stopTime.seconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => decrementTime('stop', 'seconds')}
                      className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={stopTime.seconds <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium text-orange-600 mt-2 bg-orange-50 px-2 py-0.5 rounded-full">seg</span>
                  </div>
                </div>
              </div>

              {/* Botones de presets */}
              <div className="flex flex-col gap-3 mt-4 sm:mt-0 mx-auto">
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full shadow-sm">Opciones Rápidas</span>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 justify-center">
                  {commonStopTimes.map((preset) => (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => setPresetTime('stop', preset.seconds)}
                      className={`group relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg ${settings.stop_countdown === preset.seconds
                          ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-red-500/25 scale-105'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:from-red-50 hover:to-orange-100 border border-gray-200 hover:border-red-300'
                        }`}
                    >
                      <span className="relative z-10">{preset.label}</span>
                      {settings.stop_countdown === preset.seconds && (
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 rounded-xl blur opacity-20"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 rounded-2xl px-4 py-3 mt-4 shadow-lg hover:shadow-xl transition-all duration-300 max-w-fit mx-auto">
                <div className="text-center">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider bg-red-100 px-3 py-1 rounded-full">Total Seleccionado</span>
                  <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 mt-2">
                    {Math.floor(settings.stop_countdown / 60)}:{(settings.stop_countdown % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center space-x-4 p-3 bg-gray-50 rounded-2xl">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </Dialog>
  );
};
