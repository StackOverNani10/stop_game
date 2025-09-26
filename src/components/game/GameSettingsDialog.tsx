import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Settings } from 'lucide-react';
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
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string}[]>([]);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseInt(value, 10) || 0
    }));
  };

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
        className="relative bg-white rounded-lg w-full max-w-md p-6 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Configuración de la partida
          </Dialog.Title>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="max_rounds" className="block text-sm font-medium text-gray-700 mb-1">
              Número de rondas
            </label>
            <input
              type="number"
              id="max_rounds"
              name="max_rounds"
              min="1"
              max="20"
              value={settings.max_rounds}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="round_time_limit" className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo de respuesta (segundos)
            </label>
            <input
              type="number"
              id="round_time_limit"
              name="round_time_limit"
              min="10"
              max="300"
              value={settings.round_time_limit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              required
            />
          </div>

          <div>
            <label htmlFor="stop_countdown" className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo de STOP (segundos)
            </label>
            <input
              type="number"
              id="stop_countdown"
              name="stop_countdown"
              min="5"
              max="60"
              value={settings.stop_countdown}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </motion.div>
    </Dialog>
  );
};
