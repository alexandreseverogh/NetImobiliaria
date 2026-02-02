'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Imovel } from '@/lib/database/imoveis'
import { usePageFocus } from '@/hooks/usePageFocus'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'
import { useApi } from '@/hooks/useApi'
import ImovelGrid from '@/components/admin/ImovelGrid'

export default function ImoveisPage() {
  '  '
  const router = useRouter()
  const { get } = useApi()
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    codigo: '',
    bairro: '',
    estado: '',
    municipio: '',
    tipo: '',
    finalidade: '',
    status: '',
    corretor: ''
  })
  const [appliedFilters, setAppliedFilters] = useState({
    codigo: '',
    bairro: '',
    estado: '',
    municipio: '',
    tipo: '',
    finalidade: '',
    status: '',
    corretor: ''
  })
  const [tipos, setTipos] = useState<Array<{ id: string, nome: string }>>([])
  const [finalidades, setFinalidades] = useState<Array<{ id: string, nome: string }>>([])
  const [statusOptions, setStatusOptions] = useState<Array<{ id: string, nome: string }>>([])
  const [corretores, setCorretores] = useState<Array<{ id: string, nome: string }>>([])

  // Usar hook centralizado para estados e municípios com mode='all' para ver todas as cidades
  const { estados, municipios, loadMunicipios, clearMunicipios, getEstadoNome, getCidadeNome } = useEstadosCidades('all')
  const prevEstadoRef = useRef<string>('')

  // Carregar dados dos filtros
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // Carregar tipos de imóveis
        const tiposResponse = await get('/api/admin/imoveis/tipos')
        if (tiposResponse.ok) {
          const tiposData = await tiposResponse.json()
          setTipos(tiposData || [])
        }

        // Carregar finalidades
        const finalidadesResponse = await get('/api/admin/imoveis/finalidades')
        if (finalidadesResponse.ok) {
          const finalidadesData = await finalidadesResponse.json()
          setFinalidades(finalidadesData || [])
        }

        // Estados já são carregados pelo hook useEstadosCidades

        // Carregar status
        const statusResponse = await get('/api/admin/status-imovel')
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatusOptions(statusData || [])
        }

        // Carregar corretores
        const corretoresResponse = await get('/api/admin/usuarios?role_name=Corretor&limit=100')
        if (corretoresResponse.ok) {
          const corretoresData = await corretoresResponse.json()
          setCorretores(corretoresData.users || [])
        }
      } catch (err) {
        console.error('Erro ao carregar dados dos filtros:', err)
      }
    }

    loadFilterData()
  }, [get])

  // Carregar municípios quando estado mudar usando o hook
  useEffect(() => {
    // Se o estado mudou (e não é a primeira renderização)
    if (filters.estado !== prevEstadoRef.current) {
      prevEstadoRef.current = filters.estado

      if (filters.estado) {
        // Limpar cidade selecionada quando estado muda para um novo valor
        if (filters.municipio) {
          setFilters(prev => ({ ...prev, municipio: '' }))
        }
        loadMunicipios(filters.estado)
      } else {
        // Se não há estado selecionado, limpar municípios
        clearMunicipios()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.estado]) // ✅ APENAS filters.estado - funções são estáveis

  const fetchImoveis = useCallback(async () => {
    console.log('🔄 fetchImoveis CHAMADO', { appliedFilters })
    try {
      setLoading(true)
      setError(null)

      // Construir query string com filtros aplicados
      const queryParams = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })

      const response = await get(`/api/admin/imoveis?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar imóveis')
      }
      const data = await response.json()
      console.log('🔍 Página de Imóveis - Dados recebidos da API:', data)
      console.log('🔍 Página de Imóveis - Quantidade de imóveis:', data.data?.length || 0)
      console.log('🔍 Página de Imóveis - IDs dos imóveis:', data.data?.map((imovel: any) => imovel.id))
      setImoveis(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [appliedFilters, get])

  useEffect(() => {
    console.log('🔄 useEffect[fetchImoveis] EXECUTADO')
    fetchImoveis()
  }, [fetchImoveis])

  // Usar o hook personalizado para recarregar dados quando a página receber foco
  usePageFocus(fetchImoveis)

  const handleFilterChange = (field: string, value: string) => {
    console.log('🔍 Filter change:', field, '=', value)
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleApplyFilters = () => {
    setAppliedFilters(filters)
  }

  const handleClearFilters = () => {
    const emptyFilters = {
      codigo: '',
      bairro: '',
      estado: '',
      municipio: '',
      tipo: '',
      finalidade: '',
      status: '',
      corretor: ''
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }


  const filteredImoveis = imoveis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-4">
        <div className="relative flex items-center justify-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Imóveis</h1>
          <div className="absolute right-0">
            <Link
              href="/admin/imoveis/novo"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Novo Imóvel
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Filtros</h2>
        <div className="grid grid-cols-9 gap-4 items-end">
          {/* Código */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Código
            </label>
            <input
              type="number"
              value={filters.codigo}
              onChange={(e) => {
                // Permitir apenas números
                const value = e.target.value.replace(/[^0-9]/g, '')
                handleFilterChange('codigo', value)
              }}
              className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Código"
              min="1"
            />
          </div>

          {/* Estado */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              UF
            </label>
            <EstadoSelect
              value={filters.estado}
              onChange={(estadoId) => handleFilterChange('estado', estadoId)}
              placeholder="UF"
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              format="sigla"
              showAllOption={true}
              allOptionLabel="UF"
              mode="all"
            />
          </div>

          {/* Município */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Cidade
            </label>
            <select
              value={filters.municipio}
              onChange={(e) => handleFilterChange('municipio', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={!filters.estado}
            >
              <option value="">Cidade</option>
              {municipios.map(municipio => (
                <option key={municipio.id} value={municipio.nome}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Bairro - MOVIDO PARA CÁ */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={filters.bairro}
              onChange={(e) => handleFilterChange('bairro', e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Bairro"
            />
          </div>

          {/* Tipo */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Tipo
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Tipo</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Finalidade */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Finalidade
            </label>
            <select
              value={filters.finalidade}
              onChange={(e) => handleFilterChange('finalidade', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Finalidade</option>
              {finalidades.map(finalidade => (
                <option key={finalidade.id} value={finalidade.id}>
                  {finalidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Status</option>
              {statusOptions.map(status => (
                <option key={status.id} value={status.id}>
                  {status.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Corretor */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Corretor
            </label>
            <select
              value={filters.corretor}
              onChange={(e) => handleFilterChange('corretor', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Corretor</option>
              {corretores.map(corretor => (
                <option key={corretor.id} value={corretor.id}>
                  {corretor.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="col-span-1 flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-bold"
              title="Filtrar"
            >
              OK
            </button>
            <button
              onClick={handleClearFilters}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-bold"
              title="Limpar"
            >
              X
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Imóveis */}
      <ImovelGrid
        imoveis={filteredImoveis}
        loading={loading}
        error={error}
        onRetry={fetchImoveis}
      />

    </div>
  )
}