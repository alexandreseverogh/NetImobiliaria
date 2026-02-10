'use client'

import { X } from 'lucide-react'

interface VenderPopupProps {
  isOpen: boolean
  onClose: () => void
  onCadastrarClick: (finalidade: number) => void
  onLoginClick: (finalidade: number) => void
}

export default function VenderPopup({ isOpen, onClose, onCadastrarClick, onLoginClick }: VenderPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Conteúdo */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vender ou Alugar o seu Imóvel
          </h2>

          <p className="text-gray-700 leading-relaxed mb-6">
            Aqui você poderá anunciar o seu imóvel e iremos ajudar a encontrar alguém interessado na sua oferta.
          </p>

          <p className="text-gray-700 leading-relaxed">
            Para cadastrar o seu imóvel, primeiro você terá que possuir um cadastro dos seus dados.{' '}
            <button
              onClick={() => onCadastrarClick(0)}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              Clique aqui para se cadastrar
            </button>
          </p>

          <p className="text-gray-700 leading-relaxed">
            Se já possui cadastro,{' '}
            <button
              onClick={() => onLoginClick(0)}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              clique aqui
            </button>
            {' '}para cadastrar seu imóvel.
          </p>
        </div>

        {/* Botão Fechar no rodapé */}
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

