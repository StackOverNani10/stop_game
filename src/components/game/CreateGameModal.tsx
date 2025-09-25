import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X, Plus, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { Category } from '../../types/game'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../../contexts/GameContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

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
  const { availableCategories, categoriesLoading, loadCategories } = useGame()
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [maxRounds, setMaxRounds] = useState(5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCategoryIds.length >= 3) {
      onCreateGame(selectedCategoryIds, maxRounds)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return
    
    try {
      setIsCreatingCategory(true)
      const newCategory = { name: newCategoryName.trim() }
      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory as any)
        .select()
        .single()
      
      if (error) throw error
      
      // Actualizar la lista de categorías disponibles
      loadCategories()
      setNewCategoryName('')
    } catch (error) {
      console.error('Error creando categoría:', error)
      toast.error('Error al crear la categoría')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const resetToDefaults = () => {
    setSelectedCategoryIds([])
    setMaxRounds(5)
    setNewCategoryName('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          className="relative z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={onClose}
        >
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
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

                  <Card className="p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Crear Nueva Categoría</h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre de la categoría"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), createNewCategory())}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={createNewCategory}
                        disabled={!newCategoryName.trim() || isCreatingCategory}
                        loading={isCreatingCategory}
                        size="md"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>

                  {/* Categories List */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Categorías ({selectedCategoryIds.length})
                    </h3>
                    {selectedCategoryIds.length < 3 && (
                      <p className="text-sm text-red-600 mb-3">
                        Selecciona al menos 3 categorías
                      </p>
                    )}
                    
                    {categoriesLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availableCategories.map((category) => (
                          <div 
                            key={category.id} 
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedCategoryIds.includes(category.id)
                                ? 'bg-indigo-50 border-indigo-200'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleCategory(category.id)}
                          >
                            <div className={`w-5 h-5 rounded border mr-3 flex-shrink-0 flex items-center justify-center ${
                              selectedCategoryIds.includes(category.id)
                                ? 'bg-indigo-600 border-indigo-700'
                                : 'border-gray-300'
                            }`}>
                              {selectedCategoryIds.includes(category.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="font-medium text-gray-800">{category.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                    disabled={selectedCategoryIds.length < 3}
                    loading={loading}
                    className="flex-1"
                  >
                    Crear Partida
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  )
}