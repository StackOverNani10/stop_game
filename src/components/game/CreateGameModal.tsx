import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { DEFAULT_CATEGORIES } from '../../types/game'
import { motion, AnimatePresence } from 'framer-motion'

interface CreateGameModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGame: (categories: string[], maxRounds: number) => void
  loading?: boolean
}

export const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
  onCreateGame,
  loading = false
}) => {
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES])
  const [maxRounds, setMaxRounds] = useState(5)
  const [newCategory, setNewCategory] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (categories.length >= 3) {
      onCreateGame(categories, maxRounds)
    }
  }

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index))
  }

  const resetToDefaults = () => {
    setCategories([...DEFAULT_CATEGORIES])
    setMaxRounds(5)
    setNewCategory('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          static
          open={isOpen}
          onClose={onClose}
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex min-h-screen items-center justify-center p-4">
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-xl font-bold text-gray-900">
                    Crear Nueva Partida
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Personaliza las categorías y configuración de tu juego
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Game Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Número de rondas"
                      type="number"
                      min="1"
                      max="20"
                      value={maxRounds}
                      onChange={(e) => setMaxRounds(Number(e.target.value))}
                      className="text-center"
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={resetToDefaults}
                        className="w-full"
                      >
                        Restaurar por defecto
                      </Button>
                    </div>
                  </div>

                  {/* Add New Category */}
                  <Card className="p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Agregar Categoría</h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: Color, Marca, Película..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={addCategory}
                        disabled={!newCategory.trim()}
                        size="md"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  {/* Categories List */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Categorías ({categories.length})
                    </h3>
                    {categories.length < 3 && (
                      <p className="text-sm text-red-600 mb-3">
                        Mínimo 3 categorías requeridas
                      </p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <AnimatePresence>
                        {categories.map((category, index) => (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {category}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCategory(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={categories.length < 3}
                    loading={loading}
                    className="flex-1"
                  >
                    Crear Partida
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  )
}