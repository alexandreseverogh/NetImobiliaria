'use client'

import { X } from 'lucide-react'

interface CadastroImovelPopupProps {
  isOpen: boolean
  onClose: () => void
  onCadastrarProprietarioClick: () => void
  onCadastrarImovelClick: () => void
}

export default function CadastroImovelPopup({
  isOpen,
  onClose,
  onCadastrarProprietarioClick,
  onCadastrarImovelClick
}: CadastroImovelPopupProps) {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cadastro de Imóvel</h2>

          <p className="text-gray-700 leading-relaxed">
            Você poderá cadastrar um imóvel na plataforma. Torna-se obrigatório, antes, cadastrar o Proprietário do Imóvel.
          </p>

          <p className="text-gray-700 leading-relaxed">
            Para cadastrar o Proprietário{' '}
            <button
              type="button"
              onClick={onCadastrarProprietarioClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              clique aqui.
            </button>
          </p>

          <p className="text-gray-700 leading-relaxed">
            Para cadastra o Imóvel{' '}
            <button
              type="button"
              onClick={onCadastrarImovelClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              clique aqui.
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


