import React from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hoverable = false 
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.02, y: -2 } : {}}
      className={`
        bg-white rounded-xl shadow-lg border border-gray-100
        transition-shadow duration-200
        ${hoverable ? 'hover:shadow-xl cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}