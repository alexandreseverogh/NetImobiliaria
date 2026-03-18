'use client'

import { useState, useEffect } from 'react'
import { X, MapPin } from 'lucide-react'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'

interface GeolocationModalProps {
  isOpen: boolean
  onClose: () => void
  city: string
  region?: string
  country?: string
  loading?: boolean
  onConfirmLocation?: (estadoSigla: string, cidadeNome: string) => void
  onSelectOtherLocation?: (estadoSigla: string, cidadeNome: string) => void
  onCloseWithoutClearing?: () => void // Callback para fechar sem limpar valores
}

/**
 * Modal de Geolocalização
 * 
 * Exibe cidade detectada baseada no IP do usuário
 * 
 * Conformidade: GUARDIAN RULES
 * - Incremental: Novo componente isolado
 * - Reutilização: Segue padrão dos modais existentes
 * - UX: Não intrusivo, pode ser fechado facilmente
 */
export default function GeolocationModal({
  isOpen,
  onClose,
  city,
  region,
  country,
  loading,
  onConfirmLocation,
  onSelectOtherLocation,
  onCloseWithoutClearing
}: GeolocationModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [showOtherLocations, setShowOtherLocations] = useState(false)
  const [selectedEstadoId, setSelectedEstadoId] = useState('')
  const [selectedCidadeId, setSelectedCidadeId] = useState('')
  const [shouldClose, setShouldClose] = useState(false) // Estado interno para controlar fechamento

  const { estados, municipios, loadMunicipios } = useEstadosCidades()

  // Fechar modal quando shouldClose for true (sem chamar onClose)
  useEffect(() => {
    if (shouldClose && isOpen) {
      console.log('🔍 [GEOLOCATION MODAL] shouldClose=true, resetando estados internos')
      // Resetar estados internos
      setShowOtherLocations(false)
      setSelectedEstadoId('')
      setSelectedCidadeId('')
      setShouldClose(false)
      // O modal será fechado através do onCloseWithoutClearing na landing page
    }
  }, [shouldClose, isOpen])

  // Tentar mapear região detectada para estado brasileiro
  useEffect(() => {
    if (isOpen && region && !showOtherLocations && estados.length > 0) {
      // Tentar encontrar estado pelo nome da região
      const estadoEncontrado = estados.find(e =>
        e.nome.toLowerCase().includes(region.toLowerCase()) ||
        region.toLowerCase().includes(e.nome.toLowerCase()) ||
        e.sigla.toLowerCase() === region.toLowerCase()
      )

      if (estadoEncontrado && estadoEncontrado.id !== selectedEstadoId) {
        console.log('🔍 [GEOLOCATION MODAL] Mapeando região detectada para estado:', estadoEncontrado.nome)
        setSelectedEstadoId(estadoEncontrado.id)
        loadMunicipios(estadoEncontrado.id)
      }
    }
  }, [isOpen, region, estados, showOtherLocations, loadMunicipios, selectedEstadoId])

  // Tentar mapear cidade detectada após municípios serem carregados
  useEffect(() => {
    if (isOpen && city && selectedEstadoId && municipios.length > 0 && !showOtherLocations) {
      const cidadeEncontrada = municipios.find(m =>
        m.nome.toLowerCase() === city.toLowerCase() ||
        m.nome.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(m.nome.toLowerCase())
      )
      if (cidadeEncontrada && cidadeEncontrada.id !== selectedCidadeId) {
        console.log('🔍 [GEOLOCATION MODAL] Mapeando cidade detectada:', cidadeEncontrada.nome)
        setSelectedCidadeId(cidadeEncontrada.id)
      }
    }
  }, [isOpen, city, selectedEstadoId, municipios, showOtherLocations, selectedCidadeId])

  if (!isOpen) return null

  const handleClose = () => {
    // Se usuário marcou "Não mostrar novamente", armazenar preferência
    if (dontShowAgain) {
      localStorage.setItem('geolocation-modal-dismissed', 'true')
      console.log('✅ [GEOLOCATION MODAL] Usuário optou por não mostrar novamente')
    }

    // Resetar estados
    setShowOtherLocations(false)
    setSelectedEstadoId('')
    setSelectedCidadeId('')

    // Chamar onClose apenas quando usuário fecha manualmente
    onClose()
  }

  const handleCloseWithoutCallback = () => {
    // Fechar modal sem chamar onClose (quando localização é confirmada)
    console.log('🔍 [GEOLOCATION MODAL] Fechando modal sem chamar onClose (localização confirmada)')
    // Resetar estados internos
    setShowOtherLocations(false)
    setSelectedEstadoId('')
    setSelectedCidadeId('')
    // Chamar callback especial que não limpa valores na landing page
    if (onCloseWithoutClearing) {
      onCloseWithoutClearing()
    } else {
      // Fallback: usar shouldClose se callback não estiver disponível
      setShouldClose(true)
    }
  }

  const handleConfirmDetectedLocation = () => {
    // Se tiver estado e cidade mapeados, usar eles
    if (selectedEstadoId && selectedCidadeId) {
      const estado = estados.find(e => e.id === selectedEstadoId)
      const cidade = municipios.find(m => m.id === selectedCidadeId)

      if (estado && cidade && onConfirmLocation) {
        console.log('✅ [GEOLOCATION MODAL] Confirmando localização detectada (mapeada):', estado.sigla, cidade.nome)
        // Chamar callback ANTES de fechar
        onConfirmLocation(estado.sigla, cidade.nome)
        // Fechar modal sem chamar onClose para não limpar valores na landing page
        handleCloseWithoutCallback()
        return
      }
    }

    // Se não tiver mapeamento automático, tentar usar a cidade detectada diretamente
    // e deixar o usuário selecionar o estado manualmente depois
    console.log('⚠️ [GEOLOCATION MODAL] Localização detectada mas sem mapeamento automático')
    console.log('⚠️ [GEOLOCATION MODAL] Cidade detectada:', city, 'Região:', region)

    // Fechar modal - usuário pode usar os filtros manualmente
    handleClose()
  }

  const handleConfirmOtherLocation = () => {
    if (selectedEstadoId && selectedCidadeId) {
      const estado = estados.find(e => e.id === selectedEstadoId)
      const cidade = municipios.find(m => m.id === selectedCidadeId)

      if (estado && cidade && onSelectOtherLocation) {
        console.log('✅ [GEOLOCATION MODAL] Confirmando localização manual:', estado.sigla, cidade.nome)
        // Chamar callback ANTES de fechar
        onSelectOtherLocation(estado.sigla, cidade.nome)
        // Fechar modal sem chamar onClose para não limpar valores na landing page
        handleCloseWithoutCallback()
        return
      }
    }
    handleClose()
  }

  const handleEstadoChange = (estadoId: string) => {
    setSelectedEstadoId(estadoId)
    setSelectedCidadeId('')
    if (estadoId) {
      loadMunicipios(estadoId)
    }
  }

  const isLoading = loading === true
  const hasDetectedLocation = Boolean(city || region || country)

  // Formatar localização completa
  const locationParts = [city, region, country].filter(Boolean)
  const fullLocation = locationParts.join(', ') || city || 'sua região'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Conteúdo */}
        <div className="space-y-4">
          {/* Header com ícone */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <h2>
              🏠 Imovitec
            </h2>
          </div>

          {/* Mensagem principal */}
          {isLoading ? (
            <div className="space-y-3">
              <p className="text-lg text-gray-700 leading-relaxed">
                <span className="font-semibold text-primary-600">📍 Detectando sua localização...</span>
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 flex items-center justify-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-gray-800">
                  Aguarde alguns segundos
                </p>
              </div>
              <p className="text-xs text-gray-500 italic">
                * Localização aproximada baseada no seu endereço IP
              </p>
            </div>
          ) : !hasDetectedLocation ? (
            <div className="space-y-3">
              <p className="text-lg text-gray-700 leading-relaxed">
                <span className="font-semibold text-primary-600">📍 Não foi possível detectar sua localização automaticamente.</span>
              </p>
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 text-center">
                  Se preferir, selecione Estado e Cidade manualmente abaixo.
                </p>
              </div>
              <p className="text-xs text-gray-500 italic">
                * Localização aproximada baseada no seu endereço IP
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-lg text-gray-700 leading-relaxed">
                <span className="font-semibold text-primary-600">📍 Detectamos que você está em:</span>
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-xl font-bold text-gray-900 text-center">
                  {fullLocation}
                </p>
              </div>

              <p className="text-gray-600 leading-relaxed mt-4">
                Estamos mostrando os melhores imóveis disponíveis na sua região!
              </p>

              <p className="text-xs text-gray-500 italic mt-2">
                * Localização aproximada baseada no seu endereço IP
              </p>
            </div>
          )}

          {/* Checkbox "Não mostrar novamente" */}
          {!isLoading && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label
                htmlFor="dontShowAgain"
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                Não mostrar esta mensagem novamente
              </label>
            </div>
          )}

          {/* Seleção de Outras Localizações */}
          {showOtherLocations && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700">
                Selecione Estado e Cidade:
              </p>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <EstadoSelect
                  value={selectedEstadoId}
                  onChange={handleEstadoChange}
                  placeholder="Selecione um estado"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  format="nome-sigla"
                  showAllOption={true}
                  allOptionLabel="Selecione um estado"
                />
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <select
                  value={selectedCidadeId}
                  onChange={(e) => setSelectedCidadeId(e.target.value)}
                  disabled={!selectedEstadoId || municipios.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione uma cidade</option>
                  {municipios.map((cidade) => (
                    <option key={cidade.id} value={cidade.id}>
                      {cidade.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão Confirmar Seleção Manual */}
              <button
                onClick={handleConfirmOtherLocation}
                disabled={!selectedEstadoId || !selectedCidadeId}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
              >
                Confirmar Localização Selecionada
              </button>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col gap-3 pt-4">
            {!showOtherLocations ? (
              <>
                <div className="space-y-2">
                  <button
                    onClick={handleConfirmDetectedLocation}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    {selectedEstadoId && selectedCidadeId
                      ? 'Confirmar Localização Detectada'
                      : 'Entendi (usar filtros manualmente)'}
                  </button>
                  {/* Texto LGPD abaixo do botão de confirmar */}
                  <p className="text-xs text-black text-center">
                    Em cumprimento à LGPD (Lei Geral de Proteção de Dados) estamos solicitando a sua autorização
                  </p>
                  {/* Botão para não confirmar localização detectada */}
                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-2 bg-blue-200 border border-blue-300 text-blue-800 rounded-lg font-semibold hover:bg-blue-300 transition-colors duration-200"
                  >
                    Não quero confirmar essa localização detectada
                  </button>
                </div>
                <button
                  onClick={() => setShowOtherLocations(true)}
                  className="w-full px-4 py-2 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Quero visualizar Imóveis de Outras localizações
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
                >
                  Fechar
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowOtherLocations(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
              >
                Voltar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

