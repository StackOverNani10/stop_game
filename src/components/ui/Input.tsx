import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

type InputProps = Omit<HTMLMotionProps<'input'>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onDragExit' | 'onDragTransitionEnd'> & {
  label?: string
  error?: string
  as?: React.ElementType
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <motion.input
        whileFocus={{ scale: 1.01 }}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}