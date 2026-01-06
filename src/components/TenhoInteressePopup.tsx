'use client'

import { X } from 'lucide-react'
import FinanciadoresSponsorsSection from '@/components/public/FinanciadoresSponsorsSection'
import FinanciamentoInfoSection from '@/components/public/FinanciamentoInfoSection'

interface TenhoInteressePopupProps {
  isOpen: boolean
  onClose: () => void
  onCadastrarClick: () => void
  onLoginClick: () => void
  imovelId: number
  imovelTitulo?: string
}

export default function TenhoInteressePopup({ 
  isOpen, 
  onClose, 
  onCadastrarClick, 
  onLoginClick,
  imovelId,
  imovelTitulo 
}: TenhoInteressePopupProps) {
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
            Tenho Interesse em Alugar ou Comprar
          </h2>

          {/* Patrocinadores (somente se houver registros) */}
          <FinanciadoresSponsorsSection enabled={isOpen} />

          {/* Informações perenes (não dependem de taxa/regra do dia) */}
          <FinanciamentoInfoSection />
          
          <p className="text-gray-700 leading-relaxed">
            Aqui você poderá registrar seu interesse em imóveis e nossa equipe entrará em contato para ajudar você a encontrar o imóvel ideal.
          </p>

          <p className="text-gray-700 leading-relaxed">
            Para registrar seu interesse, primeiro você terá que possuir um cadastro dos seus dados.{' '}
            <button
              onClick={onCadastrarClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              Clique aqui para se cadastrar
            </button>
          </p>

          <p className="text-gray-700 leading-relaxed">
            Se já possui cadastro,{' '}
            <button
              onClick={onLoginClick}
              className="text-primary-600 font-semibold underline hover:text-primary-700 transition-colors"
            >
              clique aqui
            </button>
            {' '}para registrar seu interesse.
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

