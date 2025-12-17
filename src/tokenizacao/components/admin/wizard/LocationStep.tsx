'use client'

import { useState, useEffect } from 'react'
import { Imovel } from '@/lib/types/admin'
// import { API_ENDPOINTS } from '@/lib/config/constants'

interface LocationStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
}

interface MunicipioData {
  estados: {
    sigla: string
    nome: string
    municipios: string[]
  }[]
}

export default function LocationStep({ data, onUpdate, mode }: LocationStepProps) {
  const [municipiosData, setMunicipiosData] = useState<MunicipioData | null>(null)
  const [selectedEstado, setSelectedEstado] = useState(data.endereco?.estado || '')
  const [selectedMunicipio, setSelectedMunicipio] = useState(data.endereco?.cidade || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMunicipios()
  }, [])

  // Atualizar estado local quando data prop mudar (modo de edição)
  useEffect(() => {
    console.log('🔍 LocationStep - data.endereco recebido:', data.endereco)
    console.log('🔍 LocationStep - municipiosData carregado:', !!municipiosData)
    
    if (data.endereco?.estado) {
      console.log('🔍 LocationStep - Atualizando selectedEstado para:', data.endereco.estado)
      setSelectedEstado(data.endereco.estado)
    }
    if (data.endereco?.cidade) {
      console.log('🔍 LocationStep - Atualizando selectedMunicipio para:', data.endereco.cidade)
      setSelectedMunicipio(data.endereco.cidade)
    }
  }, [data.endereco?.estado, data.endereco?.cidade, municipiosData])

  useEffect(() => {
    // Atualizar dados quando seleções mudarem
    if (selectedEstado && selectedMunicipio && municipiosData) {
      const estadoInfo = municipiosData.estados.find(e => e.sigla === selectedEstado)
      if (estadoInfo) {
        onUpdate({
          endereco: {
            endereco: data.endereco?.endereco || '',
            numero: data.endereco?.numero || '',
            complemento: data.endereco?.complemento || '',
            bairro: data.endereco?.bairro || '',
            cidade: selectedMunicipio,
            estado: selectedEstado,
            cep: data.endereco?.cep || ''
          }
        })
      }
    }
  }, [selectedEstado, selectedMunicipio, municipiosData])

  const loadMunicipios = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/municipios')
      if (response.ok) {
        const municipios = await response.json()
        setMunicipiosData(municipios)
      } else {
        console.error('Erro ao carregar municípios')
      }
    } catch (error) {
      console.error('Erro ao carregar municípios:', error)
    } finally {
      setLoading(false)
    }
  }

  const estados = municipiosData ? municipiosData.estados.sort((a, b) => a.nome.localeCompare(b.nome)) : []
  const municipios = selectedEstado && municipiosData 
    ? municipiosData.estados.find(e => e.sigla === selectedEstado)?.municipios.sort() || []
    : []

  console.log('🔍 LocationStep - Renderizando com:', {
    selectedEstado,
    selectedMunicipio,
    estadosCount: estados.length,
    municipiosCount: municipios.length,
    municipiosDataLoaded: !!municipiosData,
    estadosDisponiveis: estados.map(e => e.sigla),
    municipiosDisponiveis: municipios.slice(0, 5) // Primeiros 5 para não poluir o log
  })

  const handleEstadoChange = (estado: string) => {
    setSelectedEstado(estado)
    setSelectedMunicipio('') // Reset município quando estado muda
  }

  const handleMunicipioChange = (municipio: string) => {
    setSelectedMunicipio(municipio)
  }

  const updateEndereco = (field: string, value: string) => {
    onUpdate({
      endereco: {
        endereco: data.endereco?.endereco || '',
        numero: data.endereco?.numero || '',
        complemento: data.endereco?.complemento || '',
        bairro: data.endereco?.bairro || '',
        cidade: data.endereco?.cidade || '',
        estado: data.endereco?.estado || '',
        cep: data.endereco?.cep || '',
        ...data.endereco,
        [field]: value
      }
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Localização do Imóvel</h2>
        <p className="text-gray-600">
          Selecione o estado e município onde o imóvel está localizado.
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado */}
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            id="estado"
            value={selectedEstado}
            onChange={(e) => {
              console.log('🔍 Estado selecionado:', e.target.value)
              handleEstadoChange(e.target.value)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione o estado</option>
            {estados.map((estado) => (
              <option key={estado.sigla} value={estado.sigla}>
                {estado.nome} ({estado.sigla})
              </option>
            ))}
          </select>
        </div>

        {/* Município */}
        <div>
          <label htmlFor="municipio" className="block text-sm font-medium text-gray-700 mb-2">
            Município *
          </label>
          <select
            id="municipio"
            value={selectedMunicipio}
            onChange={(e) => handleMunicipioChange(e.target.value)}
            disabled={!selectedEstado}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          >
            <option value="">Selecione o município</option>
            {municipios.map((municipio) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Informações adicionais do endereço */}
      {selectedEstado && selectedMunicipio && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Informações do Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                    <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      id="endereco"
                      value={data.endereco?.endereco || ''}
                       onChange={(e) => updateEndereco('endereco', e.target.value)}
                placeholder="Rua, Avenida, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                Número
              </label>
              <input
                type="text"
                id="numero"
                value={data.endereco?.numero || ''}
                onChange={(e) => updateEndereco('numero', e.target.value)}
                placeholder="123"
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                type="text"
                id="bairro"
                value={data.endereco?.bairro || ''}
                                 onChange={(e) => updateEndereco('bairro', e.target.value)}
                placeholder="Nome do bairro"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
                Complemento
              </label>
              <input
                type="text"
                id="complemento"
                value={data.endereco?.complemento || ''}
                                 onChange={(e) => updateEndereco('complemento', e.target.value)}
                placeholder="Apto, Bloco, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
                CEP *
              </label>
              <input
                type="text"
                id="cep"
                value={data.endereco?.cep || ''}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d]/g, '')
                  
                  // Não permitir iniciar com zero
                  if (value.length === 1 && value === '0') {
                    return
                  }
                  
                  // Aplicar máscara
                  if (value.length > 5) {
                    value = value.substring(0, 5) + '-' + value.substring(5, 8)
                  }
                  
                  updateEndereco('cep', value)
                }}
                placeholder="00000-000"
                maxLength={9}
                required
                pattern="[1-9]\d{4}-\d{3}"
                title="CEP deve estar no formato 99999-999 e não pode iniciar com zero"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
                  data.endereco?.cep && !/^[1-9]\d{4}-\d{3}$/.test(data.endereco.cep)
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {data.endereco?.cep && !/^[1-9]\d{4}-\d{3}$/.test(data.endereco.cep) && (
                <p className="mt-1 text-sm text-red-600">
                  CEP deve estar no formato 99999-999 e não pode iniciar com zero
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo da localização */}
      {selectedEstado && selectedMunicipio && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
                             <p className="text-sm font-medium text-green-800">
                 Localização selecionada: {selectedMunicipio}, {municipiosData?.estados.find(e => e.sigla === selectedEstado)?.nome || selectedEstado}
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
