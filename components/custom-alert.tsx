"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertContextType {
  showAlert: (message: string, type?: AlertType) => void
  hideAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const useCustomAlert = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useCustomAlert must be used within a CustomAlertProvider')
  }
  return context
}

interface CustomAlertProviderProps {
  children: ReactNode
}

export const CustomAlertProvider: React.FC<CustomAlertProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<AlertType>('info')
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const showAlert = (message: string, type: AlertType = 'info') => {
    // Clear any existing timeout
    if (timeoutId) clearTimeout(timeoutId)
    
    setMessage(message)
    setType(type)
    setIsVisible(true)
    
    // Auto hide after 5 seconds
    const id = setTimeout(() => {
      setIsVisible(false)
    }, 5000)
    setTimeoutId(id)
  }

  const hideAlert = () => {
    setIsVisible(false)
    if (timeoutId) clearTimeout(timeoutId)
  }

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      
      {/* Alert UI */}
      {isVisible && (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-[90vw]">
          <div 
            className={cn(
              "flex items-start p-4 rounded-md shadow-lg border animate-in fade-in slide-in-from-top-5 duration-300",
              type === 'success' && "bg-green-50 border-green-200",
              type === 'error' && "bg-red-50 border-red-200",
              type === 'warning' && "bg-yellow-50 border-yellow-200", 
              type === 'info' && "bg-blue-50 border-blue-200"
            )}
          >
            <div className="flex-shrink-0 mr-3">
              {type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              {type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
              {type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
            </div>
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                type === 'success' && "text-green-800",
                type === 'error' && "text-red-800",
                type === 'warning' && "text-yellow-800",
                type === 'info' && "text-blue-800"
              )}>
                {message}
              </p>
            </div>
            <button 
              onClick={hideAlert} 
              className={cn(
                "ml-3 flex-shrink-0 rounded hover:bg-opacity-10 p-1",
                type === 'success' && "hover:bg-green-200 text-green-500",
                type === 'error' && "hover:bg-red-200 text-red-500",
                type === 'warning' && "hover:bg-yellow-200 text-yellow-500",
                type === 'info' && "hover:bg-blue-200 text-blue-500"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
} 