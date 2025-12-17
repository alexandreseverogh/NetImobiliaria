'use client'

import { useState, useEffect } from 'react'
import { X, Send, Phone, Mail, MessageSquare } from 'lucide-react'

interface TenhoInteresseFormModalProps {
  isOpen: boolean
  onClose: () => void
  imovelId: number
  imovelTitulo?: string
  onSuccess?: () => void
}

export default function TenhoInteresseFormModal({
  isOpen,
  onClose,
  imovelId,
  imovelTitulo,
  onSuccess
}: TenhoInteresseFormModalProps) {
  const [formData, setFormData] = useState({
    telefone: '',
    mensagem: '',
    preferenciaContato: 'telefone' as 'telefone' | 'email' | 'ambos' | 'whatsapp'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Obter dados do usuário logado para preencher campos
  const userData = typeof window !== 'undefined' ? localStorage.getItem('public-user-data') : null
  const user = userData ? JSON.parse(userData) : null

  // Prevenir fechamento com ESC quando está em modo de sucesso
  useEffect(() => {
    if (!isOpen || !success) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, success])

  // Verificar se o cliente está logado quando o modal é aberto e preencher telefone padrão
  useEffect(() => {
    if (isOpen) {
      if (!userData) {
        setError('Você precisa estar logado para registrar interesse')
        // Fechar modal após 2 segundos se não estiver logado
        setTimeout(() => {
          onClose()
        }, 2000)
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        if (parsedUser.userType !== 'cliente' || !parsedUser.uuid) {
          setError('Apenas clientes podem registrar interesse')
          // Fechar modal após 2 segundos se não for cliente
          setTimeout(() => {
            onClose()
          }, 2000)
          return
        }

        // Preencher telefone padrão do usuário se disponível
        if (parsedUser.telefone) {
          setFormData(prev => {
            // Só atualizar se ainda não tiver telefone preenchido
            if (!prev.telefone) {
              return {
                ...prev,
                telefone: parsedUser.telefone
              }
            }
            return prev
          })
        }
      } catch (error) {
        setError('Erro ao verificar autenticação')
        setTimeout(() => {
          onClose()
        }, 2000)
        return
      }
    } else {
      // Resetar formulário quando modal fechar
      setFormData({
        telefone: '',
        mensagem: '',
        preferenciaContato: 'telefone' as 'telefone' | 'email' | 'ambos' | 'whatsapp'
      })
      setError('')
      setSuccess(false)
    }
  }, [isOpen, onClose, userData])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Obter dados do cliente logado
      const userData = localStorage.getItem('public-user-data')
      if (!userData) {
        setError('Você precisa estar logado para registrar interesse')
        setLoading(false)
        return
      }

      const user = JSON.parse(userData)
      if (user.userType !== 'cliente' || !user.uuid) {
        setError('Apenas clientes podem registrar interesse')
        setLoading(false)
        return
      }

      // Registrar interesse na tabela imovel_prospects
      const response = await fetch('/api/public/imoveis/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovelId,
          clienteUuid: user.uuid,
          preferenciaContato: formData.preferenciaContato || null,
          mensagem: formData.mensagem || null
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        // Não fechar automaticamente - usuário deve clicar no botão Fechar
      } else {
        setError(data.message || 'Erro ao registrar interesse')
      }
    } catch (error: any) {
      console.error('❌ Erro ao registrar interesse:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // Não permitir fechar clicando fora quando está em modo de sucesso
        if (!success && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
        {/* Botão Fechar - apenas quando não está em modo de sucesso */}
        {!success && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Conteúdo */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tenho Interesse neste Imóvel
          </h2>
          
          {imovelTitulo && (
            <p className="text-sm text-gray-600 mb-4 italic border-l-4 border-primary-600 pl-3">
              {imovelTitulo}
            </p>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold text-lg mb-2">
                  Obrigado por nos contactar!
                </p>
                <p className="text-green-800 font-semibold">
                  ✅ Seu interesse foi registrado com sucesso!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Nossa equipe entrará em contato em breve.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose()
                  if (onSuccess) onSuccess()
                  // Resetar formulário
                  setFormData({
                    telefone: '',
                    mensagem: '',
                    preferenciaContato: 'telefone' as 'telefone' | 'email' | 'ambos' | 'whatsapp'
                  })
                  setSuccess(false)
                }}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefone para Contato *
                </label>
                <input
                  type="text"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Preferência de Contato */}
              <div>
                <label htmlFor="preferenciaContato" className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Preferência de Contato
                </label>
                <select
                  id="preferenciaContato"
                  name="preferenciaContato"
                  value={formData.preferenciaContato}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="telefone">Telefone</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="ambos">Telefone e Email</option>
                </select>
              </div>

              {/* Mensagem */}
              <div>
                <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Mensagem (Opcional)
                </label>
                <textarea
                  id="mensagem"
                  name="mensagem"
                  value={formData.mensagem}
                  onChange={handleChange}
                  placeholder="Deixe uma mensagem sobre seu interesse neste imóvel..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.telefone}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Registrar Interesse
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

