'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Imovel } from '@/lib/database/imoveis'
import { usePageFocus } from '@/hooks/usePageFocus'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'
import { useApi } from '@/hooks/useApi'
import ImovelGrid from '@/components/admin/ImovelGrid'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function ImoveisPage() {
  '  '
  const router = useRouter()
  const searchParams = useSearchParams()
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
    corretor: '',
    proprietario: '',
    proprietario_uuid: searchParams.get('proprietario_uuid') || '',
    // Filtros avançados
    endereco: '',
    preco_min: '',
    preco_max: '',
    area_min: '',
    area_max: '',
    quartos_min: '',
    quartos_max: '',
    banheiros_min: '',
    banheiros_max: '',
    suites_min: '',
    suites_max: '',
    vagas_min: '',
    vagas_max: ''
  })
  const [appliedFilters, setAppliedFilters] = useState({
    codigo: '',
    bairro: '',
    estado: '',
    municipio: '',
    tipo: '',
    finalidade: '',
    status: '',
    corretor: '',
    proprietario: '',
    proprietario_uuid: searchParams.get('proprietario_uuid') || '',
    // Filtros avançados
    endereco: '',
    preco_min: '',
    preco_max: '',
    area_min: '',
    area_max: '',
    quartos_min: '',
    quartos_max: '',
    banheiros_min: '',
    banheiros_max: '',
    suites_min: '',
    suites_max: '',
    vagas_min: '',
    vagas_max: ''
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [tipos, setTipos] = useState<Array<{ id: string, nome: string }>>([])
  const [finalidades, setFinalidades] = useState<Array<{ id: string, nome: string }>>([])
  const [statusOptions, setStatusOptions] = useState<Array<{ id: string, nome: string }>>([])
  const [corretores, setCorretores] = useState<Array<{ id: string, nome: string }>>([])
  const [proprietarios, setProprietarios] = useState<Array<{ uuid: string, nome: string }>>([])
  const [isProprietarioMode, setIsProprietarioMode] = useState(false)
  const [proprietarioNome, setProprietarioNome] = useState('')

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

        // Carregar proprietários
        const proprietariosResponse = await get('/api/admin/proprietarios?limit=100')
        if (proprietariosResponse.ok) {
          const proprietariosData = await proprietariosResponse.json()
          setProprietarios(proprietariosData.proprietarios || [])
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

  // Sincronizar proprietario_uuid da URL
  useEffect(() => {
    const uuid = searchParams.get('proprietario_uuid')
    if (uuid && uuid !== filters.proprietario_uuid) {
      console.log('🔄 Sincronizando proprietario_uuid da URL:', uuid)
      setFilters(prev => ({ ...prev, proprietario_uuid: uuid }))
      setAppliedFilters(prev => ({ ...prev, proprietario_uuid: uuid }))
    }
  }, [searchParams, filters.proprietario_uuid])

  // Detectar modo proprietário e carregar nome
  useEffect(() => {
    const fromProprietario = searchParams.get('fromProprietario')
    const proprietarioUuid = searchParams.get('proprietario_uuid')

    if (fromProprietario === 'true' && proprietarioUuid) {
      setIsProprietarioMode(true)

      // Carregar nome do proprietário
      const loadProprietarioNome = async () => {
        try {
          const response = await get(`/api/admin/proprietarios?uuid=${proprietarioUuid}`)
          if (response.ok) {
            const data = await response.json()
            if (data.proprietarios && data.proprietarios.length > 0) {
              setProprietarioNome(data.proprietarios[0].nome)
              // Aplicar filtro automaticamente
              setFilters(prev => ({ ...prev, proprietario: proprietarioUuid }))
              setAppliedFilters(prev => ({ ...prev, proprietario: proprietarioUuid }))
            }
          }
        } catch (err) {
          console.error('Erro ao carregar proprietário:', err)
        }
      }

      loadProprietarioNome()
    }
  }, [searchParams, get])

  const fetchImoveis = useCallback(async () => {
    console.log('🔄 fetchImoveis CHAMADO', { appliedFilters })
    try {
      setLoading(true)
      setError(null)

      // Construir query string com filtros aplicados
      const queryParams = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          let cleanValue = value as string
          
          // Se for filtro de preço, remover formatação (pontos e R$) para enviar apenas o número para a API
          if (key === 'preco_min' || key === 'preco_max') {
            const digits = cleanValue.replace(/\D/g, '')
            if (digits) {
              cleanValue = (Number(digits) / 100).toString()
            }
          }

          // Mapear 'proprietario' para 'proprietario_uuid' para a API
          const apiKey = key === 'proprietario' ? 'proprietario_uuid' : key
          queryParams.append(apiKey, cleanValue)
        }
      })

      const apiUrl = `/api/admin/imoveis?${queryParams.toString()}`
      console.log('🚀 fetching from URL:', apiUrl)

      const response = await get(apiUrl)
      if (!response.ok) {
        throw new Error('Erro ao carregar imóveis')
      }
      const data = await response.json()
      console.log('🔍 Página de Imóveis - Dados recebidos da API:', data)
      if (data._debug) {
        console.log('🐞 API DEBUG:', data._debug)
      }
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
    
    // Se for um campo de preço, aplicar máscara de moeda brasileira
    if (field === 'preco_min' || field === 'preco_max') {
      const digits = value.replace(/\D/g, '')
      if (!digits) {
        setFilters(prev => ({ ...prev, [field]: '' }))
        return
      }
      
      const numericValue = Number(digits) / 100
      const formatted = numericValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      
      setFilters(prev => ({ ...prev, [field]: formatted }))
      return
    }

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
      corretor: '',
      proprietario: '',
      proprietario_uuid: '',
      endereco: '',
      preco_min: '',
      preco_max: '',
      area_min: '',
      area_max: '',
      quartos_min: '',
      quartos_max: '',
      banheiros_min: '',
      banheiros_max: '',
      suites_min: '',
      suites_max: '',
      vagas_min: '',
      vagas_max: ''
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
          <div className="absolute right-0 flex gap-2">
            {isProprietarioMode && (
              <button
                onClick={() => window.close()}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold text-base shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Fechar Janela
              </button>
            )}
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
        <div className="grid grid-cols-10 gap-3 items-end">
          {/* Código - Reduzido para metade da largura */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-gray-700 text-center mb-2">
              Código
            </label>
            <input
              type="number"
              value={filters.codigo}
              onChange={(e) => {
                // Permitir apenas números e limitar a 7 dígitos
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 7)
                handleFilterChange('codigo', value)
              }}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Código"
              min="1"
              maxLength={7}
              disabled={isProprietarioMode}
            />
          </div>

          {/* Estado - Reduzido para metade da largura */}
          <div className="col-span-1">
            <label className="block text-xs font-bold text-gray-700 text-center mb-2">
              UF
            </label>
            <EstadoSelect
              value={filters.estado}
              onChange={(estadoId) => handleFilterChange('estado', estadoId)}
              placeholder="UF"
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
              format="sigla"
              showAllOption={true}
              allOptionLabel="UF"
              mode="all"
              disabled={isProprietarioMode}
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
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={!filters.estado || isProprietarioMode}
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
              className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Bairro"
              disabled={isProprietarioMode}
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
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isProprietarioMode}
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
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isProprietarioMode}
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
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isProprietarioMode}
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
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isProprietarioMode}
            >
              <option value="">Corretor</option>
              {corretores.map(corretor => (
                <option key={corretor.id} value={corretor.id}>
                  {corretor.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Proprietário */}
          <div className="col-span-1">
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Proprietário
            </label>
            <select
              value={filters.proprietario}
              onChange={(e) => handleFilterChange('proprietario', e.target.value)}
              className="w-full px-1 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isProprietarioMode}
            >
              <option value="">{isProprietarioMode && proprietarioNome ? proprietarioNome : 'Proprietário'}</option>
              {!isProprietarioMode && proprietarios.map(proprietario => (
                <option key={proprietario.uuid} value={proprietario.uuid}>
                  {proprietario.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div className="col-span-1 flex flex-col gap-2">
            <button
              onClick={handleApplyFilters}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-bold"
              title="Filtrar"
            >
              OK
            </button>
            <button
              onClick={handleClearFilters}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm font-bold"
              title="Limpar"
            >
              X
            </button>
          </div>
        </div>
        
        {/* Toggle Filtros Avançados */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors focus:outline-none"
          >
            {showAdvancedFilters ? (
              <>Ocultar Filtros Avançados <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Filtros Avançados <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>

        {/* Filtros Avançados Panel */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Preço */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Preço (Min/Max)</label>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xs font-bold">R$</span>
                  </div>
                  <input
                    type="text"
                    value={filters.preco_min}
                    onChange={(e) => handleFilterChange('preco_min', e.target.value)}
                    placeholder="Min"
                    className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xs font-bold">R$</span>
                  </div>
                  <input
                    type="text"
                    value={filters.preco_max}
                    onChange={(e) => handleFilterChange('preco_max', e.target.value)}
                    placeholder="Max"
                    className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Área */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Área m² (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.area_min}
                  onChange={(e) => handleFilterChange('area_min', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="number"
                  value={filters.area_max}
                  onChange={(e) => handleFilterChange('area_max', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Quartos */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Quartos (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.quartos_min}
                  onChange={(e) => handleFilterChange('quartos_min', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="number"
                  value={filters.quartos_max}
                  onChange={(e) => handleFilterChange('quartos_max', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Banheiros */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Banheiros (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.banheiros_min}
                  onChange={(e) => handleFilterChange('banheiros_min', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="number"
                  value={filters.banheiros_max}
                  onChange={(e) => handleFilterChange('banheiros_max', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Suítes */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Suítes (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.suites_min}
                  onChange={(e) => handleFilterChange('suites_min', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="number"
                  value={filters.suites_max}
                  onChange={(e) => handleFilterChange('suites_max', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Vagas */}
            <div className="col-span-1 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Garagem (Min/Max)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filters.vagas_min}
                  onChange={(e) => handleFilterChange('vagas_min', e.target.value)}
                  placeholder="Min"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <input
                  type="number"
                  value={filters.vagas_max}
                  onChange={(e) => handleFilterChange('vagas_max', e.target.value)}
                  placeholder="Max"
                  className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-gray-700">Endereço (Rua, Av, Complemento)</label>
              <input
                type="text"
                value={filters.endereco}
                onChange={(e) => handleFilterChange('endereco', e.target.value)}
                placeholder="Ex R. Augusta, 1500"
                className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}
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