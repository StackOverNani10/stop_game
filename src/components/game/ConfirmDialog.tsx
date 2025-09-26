import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-6"
        >
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-gray-600">{message}</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-4"
            >
              {cancelText}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4"
            >
              {confirmText}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
