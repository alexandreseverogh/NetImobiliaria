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
  VideoCameraIcon,
  XMarkIcon
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
import TenhoInteresseButton from '@/components/TenhoInteresseButton'

export default function ImovelDetalhes() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()

  // Obter ID do imóvel dos parâmetros da rota
  const imovelId = params.id as string || (pathname?.split('/').pop() || '')

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

  // Função para scroll suave até a seção aberta
  const scrollToSection = (sectionId: string) => {
    // Timeout ligeiramente maior para garantir que o layout do React se estabilizou
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`)
      if (element) {
        const headerOffset = 120 // Margem de segurança para o header fixo
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 200)
  }

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
    const num = Number(valor)
    if (!num || num <= 0) return 'Preço sob Consulta'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
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
            Código do Imóvel: {dadosBasicos.id}
          </p>
        </div>

        {/* Dois Containers Lado a Lado (Responsivo: um abaixo do outro no mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Container Esquerdo - Imagem */}
          <div className="relative bg-white rounded-xl shadow-lg border-2 border-gray-400 overflow-hidden" style={{ height: '420px' }}>
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
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-400 p-6 overflow-y-auto" style={{ height: '420px' }}>
            {/* Linha 1 - Preço */}
            <div className="mb-4 flex items-center bg-gray-50 p-2 rounded-lg">
              <CurrencyDollarIcon className="w-7 h-7 mr-2 text-primary-600" />
              <span className="text-2xl font-bold text-primary-600">
                {Number(dadosBasicos.preco) > 0
                  ? formatarPreco(dadosBasicos.preco)
                  : 'Preço sob Consulta'}
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

            {/* Linha 4 - Características, Custos e Áreas em Grid de 2 Colunas */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
              {/* Coluna 1 - Características Físicas */}
              <div className="space-y-1">
                {Number(dadosBasicos.quartos) > 0 && (
                  <div className="flex items-center text-xs">
                    <Bed className="w-3.5 h-3.5 mr-1 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.quartos} quartos</span>
                  </div>
                )}
                {Number(dadosBasicos.suites) > 0 && (
                  <div className="flex items-center text-xs">
                    <BedDouble className="w-3.5 h-3.5 mr-1 text-purple-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.suites} {Number(dadosBasicos.suites) > 1 ? 'suítes' : 'suíte'}</span>
                  </div>
                )}
                {Number(dadosBasicos.banheiros) > 0 && (
                  <div className="flex items-center text-xs">
                    <Bath className="w-3.5 h-3.5 mr-1 text-cyan-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.banheiros} banheiros</span>
                  </div>
                )}
                {Number(dadosBasicos.varanda) > 0 && (
                  <div className="flex items-center text-xs">
                    <Home className="w-3.5 h-3.5 mr-1 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.varanda} varanda</span>
                  </div>
                )}
                {Number(dadosBasicos.vagas_garagem) > 0 && (
                  <div className="flex items-center text-xs">
                    <Car className="w-3.5 h-3.5 mr-1 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.vagas_garagem} {Number(dadosBasicos.vagas_garagem) > 1 ? 'vagas' : 'vaga'} garagem</span>
                  </div>
                )}
              </div>

              {/* Coluna 2 - Custos, Áreas e Andares */}
              <div className="space-y-1">
                {/* Custos (Ocultar se 0) */}
                {Number(dadosBasicos.preco_condominio) > 0 && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Condomínio: {formatarPreco(dadosBasicos.preco_condominio)}</span>
                  </div>
                )}
                {Number(dadosBasicos.preco_iptu) > 0 && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">IPTU: {formatarPreco(dadosBasicos.preco_iptu)}</span>
                  </div>
                )}
                {Number(dadosBasicos.taxa_extra) > 0 && (
                  <div className="flex items-center text-xs">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-700 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Taxa Extra: {formatarPreco(dadosBasicos.taxa_extra)}</span>
                  </div>
                )}

                {/* Áreas (Sempre exibir se informado) */}
                {dadosBasicos.area_total !== null && dadosBasicos.area_total !== undefined && Number(dadosBasicos.area_total) > 0 && (
                  <div className="flex items-center text-xs">
                    <Square className="w-3.5 h-3.5 mr-1 text-indigo-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.area_total}m² total</span>
                  </div>
                )}
                {dadosBasicos.area_construida !== null && dadosBasicos.area_construida !== undefined && Number(dadosBasicos.area_construida) > 0 && (
                  <div className="flex items-center text-xs">
                    <Square className="w-3.5 h-3.5 mr-1 text-indigo-600 flex-shrink-0" />
                    <span className="text-gray-700 truncate">{dadosBasicos.area_construida}m² const.</span>
                  </div>
                )}

                {/* Outros Detalhes */}
                {dadosBasicos.andar !== null && dadosBasicos.andar !== undefined && (
                  <div className="flex items-center text-xs">
                    <Layers className="w-3.5 h-3.5 mr-1 text-pink-500 flex-shrink-0" />
                    <span className="text-gray-700 truncate">Andar: {dadosBasicos.andar}</span>
                  </div>
                )}
                {dadosBasicos.total_andares !== null && dadosBasicos.total_andares !== undefined && Number(dadosBasicos.total_andares) > 0 && (
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

        {/* ── BARRA DE AÇÃO: Tenho Interesse ─────────────────────────────── */}
        <div className="w-full my-5">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="text-center sm:text-left">
              <p className="text-emerald-800 font-bold text-lg leading-tight">
                ❤ Ficou interessado neste imóvel?
              </p>
              <p className="text-emerald-600 text-sm mt-0.5">
                Registre seu interesse e nossa equipe entrará em contato.
              </p>
            </div>
            <TenhoInteresseButton
              imovelId={Number(dadosBasicos.id)}
              imovelTitulo={dadosBasicos.titulo}
              onSuccess={() => router.push('/landpaging')}
              className="px-8 py-3 text-base rounded-full whitespace-nowrap flex-shrink-0"
            />
          </div>
        </div>

        {/* Botões de Ação (Responsivo: um abaixo do outro no mobile) */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Atrativos */}
          {dadosBasicos.total_amenidades > 0 && (
            <button
              onClick={() => {
                const isOpening = !isSectionActive('amenidades')
                toggleSection('amenidades')
                if (isOpening) {
                  if (!temDadosDetalhados) carregarDetalhados()
                  scrollToSection('amenidades')
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
                const isOpening = !isSectionActive('proximidades')
                toggleSection('proximidades')
                if (isOpening) {
                  if (!temDadosDetalhados) carregarDetalhados()
                  scrollToSection('proximidades')
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
                const isOpening = !isSectionActive('galeria')
                toggleSection('galeria')
                if (isOpening) {
                  if (!temDadosCompletos) carregarCompletos()
                  scrollToSection('galeria')
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
                const isOpening = !isSectionActive('documentos')
                toggleSection('documentos')
                if (isOpening) {
                  if (!temDadosCompletos) carregarCompletos()
                  scrollToSection('documentos')
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
              <div id="section-amenidades" className="bg-white rounded-xl shadow-lg border border-gray-400 p-4 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-primary-600" />
                    Atrativos
                  </h3>
                  <button
                    onClick={() => removeSection('amenidades')}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium shadow-sm"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
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
              <div id="section-proximidades" className="bg-white rounded-xl shadow-lg border border-gray-400 p-4 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <MapIcon className="w-6 h-6 mr-3 text-primary-600" />
                    Proximidades
                  </h3>
                  <button
                    onClick={() => removeSection('proximidades')}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium shadow-sm"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
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
              <div id="section-galeria" className="bg-white rounded-xl shadow-lg border border-gray-400 p-4 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <PhotoIcon className="w-6 h-6 mr-3 text-primary-600" />
                    Galeria de Imagens
                  </h3>
                  <button
                    onClick={() => removeSection('galeria')}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium shadow-sm"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
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
              <div id="section-documentos" className="bg-white rounded-xl shadow-lg border border-gray-400 p-4 sm:p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <DocumentTextIcon className="w-6 h-6 mr-3 text-primary-600" />
                    Documentos
                  </h3>
                  <button
                    onClick={() => removeSection('documentos')}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium shadow-sm"
                  >
                    <XMarkIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Fechar</span>
                  </button>
                </div>
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

        {/* --- SEÇÃO PREMIUM DE REDIRECIONAMENTO (UPSELL/CONTINUIDADE) --- */}
        <div className="mt-12 mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-0.5 shadow-xl">
          <div className="bg-white/10 backdrop-blur-md rounded-[14px] px-6 py-8 text-center text-white relative overflow-hidden group">
            {/* Elementos decorativos de fundo */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all duration-700"></div>
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all duration-700"></div>
            
            <div className="relative z-10 max-w-xl mx-auto space-y-4">
              <div className="inline-flex items-center justify-center p-2 bg-white/20 rounded-xl mb-2 animate-bounce">
                <SparklesIcon className="w-6 h-6 text-yellow-300" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                Gostou deste imóvel, mas quer ver <span className="text-blue-300">outras opções?</span>
              </h2>
              
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => router.push('/landpaging')}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-900 rounded-full text-lg font-bold shadow-lg hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95 group/btn"
                >
                  <HomeIcon className="w-5 h-5 text-blue-600 group-hover/btn:rotate-12 transition-transform" />
                  Explorar mais Imóveis
                </button>
              </div>
            </div>
          </div>
        </div>
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