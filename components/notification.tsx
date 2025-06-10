"use client"

import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface NotificationProps {
  show: boolean
  type?: NotificationType
  title?: string
  message: string
  duration?: number
  onClose?: () => void
  position?: 'top' | 'bottom'
}

export function Notification({
  show,
  type = 'info',
  title,
  message,
  duration = 3000,
  onClose,
  position = 'top',
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  // When the show prop changes, update the visibility state
  useEffect(() => {
    if (show) {
      setIsVisible(true)
      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false)
          if (onClose) onClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [show, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed z-50 w-80 max-w-[90vw] rounded-lg shadow-lg',
            position === 'top' ? 'top-4' : 'bottom-4',
            'left-1/2 -translate-x-1/2'
          )}
        >
          <div
            className={cn(
              'flex items-start p-4 rounded-lg border',
              type === 'success' && 'bg-green-50 border-green-200',
              type === 'error' && 'bg-red-50 border-red-200',
              type === 'warning' && 'bg-yellow-50 border-yellow-200',
              type === 'info' && 'bg-blue-50 border-blue-200'
            )}
          >
            <div className="flex-shrink-0 mr-3">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              {title && (
                <p
                  className={cn(
                    'text-sm font-medium',
                    type === 'success' && 'text-green-800',
                    type === 'error' && 'text-red-800',
                    type === 'warning' && 'text-yellow-800',
                    type === 'info' && 'text-blue-800'
                  )}
                >
                  {title}
                </p>
              )}
              <p
                className={cn(
                  'text-sm',
                  type === 'success' && 'text-green-700',
                  type === 'error' && 'text-red-700',
                  type === 'warning' && 'text-yellow-700',
                  type === 'info' && 'text-blue-700'
                )}
              >
                {message}
              </p>
            </div>
            <button
              onClick={() => {
                setIsVisible(false)
                if (onClose) onClose()
              }}
              className={cn(
                'flex-shrink-0 ml-3 rounded hover:bg-opacity-10 p-1',
                type === 'success' && 'hover:bg-green-200 text-green-500',
                type === 'error' && 'hover:bg-red-200 text-red-500',
                type === 'warning' && 'hover:bg-yellow-200 text-yellow-500',
                type === 'info' && 'hover:bg-blue-200 text-blue-500'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Example usage:
/*
const [notification, setNotification] = useState({
  show: false,
  type: 'success' as NotificationType,
  message: '',
});

const showNotification = (message: string, type: NotificationType = 'info') => {
  setNotification({
    show: true,
    type,
    message
  });
};

// In your JSX:
<Notification
  show={notification.show}
  type={notification.type}
  message={notification.message}
  onClose={() => setNotification({ ...notification, show: false })}
/>

// Show a notification:
showNotification('Đã lưu thay đổi thành công!', 'success');
*/ 