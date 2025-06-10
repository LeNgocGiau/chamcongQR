"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  type?: 'info' | 'warning' | 'delete'
  onConfirm: () => void
  onCancel?: () => void
}

interface CustomConfirmContextType {
  confirm: (options: Omit<ConfirmDialogProps, 'onConfirm'> & { onConfirm: () => void }) => void
}

const CustomConfirmContext = createContext<CustomConfirmContextType | undefined>(undefined)

export const useCustomConfirm = () => {
  const context = useContext(CustomConfirmContext)
  if (!context) {
    throw new Error('useCustomConfirm must be used within a CustomConfirmProvider')
  }
  return context
}

interface CustomConfirmProviderProps {
  children: ReactNode
}

export const CustomConfirmProvider: React.FC<CustomConfirmProviderProps> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    props: ConfirmDialogProps | null
  }>({
    isOpen: false,
    props: null,
  })

  const confirm = (options: ConfirmDialogProps) => {
    setDialogState({
      isOpen: true,
      props: options,
    })
  }

  const handleConfirm = () => {
    if (dialogState.props?.onConfirm) {
      dialogState.props.onConfirm()
    }
    setDialogState({ isOpen: false, props: null })
  }

  const handleCancel = () => {
    if (dialogState.props?.onCancel) {
      dialogState.props.onCancel()
    }
    setDialogState({ isOpen: false, props: null })
  }

  return (
    <CustomConfirmContext.Provider value={{ confirm }}>
      {children}

      <AlertDialog open={dialogState.isOpen} onOpenChange={() => handleCancel()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {dialogState.props?.type === 'delete' && (
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              )}
              {dialogState.props?.type === 'warning' && (
                <div className="bg-yellow-100 p-2 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              )}
              {(dialogState.props?.type === 'info' || !dialogState.props?.type) && (
                <div className="bg-blue-100 p-2 rounded-full">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <AlertDialogTitle>{dialogState.props?.title || 'Xác nhận'}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-3">
              {dialogState.props?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancel}
              className="focus:ring-0 focus:ring-offset-0"
            >
              {dialogState.props?.cancelLabel || 'Hủy bỏ'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`focus:ring-0 focus:ring-offset-0 ${
                dialogState.props?.type === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : dialogState.props?.type === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : ''
              }`}
            >
              {dialogState.props?.confirmLabel || 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomConfirmContext.Provider>
  )
} 