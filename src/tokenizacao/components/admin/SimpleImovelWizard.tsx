/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { Imovel } from '@/lib/types/admin'

interface SimpleImovelWizardProps {
  onSave: (data: Imovel) => Promise<void>
  onCancel: () => void
  loading?: boolean
  finalidades?: any[]
  tipos?: any[]
}

interface MunicipioData {
  estados: {
    sigla: string
    nome: string
    municipios: string[]
  }[]
}

export default function SimpleImovelWizard({ 
  onSave, 
  onCancel, 
  loading = false,
  finalidades = [],
  tipos = []
}: SimpleImovelWizardProps) {
  const [formData, setFormData] = useState<Partial<Imovel>>({
    titulo: '',
    descricao: '',
    tipo: '',
    finalidade: '',
    preco: 0,
    precoCondominio: 0,
    precoIPTU: 0,
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    areaTotal: 0,
    areaConstruida: 0,
    quartos: 0,
    banheiros: 0,
    suites: 0,
    vagasGaragem: 0,
    andar: 0,
    totalAndares: 0,
    mobiliado: false,
    destaque: false,
    status: 'ATIVO'
  })

  const [municipiosData, setMunicipiosData] = useState<MunicipioData | null>(null)
  const [municipios, setMunicipios] = useState<string[]>([])

  // Carregar dados dos municÃ­pios
  useEffect(() => {
    const loadMunicipios = async () => {
      try {
        const response = await fetch('/api/admin/municipios')
        if (response.ok) {
          const data = await response.json()
          setMunicipiosData(data)
        }
      } catch (error) {
        console.error('Erro ao carregar municÃ­pios:', error)
      }
    }
    
    loadMunicipios()
  }, [])

  // Carregar municÃ­pios quando estado mudar
  useEffect(() => {
    if (formData.endereco?.estado && municipiosData) {
      const estadoSelecionado = municipiosData.estados?.find(
        (estado: any) => estado.sigla === formData.endereco?.estado
      )
      const municipiosDoEstado = estadoSelecionado?.municipios || []
      setMunicipios(municipiosDoEstado)
    } else {
      setMunicipios([])
    }
  }, [formData.endereco?.estado, municipiosData])

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => {
        const parentValue = prev[parent as keyof Imovel]
        if (parentValue && typeof parentValue === 'object') {
          return {
            ...prev,
            [parent]: {
              ...parentValue,
              [child]: value
            }
          }
        }
        return prev
      })
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSave(formData as Imovel)
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo ImÃ³vel</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* LocalizaÃ§Ã£o */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">LocalizaÃ§Ã£o</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <select
                  value={formData.endereco?.estado || ''}
                  onChange={(e) => handleInputChange('endereco.estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione o estado</option>
                  {municipiosData?.estados?.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <select
                  value={formData.endereco?.cidade || ''}
                  onChange={(e) => handleInputChange('endereco.cidade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!formData.endereco?.estado}
                >
                  <option value="">Selecione a cidade</option>
                  {municipios.map((municipio) => (
                    <option key={municipio} value={municipio}>
                      {municipio}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {municipios.length} municÃ­pios disponÃ­veis
                </p>
              </div>
            </div>
          </div>

          {/* InformaÃ§Ãµes BÃ¡sicas */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">InformaÃ§Ãµes BÃ¡sicas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TÃ­tulo do ImÃ³vel *
                </label>
                <input
                  type="text"
                  value={formData.titulo || ''}
                  onChange={(e) => handleInputChange('titulo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DescriÃ§Ã£o
                </label>
                <textarea
                  value={formData.descricao || ''}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo do ImÃ³vel *
                </label>
                <select
                  value={formData.tipo || ''}
                  onChange={(e) => handleInputChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione o tipo</option>
                  {tipos.map((tipo) => (
                    <option key={tipo.id} value={tipo.nome}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {tipos.length} tipos carregados
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finalidade *
                </label>
                <select
                  value={formData.finalidade || ''}
                  onChange={(e) => handleInputChange('finalidade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione a finalidade</option>
                  {finalidades.map((finalidade) => (
                    <option key={finalidade.id} value={finalidade.nome}>
                      {finalidade.nome.replace('_', ' e ')}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {finalidades.length} finalidades carregadas
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PreÃ§o
                </label>
                <input
                  type="number"
                  value={formData.preco || 0}
                  onChange={(e) => handleInputChange('preco', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CondomÃ­nio
                </label>
                <input
                  type="number"
                  value={formData.precoCondominio || 0}
                  onChange={(e) => handleInputChange('precoCondominio', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar ImÃ³vel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

