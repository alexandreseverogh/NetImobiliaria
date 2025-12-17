'use client'

import { useState } from 'react'
import { XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface TwoFactorValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (code: string) => void
  action: string
  description?: string
  isRequired: boolean
}

export default function TwoFactorValidationModal({
  isOpen,
  onClose,
  onSuccess,
  action,
  description,
  isRequired
}: TwoFactorValidationModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sendingCode, setSendingCode] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) {
      setError('Código 2FA é obrigatório')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verificar código 2FA
      const response = await fetch('/api/admin/auth/2fa/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess(code.trim())
        onClose()
      } else {
        setError(data.message || 'Código 2FA inválido')
      }
    } catch (error) {
      console.error('Erro ao verificar código 2FA:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    setSendingCode(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth/2fa/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (data.success) {
        alert('Código 2FA enviado para seu e-mail!')
      } else {
        setError(data.message || 'Erro ao enviar código')
      }
    } catch (error) {
      console.error('Erro ao enviar código:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSendingCode(false)
    }
  }

  const handleClose = () => {
    if (!loading && !sendingCode) {
      setCode('')
      setError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {isRequired ? (
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            ) : (
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              Validação 2FA
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading || sendingCode}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Ação */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-1">Ação Requerida</h4>
          <p className="text-blue-800 font-medium">{action}</p>
          {description && (
            <p className="text-blue-700 text-sm mt-1">{description}</p>
          )}
          {isRequired && (
            <div className="mt-2 flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                Esta ação requer autenticação 2FA
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código 2FA */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Código 2FA *
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Digite o código de 6 dígitos"
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite o código de 6 dígitos enviado para seu e-mail
            </p>
          </div>

          {/* Enviar Código */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || loading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingCode ? 'Enviando...' : 'Reenviar código'}
            </button>
            <div className="text-xs text-gray-500">
              Código válido por 10 minutos
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || sendingCode}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || sendingCode || !code.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>Validar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info adicional */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <ShieldCheckIcon className="h-4 w-4 text-gray-600 mt-0.5" />
            <div className="text-xs text-gray-600">
              <p className="font-medium">Sobre a autenticação 2FA:</p>
              <p>• Código enviado para o e-mail cadastrado</p>
              <p>• Válido por 10 minutos após o envio</p>
              <p>• Necessário para alterações críticas de segurança</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


