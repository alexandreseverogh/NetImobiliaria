'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import {
  MapPinIcon,
  HomeIcon,
  XCircleIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  UserIcon,
  EyeIcon,
  StarIcon,
  DocumentTextIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon,
  BuildingOffice2Icon,
  MapIcon,
  SparklesIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline'
import { Square, Car, Bed, BedDouble, Bath, Home, Building, Layers } from 'lucide-react'
import useFichaCompleta from '@/hooks/useFichaCompleta'
import AmenidadesLista from '@/components/property/AmenidadesLista'
import ProximidadesLista from '@/components/property/ProximidadesLista'
import GaleriaDocumentos from '@/components/property/GaleriaDocumentos'
import DocumentosLista from '@/components/property/DocumentosLista'
import ImagensLista from '@/components/property/ImagensLista'
import VideosLista from '@/components/property/VideosLista'
import VideoModal from '@/components/admin/wizard/VideoModal'
import MapaModal from '@/components/property/MapaModal'
import SafeImage from '@/components/common/SafeImage'

export default function ImovelDetalhes() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

  // Extrair ID da URL atual para garantir que seja o correto
  const urlPath = pathname || ''
  const urlImovelId = urlPath.split('/').pop() || ''

  // Usar o ID da URL em vez do params (que pode estar cached)
  const imovelId = urlImovelId

  const {
    dadosBasicos,
    dadosDetalhados,
    dadosCompletos,
    loading,
    error,
    carregarDetalhados,
    carregarCompletos
  } = useFichaCompleta(imovelId)

  // Hook para estados e cidades
  const { estados, getEstadoNome } = useEstadosCidades()

  const [activeSections, setActiveSections] = useState<string[]>([])
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [videoData, setVideoData] = useState<any>(null)
  const [isMapaModalOpen, setIsMapaModalOpen] = useState(false)

  const temDadosDetalhados = dadosDetalhados && dadosDetalhados.amenidades && dadosDetalhados.proximidades
  const temDadosCompletos = dadosCompletos && dadosCompletos.imagens && dadosCompletos.videos && dadosCompletos.documentos

  // Funções auxiliares para gerenciar seções ativas
  const toggleSection = (section: string) => {
    setActiveSections(prev => {
      if (prev.includes(section)) {
        return prev.filter(s => s !== section)
      } else {
        return [...prev, section]
      }
    })
  }

  const isSectionActive = (section: string) => activeSections.includes(section)
  const removeSection = (section: string) => {
    setActiveSections(prev => prev.filter(s => s !== section))
  }

  // Função para carregar vídeo da API PÚBLICA (sem autenticação)
  const loadVideo = async () => {
    try {
      console.log('🔍 Página Pública - Carregando vídeo para imóvel:', imovelId)

      // Buscar vídeo da API PÚBLICA (sem autenticação)
      const response = await fetch(`/api/public/imoveis/${imovelId}/video`)

      if (!response.ok) {
        if (response.status === 404) {
          alert('Nenhum vídeo disponível para este imóvel')
        } else {
          throw new Error(`Erro ao carregar vídeo: ${response.status}`)
        }
        return
      }

      const data = await response.json()

      if (!data.success || !data.data) {
        alert('Nenhum vídeo disponível para este imóvel')
        return
      }

      console.log('✅ Página Pública - Vídeo carregado com sucesso:', {
        id: data.data.id,
        tamanho: data.data.tamanho_bytes,
        formato: data.data.formato
      })

      // O vídeo já vem no formato correto (ImovelVideo com Buffer)
      setVideoData(data.data)
      setIsVideoModalOpen(true)

    } catch (err) {
      console.error('❌ Página Pública - Erro ao carregar vídeo:', err)
      alert('Erro ao carregar vídeo')
    }
  }

  const closeVideoModal = () => {
    setIsVideoModalOpen(false)
    setVideoData(null)
  }

  const openMapaModal = () => {
    console.log('🔍 Abrindo modal de mapa - dadosBasicos:', dadosBasicos)
    console.log('🔍 Latitude:', dadosBasicos?.latitude, 'Tipo:', typeof dadosBasicos?.latitude)
    console.log('🔍 Longitude:', dadosBasicos?.longitude, 'Tipo:', typeof dadosBasicos?.longitude)
    setIsMapaModalOpen(true)
  }

  const closeMapaModal = () => {
    setIsMapaModalOpen(false)
  }

  // Função para formatar preço
  const formatarPreco = (valor: any) => {
    if (!valor || valor === '0' || valor === 0) return 'N/A'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor))
  }

  // Estados de loading e erro
  if (loading.basico) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-xl font-medium">Carregando informações do imóvel...</p>
        </div>
      </div>
    )
  }

  if (error.basico) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-32 w-32 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro ao carregar imóvel</h1>
          <p className="text-gray-600">{error.basico}</p>
        </div>
      </div>
    )
  }

  // Só exibir "não encontrado" se não estiver carregando E não tiver dados
  if (!loading.basico && !dadosBasicos) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-32 w-32 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h1>
          <p className="text-gray-600">O imóvel solicitado não foi encontrado.</p>
        </div>
      </div>
    )
  }

  if (!dadosBasicos) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Layout Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {dadosBasicos.titulo}
          </h1>
          <p className="text-lg text-gray-600">
            Informações do Imóvel: {dadosBasicos.id}
          </p>
        </div>

        {/* Dois Containers Lado a Lado (Responsivo: um abaixo do outro no mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Container Esquerdo - Imagem */}
          <div className="relative bg-white rounded-xl shadow-lg border-2 border-gray-400 overflow-hidden" style={{ height: '350px' }}>
            <div className="relative w-full h-full overflow-hidden">
              {dadosBasicos.imagem_principal?.url ? (
                <>
                  <SafeImage
                    src={dadosBasicos.imagem_principal.url}
                    alt={dadosBasicos.imagem_principal.alt || dadosBasicos.titulo || 'Imagem do imóvel'}
                    fill
                    className="object-cover"
                    unoptimized
                  />

                  {/* Badges dentro da imagem */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {dadosBasicos.tipo_nome}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {dadosBasicos.finalidade_nome}
                    </span>
                  </div>

                  {/* Lançamento Badge (Top Center) */}
                  {dadosBasicos.lancamento && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
                        Lançamento
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <div className="text-center">
                      <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Imagem Principal</p>
                      <p className="text-gray-400 text-sm">Não disponível</p>
                    </div>
                  </div>
                  {/* Badges nos cantos mesmo sem imagem */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {dadosBasicos.tipo_nome}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {dadosBasicos.finalidade_nome}
                    </span>
                  </div>

                  {/* Lançamento Badge (Top Center) mesmo sem imagem */}
                  {dadosBasicos.lancamento && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
                        Lançamento
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Container Direito - Informações */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-400 p-6 overflow-y-auto" style={{ height: '350px' }}>
            {/* Linha 1 - Preço */}
            <div className="mb-2">
              <span className="text-2xl font-bold text-primary-600">
                {formatarPreco(dadosBasicos.preco)}
              </span>
            </div>

            {/* Linha 2 - Descrição */}
            {dadosBasicos.descricao && dadosBasicos.descricao.trim() && (
              <div className="mb-2">
                <p className="text-gray-900 leading-tight text-sm">
                  {dadosBasicos.descricao}
                </p>
              </div>
            )}

            {/* Linha 3 - Localização */}
            <div className="mb-2 flex items-center text-sm">
              <SafeImage src="/Assets/mapa.png" alt="Mapa" width={20} height={20} className="w-5 h-5 mr-2" />
              <span className="text-gray-700">
                {(() => {
                  // Buscar estado por sigla em vez de ID
                  const estado = estados.find(e => e.sigla === dadosBasicos.estado_fk)
                  const estadoNome = estado?.nome || ''
                  return estadoNome
                })()} • {dadosBasicos.cidade_fk} • {dadosBasicos.endereco}, {dadosBasicos.numero} • CEP: {dadosBasicos.cep}
                {dadosBasicos.complemento && ` • ${dadosBasicos.complemento}`}
              </span>
            </div>

            {/* Linha 4 - Características, Custos e Áreas em Grid */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Coluna 1 - Características */}
              <div className="space-y-1">
                {dadosBasicos.quartos !== null && dadosBasicos.quartos !== undefined && (
                  <div className="flex items-center text-xs">
                    <Bed className="w-3.5 h-3.5 mr-1 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.quartos} quartos</span>
                  </div>
                )}
                {dadosBasicos.suites !== null && dadosBasicos.suites !== undefined && (
                  <div className="flex items-center text-xs">
                    <BedDouble className="w-3.5 h-3.5 mr-1 text-purple-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.suites} suítes</span>
                  </div>
                )}
                {dadosBasicos.banheiros !== null && dadosBasicos.banheiros !== undefined && (
                  <div className="flex items-center text-xs">
                    <Bath className="w-3.5 h-3.5 mr-1 text-cyan-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.banheiros} banheiros</span>
                  </div>
                )}
                {dadosBasicos.varanda !== null && dadosBasicos.varanda !== undefined && (
                  <div className="flex items-center text-xs">
                    <Home className="w-3.5 h-3.5 mr-1 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.varanda} varanda</span>
                  </div>
                )}
                {dadosBasicos.vagas_garagem !== null && dadosBasicos.vagas_garagem !== undefined && (
                  <div className="flex items-center text-xs">
                    <Car className="w-3.5 h-3.5 mr-1 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.vagas_garagem} garagem</span>
                  </div>
                )}
              </div>

              {/* Coluna 2 - Custos */}
              <div className="space-y-1">
                {dadosBasicos.preco_condominio && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Condomínio: {formatarPreco(dadosBasicos.preco_condominio)}</span>
                  </div>
                )}
                {dadosBasicos.preco_iptu && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">IPTU: {formatarPreco(dadosBasicos.preco_iptu)}</span>
                  </div>
                )}
                {dadosBasicos.taxa_extra && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-700 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Taxa Extra: {formatarPreco(dadosBasicos.taxa_extra)}</span>
                  </div>
                )}
              </div>

              {/* Coluna 3 - Áreas e Andares */}
              <div className="space-y-1">
                {dadosBasicos.area_total !== null && dadosBasicos.area_total !== undefined && (
                  <div className="flex items-center text-xs">
                    <Square className="w-3.5 h-3.5 mr-1 text-indigo-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.area_total}m² total</span>
                  </div>
                )}
                {dadosBasicos.area_construida !== null && dadosBasicos.area_construida !== undefined && (
                  <div className="flex items-center text-xs">
                    <Square className="w-3.5 h-3.5 mr-1 text-indigo-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.area_construida}m² const.</span>
                  </div>
                )}
                {dadosBasicos.andar !== null && dadosBasicos.andar !== undefined && (
                  <div className="flex items-center text-xs">
                    <Layers className="w-3.5 h-3.5 mr-1 text-pink-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Andar: {dadosBasicos.andar}</span>
                  </div>
                )}
                {dadosBasicos.total_andares !== null && dadosBasicos.total_andares !== undefined && (
                  <div className="flex items-center text-xs">
                    <Building className="w-3.5 h-3.5 mr-1 text-rose-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.total_andares} andares</span>
                  </div>
                )}
              </div>
            </div>

            {/* Linha 7 - Badges com fundo discreto */}
            {(dadosBasicos.aceita_permuta || dadosBasicos.aceita_financiamento) && (
              <div className="bg-gray-50 rounded-lg p-2 flex flex-wrap gap-2 mt-1">
                {dadosBasicos.aceita_permuta && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                    ✓ Aceita Permuta
                  </span>
                )}
                {dadosBasicos.aceita_financiamento && (
                  <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
                    ✓ Aceita Financiamento
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Container em branco para espaçamento */}
        <div className="w-full" style={{ maxWidth: '1400px', margin: '0 auto', height: '12px' }}></div>

        {/* Botões de Ação (Responsivo: um abaixo do outro no mobile) */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Atrativos */}
          {dadosBasicos.total_amenidades > 0 && (
            <button
              onClick={() => {
                toggleSection('amenidades')
                if (!isSectionActive('amenidades') && !temDadosDetalhados) {
                  carregarDetalhados()
                }
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>Atrativos</span>
            </button>
          )}

          {/* Proximidades */}
          {dadosBasicos.total_proximidades > 0 && (
            <button
              onClick={() => {
                toggleSection('proximidades')
                if (!isSectionActive('proximidades') && !temDadosDetalhados) {
                  carregarDetalhados()
                }
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <MapIcon className="w-5 h-5" />
              <span>Proximidades</span>
            </button>
          )}

          {/* Galeria de Imagens */}
          {dadosBasicos.total_imagens > 0 && (
            <button
              onClick={() => {
                toggleSection('galeria')
                if (!isSectionActive('galeria') && !temDadosCompletos) {
                  carregarCompletos()
                }
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <PhotoIcon className="w-5 h-5" />
              <span>Galeria de Imagens</span>
            </button>
          )}

          {/* Vídeo */}
          {dadosBasicos.total_videos !== undefined && dadosBasicos.total_videos > 0 ? (
            <button
              onClick={loadVideo}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <VideoCameraIcon className="w-5 h-5" />
              <span>Vídeo</span>
            </button>
          ) : null}

          {/* Documentos */}
          {dadosBasicos.total_documentos !== undefined && dadosBasicos.total_documentos > 0 ? (
            <button
              onClick={() => {
                toggleSection('documentos')
                if (!isSectionActive('documentos') && !temDadosCompletos) {
                  carregarCompletos()
                }
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span>Documentos</span>
            </button>
          ) : null}

          {/* Mapas */}
          <button
            onClick={openMapaModal}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <MapIcon className="w-5 h-5" />
            <span>Mapas</span>
          </button>
        </div>

        {/* Seções Expansíveis */}
        {(isSectionActive('amenidades') || isSectionActive('proximidades') || isSectionActive('galeria') || isSectionActive('documentos') || isSectionActive('mapas')) && (
          <div className="w-full space-y-6 mt-4">
            {/* Atrativos */}
            {isSectionActive('amenidades') && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <SparklesIcon className="w-6 h-6 mr-3 text-primary-600" />
                  Atrativos
                </h3>
                {temDadosDetalhados ? (
                  <AmenidadesLista
                    amenidades={dadosDetalhados.amenidades}
                    loading={loading.detalhado}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando atrativos...</p>
                  </div>
                )}
              </div>
            )}

            {/* Proximidades */}
            {isSectionActive('proximidades') && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <MapIcon className="w-6 h-6 mr-3 text-primary-600" />
                  Proximidades
                </h3>
                {temDadosDetalhados ? (
                  <ProximidadesLista
                    proximidades={dadosDetalhados.proximidades}
                    loading={loading.detalhado}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando proximidades...</p>
                  </div>
                )}
              </div>
            )}

            {/* Galeria de Imagens */}
            {isSectionActive('galeria') && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <PhotoIcon className="w-6 h-6 mr-3 text-primary-600" />
                  Galeria de Imagens
                </h3>
                {temDadosCompletos ? (
                  <ImagensLista
                    imagens={dadosCompletos.imagens}
                    loading={loading.completo}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando galeria de imagens...</p>
                  </div>
                )}
              </div>
            )}

            {/* Documentos */}
            {isSectionActive('documentos') && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <DocumentTextIcon className="w-6 h-6 mr-3 text-primary-600" />
                  Documentos
                </h3>
                {temDadosCompletos ? (
                  <DocumentosLista
                    documentos={dadosCompletos.documentos}
                    loading={loading.completo}
                    imovelId={imovelId}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando documentos...</p>
                  </div>
                )}
              </div>
            )}

            {/* Mapas */}
            {isSectionActive('mapas') && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-400 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <MapIcon className="w-6 h-6 mr-3 text-primary-600" />
                  Mapas
                </h3>
                <div className="text-center py-12">
                  <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">Mapa Interativo</p>
                      <p className="text-gray-400 text-sm">Funcionalidade em desenvolvimento</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Vídeo */}
      <VideoModal
        video={videoData}
        isOpen={isVideoModalOpen}
        onClose={closeVideoModal}
      />

      {/* Modal de Mapa */}
      <MapaModal
        isOpen={isMapaModalOpen}
        onClose={closeMapaModal}
        latitude={dadosBasicos?.latitude}
        longitude={dadosBasicos?.longitude}
        titulo={dadosBasicos?.titulo}
        endereco={dadosBasicos ? `${dadosBasicos.endereco}, ${dadosBasicos.numero}${dadosBasicos.complemento ? ', ' + dadosBasicos.complemento : ''} - ${dadosBasicos.bairro}, ${dadosBasicos.cidade_fk} - ${dadosBasicos.estado_fk}` : ''}
      />
    </div>
  )
}