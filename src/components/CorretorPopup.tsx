'use client'

import { X } from 'lucide-react'

interface CorretorPopupProps {
  isOpen: boolean
  onClose: () => void
  onCadastrarClick: () => void
  onLoginClick: () => void
}

export default function CorretorPopup({ isOpen, onClose, onCadastrarClick, onLoginClick }: CorretorPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro de Corretor</h2>

          <p className="text-gray-700 leading-relaxed">
            Aqui você poderá efetuar o seu cadastro como corretor, sendo obrigatório o preenchimento do seu{' '}
            <strong>CRECI</strong>, o qual será validado por nossa equipe.{' '}
            <button
              type="button"
              onClick={onCadastrarClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              Clique aqui para se cadastrar.
            </button>
          </p>

          <p className="text-gray-700 leading-relaxed">
            Se já possui cadastro,{' '}
            <button
              type="button"
              onClick={onLoginClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              clique aqui para se logar na plataforma.
            </button>
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}


