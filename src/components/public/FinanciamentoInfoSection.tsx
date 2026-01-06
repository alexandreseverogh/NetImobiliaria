'use client'

import { useEffect, useState } from 'react'

function Modal({
  title,
  open,
  onClose,
  children
}: {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
          >
            Fechar
          </button>
        </div>
        <div className="px-6 py-5 text-sm text-gray-700 leading-relaxed">{children}</div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinanciamentoInfoSection() {
  const [openSfh, setOpenSfh] = useState(false)
  const [openCet, setOpenCet] = useState(false)
  const [openDocs, setOpenDocs] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-bold text-gray-900 mb-2">Informações sobre financiamento</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenSfh(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50"
          >
            SFH x SFI
          </button>
          <button
            type="button"
            onClick={() => setOpenCet(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50"
          >
            CET
          </button>
          <button
            type="button"
            onClick={() => setOpenDocs(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50"
          >
            Documentos
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Condições e critérios variam conforme o perfil do comprador, o imóvel e a análise do financista.
        </div>
      </div>

      <Modal title="SFH x SFI" open={openSfh} onClose={() => setOpenSfh(false)}>
        No Brasil, o financiamento de imóveis normalmente acontece por duas estruturas: <strong>SFH</strong> e <strong>SFI</strong>. Em termos
        simples, o <strong>SFH</strong> é o modelo mais tradicional do mercado habitacional, enquanto o <strong>SFI</strong> é uma alternativa
        usada em operações que fogem das regras do SFH. Para você, o mais importante é entender que a forma de enquadramento influencia prazos,
        custos e exigências, e que a definição final depende do imóvel e da análise do financista.
      </Modal>

      <Modal title="CET (Custo Efetivo Total)" open={openCet} onClose={() => setOpenCet(false)}>
        Quando você compara financiamentos, não olhe apenas a parcela: compare o <strong>CET (Custo Efetivo Total)</strong>. O CET reúne, em um
        único número, o custo do financiamento ao longo do tempo — incluindo <strong>juros, seguros e tarifas</strong>. É ele que mostra, de
        forma mais justa, quanto você realmente paga para financiar a compra do imóvel.
      </Modal>

      <Modal title="Documentos essenciais" open={openDocs} onClose={() => setOpenDocs(false)}>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Documento de identificação</strong> (RG/CPF ou CNH)
          </li>
          <li>
            <strong>Comprovante de estado civil</strong> (quando aplicável)
          </li>
          <li>
            <strong>Comprovantes de renda</strong> (conforme o perfil)
          </li>
          <li>
            <strong>Declaração de Imposto de Renda</strong> (quando aplicável)
          </li>
          <li>
            <strong>Comprovante de residência</strong>
          </li>
          <li>
            <strong>Dados do imóvel</strong> (endereço e informações do anúncio)
          </li>
          <li>
            <strong>Matrícula/registro do imóvel</strong> (normalmente na etapa de análise do imóvel)
          </li>
          <li>
            <strong>Documentos do vendedor</strong> (normalmente na fase de contratação)
          </li>
        </ul>
      </Modal>
    </>
  )
}


