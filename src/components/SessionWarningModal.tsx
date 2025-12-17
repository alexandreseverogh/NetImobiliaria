'use client'

import { useState } from 'react'
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface SessionWarningModalProps {
  isOpen: boolean
  timeRemaining: number
  onRenew: () => Promise<boolean>
  onLogout: () => void
  onDismiss: () => void
  username?: string
}

export default function SessionWarningModal({
  isOpen,
  timeRemaining,
  onRenew,
  onLogout,
  onDismiss,
  username = 'Usuário'
}: SessionWarningModalProps) {
  const [isRenewing, setIsRenewing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (!isOpen) return null

  const handleRenew = async () => {
    setIsRenewing(true)
    try {
      const success = await onRenew()
      if (success) {
        onDismiss()
      }
    } finally {
      setIsRenewing(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sessão Expirando
              </h3>
              <p className="text-sm text-gray-600">
                Olá, {username}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ClockIcon className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-gray-900 font-medium">
                Sua sessão expira em {formatTime(timeRemaining)}
              </p>
              <p className="text-sm text-gray-600">
                Após a expiração, você será desconectado automaticamente
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Salve seu trabalho antes que a sessão expire.
                  Você pode renovar sua sessão ou fazer logout agora.
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Tempo restante</span>
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  timeRemaining <= 2 ? 'bg-red-500' : 
                  timeRemaining <= 5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / 30) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 bg-gray-50 rounded-b-lg">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ignorar
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saindo...</span>
              </>
            ) : (
              <>
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Sair Agora</span>
              </>
            )}
          </button>

          <button
            onClick={handleRenew}
            disabled={isRenewing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isRenewing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Renovando...</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4" />
                <span>Renovar Sessão</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}




