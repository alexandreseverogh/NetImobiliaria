/* eslint-disable */
'use client'

import { ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface RascunhoStatusBarProps {
  rascunho: {
    id: number
    imovelId: number
    timestampInicio: string
    alteracoes: {
      imagens: { adicionadas: string[], removidas: string[] }
      documentos: { adicionados: string[], removidos: string[] }
    }
  }
  onDescartar: () => void
  loading?: boolean
}

export default function RascunhoStatusBar({ 
  rascunho, 
  onDescartar, 
  loading = false 
}: RascunhoStatusBarProps) {
  
  const calcularTempoDecorrido = (timestampInicio: string) => {
    const inicio = new Date(timestampInicio)
    const agora = new Date()
    const diffMs = agora.getTime() - inicio.getTime()
    const diffMinutos = Math.floor(diffMs / 60000)
    
    if (diffMinutos < 1) return 'hÃ¡ poucos segundos'
    if (diffMinutos < 60) return `hÃ¡ ${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''}`
    
    const diffHoras = Math.floor(diffMinutos / 60)
    return `hÃ¡ ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`
  }

  const contarAlteracoes = () => {
    const { imagens, documentos } = rascunho.alteracoes
    const totalImagens = imagens.adicionadas.length + imagens.removidas.length
    const totalDocumentos = documentos.adicionados.length + documentos.removidos.length
    
    return totalImagens + totalDocumentos
  }

  const totalAlteracoes = contarAlteracoes()

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Modo EdiÃ§Ã£o Ativo</strong> - Use "Salvar AlteraÃ§Ãµes" no final para confirmar
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Iniciado {calcularTempoDecorrido(rascunho.timestampInicio)} â€¢ 
                {totalAlteracoes > 0 ? ` ${totalAlteracoes} alteraÃ§Ã£o${totalAlteracoes > 1 ? 'Ãµes' : ''} pendente${totalAlteracoes > 1 ? 's' : ''}` : ' Nenhuma alteraÃ§Ã£o ainda'}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={onDescartar}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Cancelar EdiÃ§Ã£o
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Detalhes das alteraÃ§Ãµes */}
          {totalAlteracoes > 0 && (
            <div className="mt-2 text-xs text-yellow-600">
              <details className="cursor-pointer">
                <summary className="hover:text-yellow-700">Ver detalhes das alteraÃ§Ãµes</summary>
                <div className="mt-1 pl-4 space-y-1">
                  {rascunho.alteracoes.imagens.adicionadas.length > 0 && (
                    <div>â€¢ {rascunho.alteracoes.imagens.adicionadas.length} imagem(ns) adicionada(s)</div>
                  )}
                  {rascunho.alteracoes.imagens.removidas.length > 0 && (
                    <div>â€¢ {rascunho.alteracoes.imagens.removidas.length} imagem(ns) removida(s)</div>
                  )}
                  {rascunho.alteracoes.documentos.adicionados.length > 0 && (
                    <div>â€¢ {rascunho.alteracoes.documentos.adicionados.length} documento(s) adicionado(s)</div>
                  )}
                  {rascunho.alteracoes.documentos.removidos.length > 0 && (
                    <div>â€¢ {rascunho.alteracoes.documentos.removidos.length} documento(s) removido(s)</div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

