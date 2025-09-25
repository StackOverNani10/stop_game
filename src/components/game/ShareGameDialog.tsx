import React from 'react';
import { X, Copy, Share2, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface ShareGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameCode: string;
  categories: string[];
  maxRounds: number;
  playerCount: number;
  getCategoryName: (id: string) => string;
}

export const ShareGameDialog: React.FC<ShareGameDialogProps> = ({
  isOpen,
  onClose,
  gameCode,
  categories,
  maxRounds,
  playerCount,
  getCategoryName
}) => {
  const gameUrl = `${window.location.origin}/join/${gameCode}`;
  const shareText = `¡Únete a mi partida de Stop! 🎮\n\n` +
    `Código: ${gameCode}\n` +
    `Rondas: ${maxRounds}\n` +
    `Jugadores: ${playerCount}\n` +
    `Categorías: ${categories.map(catId => getCategoryName(catId)).join(', ')}\n\n` +
    `Haz clic en el enlace para unirte:\n${gameUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('¡Enlace copiado al portapapeles!');
    } catch (error) {
      toast.error('Error al copiar el enlace');
    }
  };

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
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
            Compartir partida
          </Dialog.Title>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Invita a tus amigos a unirse a tu partida. Comparte el siguiente enlace:
          </p>
          
          <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-200">
            <p className="text-sm text-gray-800 whitespace-pre-line">
              {shareText.replace(/\\n/g, '\n')}
            </p>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={copyToClipboard}
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar enlace
          </Button>

          <Button
            onClick={shareOnWhatsApp}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <MessageSquare className="w-4 h-4" />
            Compartir por WhatsApp
          </Button>

          {navigator.share && (
            <Button
              onClick={() => navigator.share({
                title: '¡Únete a mi partida de Stop!',
                text: shareText.replace(/\\n/g, '\n'),
                url: gameUrl,
              })}
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartir usando...
            </Button>
          )}
        </div>
      </motion.div>
    </Dialog>
  );
};
