'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { flushSync } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as HeroIcons from '@heroicons/react/24/outline'
import { ArrowTrendingUpIcon, ExclamationCircleIcon, StarIcon } from '@heroicons/react/24/outline'
import { Home, Building } from 'lucide-react'
import HeroSection from '@/components/HeroSection'
import LandingPropertyCard from '@/components/LandingPropertyCard'
import SearchForm, { SearchFormFilters } from '@/components/SearchForm'
import VenderPopup from '@/components/VenderPopup'
import CorretorPopup from '@/components/CorretorPopup'
import AuthModal from '@/components/public/auth/AuthModal'
import CorretorLoginModal from '@/components/public/auth/CorretorLoginModal'
import UserSuccessModal from '@/components/public/auth/UserSuccessModal'
import MeuPerfilModal from '@/components/public/MeuPerfilModal'
import TenhoInteresseFormModal from '@/components/TenhoInteresseFormModal'
import GeolocationModal from '@/components/public/GeolocationModal'
import ToastViewport from '@/components/ui/ToastViewport'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import FeedCategoriasSection from '@/components/landpaging/FeedCategoriasSection'
import ProfileBanners from '@/components/landpaging/ProfileBanners'
import FeedSectionClient from '@/components/landpaging/FeedSectionClient'
// ... import FeedSection removido para teste inline

// Tipo PropertyCard
interface PropertyCard {
  id: number
  title: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: string
  garages: number
  image: string
  type: string
}

interface FilteredResponse {
  success: boolean
  data: PropertyCard[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// IMPORTANTE: usar escapes Unicode (ASCII-only) para evitar qualquer problema de encoding no runtime/build.
const TITULO_DESTAQUE = 'Im\u00F3veis em Destaque'
const TITULO_DESTAQUE_NACIONAL = `${TITULO_DESTAQUE} Nacional`

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [featuredData, setFeaturedData] = useState<any[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0) // força recarregar destaques quando algo muda durante um fetch
  const [currentPage, setCurrentPage] = useState(1)
  // DV = Comprar (usuário final), DA = Alugar
  const [tipoDestaque, setTipoDestaque] = useState<'DV' | 'DA'>('DV') // Default: Comprar
  const [mostrarDestaquesNacional, setMostrarDestaquesNacional] = useState(true) // Controla exibição de destaque nacional - INICIALMENTE TRUE para exibir destaque nacional
  const [usadoFallbackNacional, setUsadoFallbackNacional] = useState(false) // Flag para indicar se API usou fallback para destaque nacional
  const [tipoDestaqueAnterior, setTipoDestaqueAnterior] = useState<'DV' | 'DA'>('DV') // Armazenar tipo anterior para reverter se não houver resultados
  const timeoutRef = useRef<NodeJS.Timeout | null>(null) // Ref para armazenar timeoutId e poder cancelá-lo
  const [mensagemSemResultados, setMensagemSemResultados] = useState<string | null>(null) // Mensagem quando não há resultados
  const itemsPerPage = 20

  const [filteredResults, setFilteredResults] = useState<PropertyCard[]>([])
  const [filteredPagination, setFilteredPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1
  })
  const [filtersActive, setFiltersActive] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [filtersError, setFiltersError] = useState<string | null>(null)
  const [lastFilters, setLastFilters] = useState<SearchFormFilters | null>(null)
  const [venderPopupOpen, setVenderPopupOpen] = useState(false)
  const [corretorPopupOpen, setCorretorPopupOpen] = useState(false)
  const [corretorLoginModalOpen, setCorretorLoginModalOpen] = useState(false)
  const [corretorHomeSuccessOpen, setCorretorHomeSuccessOpen] = useState(false)
  const [corretorHomeUser, setCorretorHomeUser] = useState<{
    id?: string
    uuid?: string
    nome: string
    email: string
    telefone?: string
    cpf?: string
    creci?: string
    isencao?: boolean
    fotoDataUrl?: string
  } | null>(null)

  // Dedupe: evitar abrir o painel do corretor 2x (por query + por evento, ou múltiplos efeitos).
  const corretorHomeOpenRef = useRef(false)
  const corretorHomeQueryConsumedRef = useRef(false)
  useEffect(() => {
    corretorHomeOpenRef.current = !!corretorHomeSuccessOpen
  }, [corretorHomeSuccessOpen])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register')
  const [authUserType, setAuthUserType] = useState<'cliente' | 'proprietario' | null>(null)
  const [meuPerfilModalOpen, setMeuPerfilModalOpen] = useState(false)
  // Metadados de finalidades removidos - não são mais necessários
  const [pendingImovelId, setPendingImovelId] = useState<number | null>(null)
  const [tenhoInteresseFormModalOpen, setTenhoInteresseFormModalOpen] = useState(false)
  const [pendingImovelTitulo, setPendingImovelTitulo] = useState<string | null>(null)
  const [noResultsModalOpen, setNoResultsModalOpen] = useState(false)
  const [progressBarWidth, setProgressBarWidth] = useState(0)

  // Estados para geolocalização
  const [geolocationModalOpen, setGeolocationModalOpen] = useState(false)
  const [detectedCity, setDetectedCity] = useState<string | null>(null)
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null)
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)
  const [geolocationLoading, setGeolocationLoading] = useState(false)

  // Estados para preencher filtros do SearchForm
  const [searchFormEstado, setSearchFormEstado] = useState<string | undefined>(undefined)
  const [searchFormCidade, setSearchFormCidade] = useState<string | undefined>(undefined)
  const locationConfirmedRef = useRef(false) // Ref para rastrear se localização foi confirmada (não usa estado para evitar timing issues)

  // Hidratação inicial: evita fazer fetch "nacional" antes de restaurar a última localidade confirmada
  const [initialHydrated, setInitialHydrated] = useState(false)

  // Persistência de localização confirmada (para manter destaque local após navegar para outros fluxos e voltar)
  const LAST_GEOLOCATION_ESTADO_KEY = 'last-geolocation-estado'
  const LAST_GEOLOCATION_CIDADE_KEY = 'last-geolocation-cidade'

  // Cache leve do grid de destaques (evita recarregar ao entrar/sair de fluxos onde a localidade não muda)
  const FEATURED_CACHE_PREFIX = 'featured-destaque-cache:'
  const FEATURED_CACHE_TTL_MS = 5 * 60 * 1000 // 5 min
  const forceFeaturedFetchRef = useRef(false) // true quando usuário pediu explicitamente (ex.: Destaques Nacional)

  const { estados, municipios, loadMunicipios } = useEstadosCidades()

  // 🧟 ZOMBIE SESSION KILLER: Detectar e remover usuário fantasma específico
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedUser = localStorage.getItem('admin-user-data')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        // ID do usuário fantasma relatado nos logs
        if (user.id === 'c57ab897-c068-46a4-9b12-bb9f2d938fe7') {
          console.warn('🧟 [ZOMBIE KILLER] Sessão fantasma detectada! Exterminando...')
          localStorage.removeItem('admin-auth-token')
          localStorage.removeItem('admin-user-data')
          // Forçar reload para limpar estado da memória
          window.location.reload()
        }
      }
    } catch (e) {
      console.error('Erro no Zombie Killer:', e)
    }
  }, [])

  // Reabrir o modal de informações do corretor após voltar do fluxo "Novo Proprietário" ou refresh do "Negócio Fechado"
  // Adiciona um delay de 2s para o usuário ver o grid atualizado primeiro (requisito UX)
  useEffect(() => {
    const shouldOpen = (searchParams?.get('corretor_home') || '').toLowerCase() === 'true'
    if (!shouldOpen) return
    if (corretorHomeOpenRef.current) return
    if (corretorHomeQueryConsumedRef.current) return
    corretorHomeQueryConsumedRef.current = true

    const timer = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem('corretor_success_user')
        if (raw) {
          const parsed = JSON.parse(raw)

          // Tentar sincronizar isencao do localStorage caso esteja stale no sessionStorage
          try {
            const localRaw = localStorage.getItem('admin-user-data')
            if (localRaw) {
              const localUser = JSON.parse(localRaw)
              if ((localUser.id === parsed.id || localUser.uuid === parsed.id) && localUser.isencao !== undefined) {
                parsed.isencao = !!localUser.isencao
              }
            }
          } catch { }

          if (parsed?.nome && parsed?.email) {
            corretorHomeOpenRef.current = true
            setCorretorHomeUser(parsed)
            setCorretorHomeSuccessOpen(true)

            // Consumir o parâmetro imediatamente para não reabrir em re-hidratações
            try {
              const url = new URL(window.location.href)
              url.searchParams.delete('corretor_home')
              router.replace(url.pathname + (url.search ? url.search : ''))
            } catch { }
          }
        }
      } catch { }
    }, 2000)

    return () => clearTimeout(timer)
  }, [searchParams, router])

  // Abrir painel do corretor sem redirecionar (login via header na própria landpaging).
  // Evita "pisca" e evita duplicidade visual de modais.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: any) => {
      try {
        if (corretorHomeOpenRef.current) return
        const payload = e?.detail
        if (payload?.nome && payload?.email) {
          // Garantir que o popup "Sou Corretor" não fique aberto por trás
          setCorretorPopupOpen(false)
          corretorHomeOpenRef.current = true
          setCorretorHomeUser(payload)
          setCorretorHomeSuccessOpen(true)
        }
      } catch { }
    }
    window.addEventListener('open-corretor-home-modal', handler as EventListener)
    return () => window.removeEventListener('open-corretor-home-modal', handler as EventListener)
  }, [])

  // Abrir popup do corretor quando vindo de cadastro/login de corretor
  useEffect(() => {
    const shouldOpen = (searchParams?.get('corretor_popup') || '').toLowerCase() === 'true'
    if (shouldOpen) {
      setCorretorPopupOpen(true)
      // Limpar o parâmetro corretor_popup da URL
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('corretor_popup')
        router.replace(url.pathname + (url.search ? url.search : ''))
      } catch {
        router.replace('/landpaging')
      }
    }
  }, [searchParams, router])

  // Monitorar mudanças nos valores de estado e cidade para debug
  useEffect(() => {
    console.log('🔍 [LANDING PAGE] Valores de searchForm mudaram:', {
      searchFormEstado,
      searchFormCidade,
      locationConfirmedRef: locationConfirmedRef.current,
      timestamp: new Date().toISOString()
    })
  }, [searchFormEstado, searchFormCidade])

  // Refs para controlar execução única
  const geolocationExecutedRef = useRef(false)
  const geolocationRequestInProgressRef = useRef(false)
  const geolocationModalOpenRef = useRef(false)

  // Se o usuário abriu o modal do corretor, não devemos exibir o modal de geolocalização
  // "por trás" (isso costuma aparecer apenas quando o modal do corretor é fechado).
  const suppressGeolocationModalOnceRef = useRef(false)
  const corretorPopupOpenRef = useRef(false)
  useEffect(() => {
    corretorPopupOpenRef.current = corretorPopupOpen
  }, [corretorPopupOpen])

  const SUPPRESS_GEOLOCATION_MODAL_KEY = 'suppress-geolocation-modal-once'
  const SUPPRESS_GEOLOCATION_DETECT_KEY = 'suppress-geolocation-detect-once'

  // Restaurar última localização confirmada para manter destaque local ao voltar para a landpaging
  // (ex.: fluxo Sou Corretor -> Cadastro -> Retornar -> Fechar modal do corretor)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const estado =
        localStorage.getItem(LAST_GEOLOCATION_ESTADO_KEY) || localStorage.getItem('header-selected-estado')
      const cidade =
        localStorage.getItem(LAST_GEOLOCATION_CIDADE_KEY) || localStorage.getItem('header-selected-cidade')

      if (estado && cidade) {
        // Só restaurar se ainda não houver um contexto de localização em estado atual
        if (!searchFormEstado && !searchFormCidade) {
          console.log('✅ [LANDING PAGE] Restaurando última localização confirmada:', { estado, cidade })
          setSearchFormEstado(estado)
          setSearchFormCidade(cidade)
          setMostrarDestaquesNacional(false)
          setUsadoFallbackNacional(false)
        }
      }
    } catch { }
    // Marcar hidratação como concluída (com ou sem restauração)
    setInitialHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualizar ref quando modal abre/fecha
  useEffect(() => {
    geolocationModalOpenRef.current = geolocationModalOpen
  }, [geolocationModalOpen])

  // Função para detectar localização do usuário com retry mechanism
  const detectUserLocation = useCallback(async (retryCount = 0): Promise<void> => {
    // Se usuário pediu explicitamente para não mostrar novamente, ainda assim
    // vamos detectar e salvar a localização (para filtros), apenas sem abrir modal.
    const geolocationDismissed = localStorage.getItem('geolocation-modal-dismissed')
    const shouldShowModal = geolocationDismissed !== 'true'
    const suppressedBySession =
      typeof window !== 'undefined' && sessionStorage.getItem(SUPPRESS_GEOLOCATION_MODAL_KEY) === 'true'
    const hasCorretorHomeParam = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('corretor_home') === 'true')
    const shouldShowModalNow =
      shouldShowModal && !suppressedBySession && !suppressGeolocationModalOnceRef.current && !corretorPopupOpenRef.current && !corretorHomeOpenRef.current && !corretorHomeQueryConsumedRef.current && !hasCorretorHomeParam

    if (!shouldShowModal) {
      console.log('ℹ️ [LANDING PAGE] Usuário pediu para não mostrar o modal novamente (mas vamos detectar em background)')
    }

    // Verificar se já foi executado nesta sessão
    if (geolocationExecutedRef.current) {
      console.log('ℹ️ [LANDING PAGE] Detecção de localização já foi executada nesta sessão')
      return
    }

    // Verificar se já está em progresso para evitar múltiplas chamadas simultâneas
    if (geolocationRequestInProgressRef.current) {
      console.log('ℹ️ [LANDING PAGE] Detecção de localização já em andamento, aguardando...')
      return
    }

    // Verificar se modal já está aberto (usando ref para valor atualizado)
    if (geolocationModalOpenRef.current) {
      console.log('ℹ️ [LANDING PAGE] Modal de geolocalização já está aberto')
      return
    }

    geolocationRequestInProgressRef.current = true
    setGeolocationLoading(true)

    // Turbo UX: usar a última localização conhecida imediatamente (sem esperar a rede),
    // mas ainda assim rodar a detecção atual (você pediu para rodar a cada refresh).
    try {
      const cachedCity = localStorage.getItem('geolocation-city')
      const cachedRegion = localStorage.getItem('geolocation-region')
      const cachedCountry = localStorage.getItem('geolocation-country')
      if (cachedCity && !detectedCity) {
        setDetectedCity(cachedCity)
        setDetectedRegion(cachedRegion || null)
        setDetectedCountry(cachedCountry || null)
      }
    } catch { }

    // Abrir o modal imediatamente (melhora UX: não “trava” esperando a API)
    // Apenas se o usuário não tiver dispensado permanentemente.
    if (shouldShowModalNow && !geolocationModalOpenRef.current) {
      geolocationModalOpenRef.current = true
      setGeolocationModalOpen(true)
    }

    try {
      console.log(`🔍 [LANDING PAGE] Detectando localização do usuário... (tentativa ${retryCount + 1})`)

      // Fetch sem AbortController: em alguns navegadores/ambientes, AbortController pode disparar AbortError
      // indevidamente e gerar falso-negativo de geolocalização. Preferimos manter o modal em "Detectando..."
      // (sem bloquear a página) até a resposta chegar.
      const response = await fetch('/api/public/geolocation', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' }
      })

      console.log('🔍 [LANDING PAGE] Status da resposta:', response.status)

      if (!response.ok) {
        console.warn('⚠️ [LANDING PAGE] Resposta não OK:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.warn('⚠️ [LANDING PAGE] Dados do erro:', errorData)

        // Não insistir em retries automáticos: não queremos atrasar nem reabrir modal ao voltar
        return
      }

      const data = await response.json()
      console.log('🔍 [LANDING PAGE] Dados recebidos da API:', JSON.stringify(data, null, 2))

      // Verificar se temos cidade (pode estar em data.data.city ou data.city)
      const city = data.data?.city || data.city || null

      if (data.success && city) {
        console.log('✅ [LANDING PAGE] Localização detectada:', {
          city,
          region: data.data?.region || data.region,
          country: data.data?.country || data.country
        })
        setDetectedCity(city)
        setDetectedRegion((data.data?.region || data.region || '').replace(/State of /gi, '') || null)
        setDetectedCountry(data.data?.country || data.country || null)

        // Marcar como executado ANTES de abrir o modal
        geolocationExecutedRef.current = true

        // Se suprimimos o modal nesta visita, consumir o flag para não "travar" para sempre
        try {
          sessionStorage.removeItem(SUPPRESS_GEOLOCATION_MODAL_KEY)
        } catch { }

        // Só abrir modal se não estiver já aberto (usando ref para valor atualizado)
        // RE-CHECK: Verificar novamente se o modal do corretor não foi aberto enquanto aguardávamos a API
        const isCorretorOpenNow = corretorHomeOpenRef.current || corretorPopupOpenRef.current || corretorHomeQueryConsumedRef.current
        if (shouldShowModalNow && !geolocationModalOpenRef.current && !isCorretorOpenNow) {
          geolocationModalOpenRef.current = true
          setGeolocationModalOpen(true)
        }

        // Não salvar 'geolocation-modal-shown' para permitir exibição a cada recarregamento
        localStorage.setItem('geolocation-city', city)
        if (data.data?.region || data.region) {
          localStorage.setItem('geolocation-region', (data.data?.region || data.region).replace(/State of /gi, ''))
        }
        if (data.data?.country || data.country) {
          localStorage.setItem('geolocation-country', data.data?.country || data.country)
        }
      } else if (city) {
        // Mesmo sem success: true, se tiver cidade, mostrar
        console.log('⚠️ [LANDING PAGE] Cidade encontrada mas success=false, exibindo mesmo assim:', city)
        setDetectedCity(city)
        setDetectedRegion((data.data?.region || data.region || '').replace(/State of /gi, '') || null)
        setDetectedCountry(data.data?.country || data.country || null)

        // Marcar como executado ANTES de abrir o modal
        geolocationExecutedRef.current = true

        // Se suprimimos o modal nesta visita, consumir o flag para não "travar" para sempre
        try {
          sessionStorage.removeItem(SUPPRESS_GEOLOCATION_MODAL_KEY)
        } catch { }

        // Só abrir modal se não estiver já aberto (usando ref para valor atualizado)
        const isCorretorOpenNow = corretorHomeOpenRef.current || corretorPopupOpenRef.current || corretorHomeQueryConsumedRef.current
        if (shouldShowModalNow && !geolocationModalOpenRef.current && !isCorretorOpenNow) {
          geolocationModalOpenRef.current = true
          setGeolocationModalOpen(true)
        }

        // Não salvar 'geolocation-modal-shown' para permitir exibição a cada recarregamento
        localStorage.setItem('geolocation-city', city)
        if (data.data?.region || data.region) {
          localStorage.setItem('geolocation-region', (data.data?.region || data.region).replace(/State of /gi, ''))
        }
        if (data.data?.country || data.country) {
          localStorage.setItem('geolocation-country', data.data?.country || data.country)
        }
      } else {
        console.warn('⚠️ [LANDING PAGE] Não foi possível detectar localização')
        console.warn('⚠️ [LANDING PAGE] Resposta completa:', JSON.stringify(data, null, 2))
        // Se não detectou, manter modal aberto apenas se usuário quiser escolher manualmente; caso contrário ele pode fechar.
      }
    } catch (error) {
      console.error('❌ [LANDING PAGE] Erro ao detectar localização:', error)
      if (error instanceof Error) {
        console.error('❌ [LANDING PAGE] Mensagem de erro:', error.message)
        console.error('❌ [LANDING PAGE] Stack:', error.stack)

        // Sem retries automáticos (UX mais rápida e evita executar de novo ao retornar)
      }
      // Não exibir modal em caso de erro (não bloqueia experiência)
    } finally {
      geolocationRequestInProgressRef.current = false
      setGeolocationLoading(false)
    }
  }, []) // Sem dependências - função estável que não muda

  // Detectar localização no primeiro acesso: prioridade máxima para velocidade.
  // NÃO esperar window.load (isso pode demorar 10s+ por causa de imagens/feeds).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (geolocationExecutedRef.current) return

    // Caso especial: se a landpaging foi recarregada apenas para abrir o modal do corretor logado
    // (ex.: pós-login via botão "Entrar"), NÃO reexecutar geolocalização.
    try {
      const suppressDetectOnce = sessionStorage.getItem(SUPPRESS_GEOLOCATION_DETECT_KEY) === 'true'
      if (suppressDetectOnce) {
        sessionStorage.removeItem(SUPPRESS_GEOLOCATION_DETECT_KEY)
        // Também consumir o flag do modal para evitar qualquer abertura "por trás"
        sessionStorage.removeItem(SUPPRESS_GEOLOCATION_MODAL_KEY)

        // Aplicar imediatamente a última detecção conhecida (melhora UX sem bater na API)
        const cachedCity = localStorage.getItem('geolocation-city')
        const cachedRegion = localStorage.getItem('geolocation-region')
        const cachedCountry = localStorage.getItem('geolocation-country')
        if (cachedCity && !detectedCity) {
          setDetectedCity(cachedCity)
          setDetectedRegion(cachedRegion || null)
          setDetectedCountry(cachedCountry || null)
        }

        geolocationExecutedRef.current = true
        console.log('ℹ️ [LANDING PAGE] Geolocalização suprimida (1x) no pós-login do corretor.')
        return
      }
    } catch { }

    const timer = setTimeout(() => {
      console.log('🔍 [LANDING PAGE] Iniciando detecção de localização (sem esperar window.load)...')
      detectUserLocation()
    }, 0)

    return () => clearTimeout(timer)
  }, [detectUserLocation])

  // Expor função global para debug (apenas em desenvolvimento)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).resetGeolocationModal = () => {
        console.log('🔄 [DEBUG] Resetando preferência de geolocalização...')
        localStorage.removeItem('geolocation-modal-dismissed')
        console.log('✅ [DEBUG] Preferência limpa. O modal aparecerá novamente ao recarregar.')
        location.reload()
      }
      console.log('💡 [DEBUG] Função de debug disponível: window.resetGeolocationModal()')
    }
  }, [])

  // Log para debug: verificar se modal deveria estar aberto
  useEffect(() => {
    if (geolocationModalOpen) {
      console.log('✅ [LANDING PAGE] Modal de geolocalização está aberto')
      console.log('✅ [LANDING PAGE] Cidade detectada:', detectedCity)
      console.log('✅ [LANDING PAGE] Região detectada:', detectedRegion)
    }
  }, [geolocationModalOpen, detectedCity, detectedRegion])

  // Escutar evento para abrir modal de perfil
  useEffect(() => {
    const handleOpenMeuPerfilModal = () => {
      setMeuPerfilModalOpen(true)
    }

    window.addEventListener('open-meu-perfil-modal', handleOpenMeuPerfilModal)
    return () => {
      window.removeEventListener('open-meu-perfil-modal', handleOpenMeuPerfilModal)
    }
  }, [])

  // Escutar evento para abrir modal de autenticação com imovelId
  useEffect(() => {
    const handleOpenAuthModal = (event: any) => {
      console.log('🔍 [LANDING PAGE] Evento open-auth-modal recebido:', event.detail)
      const { mode, userType, imovelId } = event.detail || {}

      if (imovelId) {
        console.log('🔍 [LANDING PAGE] Armazenando imovelId pendente:', imovelId)
        setPendingImovelId(imovelId)
        // Também armazenar no sessionStorage como backup
        sessionStorage.setItem('pendingImovelId', imovelId.toString())
      } else {
        // Tentar recuperar do sessionStorage se não foi passado no evento
        const storedImovelId = sessionStorage.getItem('pendingImovelId')
        if (storedImovelId) {
          console.log('🔍 [LANDING PAGE] Recuperando imovelId do sessionStorage:', storedImovelId)
          setPendingImovelId(parseInt(storedImovelId, 10))
        }
      }

      if (mode && userType) {
        console.log('🔍 [LANDING PAGE] Abrindo modal de autenticação:', { mode, userType })
        setAuthModalMode(mode)
        setAuthUserType(userType)
        setAuthModalOpen(true)
      }
    }

    window.addEventListener('open-auth-modal', handleOpenAuthModal as EventListener)
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuthModal as EventListener)
    }
  }, [])

  // Função para registrar interesse após autenticação
  const registrarInteresse = async (clienteUuid: string, imovelId: number) => {
    try {
      console.log('🔍 [LANDING PAGE] Registrando interesse:', { clienteUuid, imovelId })
      const response = await fetch('/api/public/imoveis/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imovelId,
          clienteUuid
        })
      })

      const data = await response.json()
      console.log('🔍 [LANDING PAGE] Resposta da API:', { status: response.status, data })

      if (data.success) {
        console.log('✅ Interesse registrado com sucesso:', data.data)
        setPendingImovelId(null)
        // UX: feedback via toast (não-bloqueante)
        try {
          window.dispatchEvent(
            new CustomEvent('ui-toast', { detail: { type: 'success', message: 'Interesse registrado com sucesso!' } })
          )
        } catch { }
      } else {
        console.warn('⚠️ Erro ao registrar interesse:', data.message, data.details)
        try {
          window.dispatchEvent(
            new CustomEvent('ui-toast', {
              detail: {
                type: 'error',
                message: `Erro ao registrar interesse: ${data.message}${data.details ? ' — ' + data.details : ''}`
              }
            })
          )
        } catch { }
      }
    } catch (error: any) {
      console.error('❌ Erro ao registrar interesse:', error)
      try {
        window.dispatchEvent(
          new CustomEvent('ui-toast', {
            detail: { type: 'error', message: 'Erro de conexão ao registrar interesse. Tente novamente.' }
          })
        )
      } catch { }
    }
  }

  // Escutar mudanças de autenticação para abrir formulário de interesse pendente
  useEffect(() => {
    const handleAuthChanged = () => {
      console.log('🔍 [LANDING PAGE] Evento public-auth-changed recebido')

      // Regra: só CLIENTE pode abrir o modal de interesse.
      // Se a sessão ativa for corretor/proprietário (ou houver sessão admin), bloqueia.
      // Regra: só CLIENTE pode abrir o modal de interesse.
      // Se houver sessão pública ativa que não seja cliente, bloqueia.
      try {
        const lastAuthRaw = localStorage.getItem('public-last-auth-user')
        const lastAuth = lastAuthRaw ? JSON.parse(lastAuthRaw) : null
        const lastType = lastAuth?.userType
        if (lastType && lastType !== 'cliente') {
          console.log('ℹ️ [LANDING PAGE] Bloqueando abertura do modal de interesse: usuário ativo não é cliente')
          return
        }
      } catch { }

      // Tentar recuperar imovelId do estado ou sessionStorage
      let imovelIdToUse = pendingImovelId
      if (!imovelIdToUse) {
        const storedImovelId = sessionStorage.getItem('pendingImovelId')
        if (storedImovelId) {
          imovelIdToUse = parseInt(storedImovelId, 10)
          console.log('🔍 [LANDING PAGE] Usando imovelId do sessionStorage:', imovelIdToUse)
        }
      }

      if (imovelIdToUse) {
        const publicToken = localStorage.getItem('public-auth-token')
        const userData = localStorage.getItem('public-user-data')
        if (publicToken && userData) {
          try {
            const user = JSON.parse(userData)
            if (user.userType === 'cliente' && user.uuid) {
              console.log('✅ [LANDING PAGE] Cliente logado, abrindo formulário de interesse para imovelId:', imovelIdToUse)
              // Buscar título do imóvel se disponível
              const storedTitulo = sessionStorage.getItem('pendingImovelTitulo')
              if (storedTitulo) {
                setPendingImovelTitulo(storedTitulo)
              }
              // Abrir modal de formulário ao invés de registrar diretamente
              setTenhoInteresseFormModalOpen(true)
              // Limpar sessionStorage após abrir modal
              sessionStorage.removeItem('pendingImovelId')
              sessionStorage.removeItem('pendingImovelTitulo')
            } else {
              console.log('⚠️ [LANDING PAGE] Usuário não é cliente ou não tem UUID')
            }
          } catch (error) {
            console.error('❌ Erro ao processar dados do usuário:', error)
          }
        } else {
          console.log('⚠️ [LANDING PAGE] Sessão pública de cliente ausente (token e/ou user-data)')
        }
      } else {
        console.log('⚠️ [LANDING PAGE] Nenhum imovelId pendente encontrado')
      }
    }

    window.addEventListener('public-auth-changed', handleAuthChanged)
    return () => {
      window.removeEventListener('public-auth-changed', handleAuthChanged)
    }
  }, [pendingImovelId])

  // Handler para quando o botão "Tenho Interesse" é clicado
  const handleTenhoInteresseClick = (imovelId: number, imovelTitulo?: string) => {
    // Regra: somente CLIENTE logado pode abrir o modal de interesse.
    // Se o usuário ativo for corretor/proprietário, não permitir.
    // Regra: somente CLIENTE logado pode abrir o modal de interesse.
    try {
      const lastAuthRaw = localStorage.getItem('public-last-auth-user')
      const lastAuth = lastAuthRaw ? JSON.parse(lastAuthRaw) : null
      const lastType = lastAuth?.userType
      if (lastType && lastType !== 'cliente') {
        try {
          window.dispatchEvent(
            new CustomEvent('ui-toast', {
              detail: {
                type: 'warning',
                position: 'center',
                message:
                  'Apenas clientes logados podem registrar interesse. Você poderá acessar a sua conta ou criar um novo cadastro, acessando os botões Criar Conta ou Entrar, localizados no menu superior à direita'
              }
            })
          )
        } catch { }
        return
      }
    } catch { }

    // Verificar se o usuário já está logado como cliente
    const publicToken = localStorage.getItem('public-auth-token')
    const userData = localStorage.getItem('public-user-data')
    if (publicToken && userData) {
      try {
        const user = JSON.parse(userData)
        if (user.userType === 'cliente' && user.uuid) {
          // Usuário já está logado, abrir formulário de interesse
          setPendingImovelId(imovelId)
          if (imovelTitulo) {
            setPendingImovelTitulo(imovelTitulo)
          }
          setTenhoInteresseFormModalOpen(true)
          return
        }
      } catch (error) {
        console.error('❌ Erro ao processar dados do usuário:', error)
      }
    }

    // Regra do produto: se NÃO estiver logado como cliente, NÃO abrir nenhum modal aqui.
    // Apenas instruir o usuário a usar os botões do topo (Criar conta / Entrar).
    try {
      window.dispatchEvent(
        new CustomEvent('ui-toast', {
          detail: {
            type: 'warning',
            position: 'center',
            durationMs: 0,
            message:
              'Apenas clientes logados podem registrar interesse. Você poderá acessar a sua conta ou criar um novo cadastro, acessando os botões Criar Conta ou Entrar, localizados no menu superior à direita'
          }
        })
      )
    } catch { }
    return
  }

  // Carregar municípios quando houver filtro de estado
  useEffect(() => {
    if (lastFilters?.estado) {
      const estado = estados.find(e => e.sigla === lastFilters.estado || e.nome === lastFilters.estado)
      if (estado) {
        loadMunicipios(estado.id)
      }
    }
  }, [lastFilters?.estado, estados, loadMunicipios])

  // Ref para rastrear se estamos em modo destaque nacional
  const mostrarDestaquesNacionalRef = useRef(mostrarDestaquesNacional)

  // Ref para rastrear tipoDestaque para evitar condições de corrida
  const tipoDestaqueRef = useRef(tipoDestaque)

  // Ref para rastrear se estamos carregando para evitar múltiplas chamadas simultâneas
  const carregandoRef = useRef(false)

  // Se alguma mudança acontecer enquanto um carregamento está em andamento,
  // marcamos para rodar novamente assim que o carregamento atual finalizar.
  const pendingReloadRef = useRef(false)

  // Refs para rastrear os últimos valores que causaram um carregamento
  // Forçar o primeiro carregamento sempre (evita cenário "nunca carregou, mas nada mudou")
  const ultimoMostrarDestaquesNacionalCarregado = useRef<boolean | null>(null)
  const ultimoTipoDestaqueCarregado = useRef<'DV' | 'DA' | null>(null)

  // Atualizar refs sempre que os valores mudarem
  useEffect(() => {
    mostrarDestaquesNacionalRef.current = mostrarDestaquesNacional
    console.log('🔍 [REF UPDATE] mostrarDestaquesNacional atualizado:', mostrarDestaquesNacional)
  }, [mostrarDestaquesNacional])

  useEffect(() => {
    tipoDestaqueRef.current = tipoDestaque
    console.log('🔍 [REF UPDATE] tipoDestaque atualizado:', tipoDestaque)
  }, [tipoDestaque])

  useEffect(() => {
    const carregarImoveis = async () => {
      // Evitar fetch antes de restaurar a última localidade confirmada (performance + consistência)
      if (!initialHydrated) {
        return
      }

      // Evitar múltiplas chamadas simultâneas
      if (carregandoRef.current) {
        pendingReloadRef.current = true
        console.log('⚠️ [LANDING PAGE] Já está carregando - marcando recarregamento pendente')
        return
      }

      try {
        // Usar refs para garantir valores atualizados mesmo durante atualizações assíncronas
        const tipoDestaqueAtual = tipoDestaqueRef.current

        // REGRA DEFINITIVA: mostrarDestaquesNacional tem prioridade absoluta
        // Se é true, sempre modo nacional (mesmo que ainda tenhamos estado/cidade temporariamente)
        // Se é false, verificar se temos localização para determinar modo local ou nacional
        const estadoAtual = searchFormEstado || lastFilters?.estado || null
        const cidadeAtual = searchFormCidade || lastFilters?.cidade || null
        const temEstadoOuCidade = !!(estadoAtual || cidadeAtual)

        // PRIORIDADE ABSOLUTA: Se mostrarDestaquesNacional é true, SEMPRE modo nacional
        // Isso garante que quando não há destaque local e ativamos nacional, funcione imediatamente
        const isDestaqueNacional = mostrarDestaquesNacional === true ? true : !temEstadoOuCidade

        console.log('🔍 [LANDING PAGE] Determinação de isDestaqueNacional:', {
          temEstadoOuCidade,
          estadoAtual,
          cidadeAtual,
          searchFormEstado,
          searchFormCidade,
          lastFiltersEstado: lastFilters?.estado,
          lastFiltersCidade: lastFilters?.cidade,
          mostrarDestaquesNacionalState: mostrarDestaquesNacional,
          mostrarDestaquesNacionalRef: mostrarDestaquesNacionalRef.current,
          isDestaqueNacionalFinal: isDestaqueNacional,
          '⚠️ DECISÃO': temEstadoOuCidade ? 'FORÇANDO DESTAQUE LOCAL' : 'USANDO mostrarDestaquesNacional'
        })

        // IMPORTANTE: Se mostrarDestaquesNacional está ativo, ignorar mudanças em searchFormEstado/searchFormCidade
        // para evitar múltiplas chamadas desnecessárias quando os filtros são limpos
        // Só recarregar se mostrarDestaquesNacional ou tipoDestaque realmente mudaram
        const mostrarDestaquesNacionalMudou =
          ultimoMostrarDestaquesNacionalCarregado.current === null
            ? true
            : mostrarDestaquesNacional !== ultimoMostrarDestaquesNacionalCarregado.current
        const tipoDestaqueMudou =
          ultimoTipoDestaqueCarregado.current === null ? true : tipoDestaque !== ultimoTipoDestaqueCarregado.current

        if (isDestaqueNacional) {
          // Se mostrarDestaquesNacional foi ATIVADO (mudou de false para true), sempre recarregar
          // Isso garante que quando não há destaque local, o grid nacional seja exibido
          if (mostrarDestaquesNacionalMudou && mostrarDestaquesNacional === true) {
            console.log('✅ [LANDING PAGE] Destaque nacional ATIVADO - forçando recarregamento')
            // Continuar com o carregamento - não retornar aqui
          } else if (!mostrarDestaquesNacionalMudou && !tipoDestaqueMudou) {
            // Se nenhum dos valores importantes mudou, ignorar mudanças em filtros de localização
            console.log('🔍 [LANDING PAGE] Destaque nacional ativo - ignorando mudanças em filtros de localização')
            return
          }
        } else {
          // Quando estamos em modo destaque local, sempre recarregar se tipoDestaque mudou
          // Isso garante que ao clicar em "Comprar" ou "Alugar", a busca seja feita com o novo tipo
          if (tipoDestaqueMudou) {
            console.log('🔍 [LANDING PAGE] Modo destaque local - tipoDestaque mudou, recarregando com novo tipo:', tipoDestaqueAtual)
            // Continuar com a busca
          }
          // Se mostrarDestaquesNacional mudou de true para false, garantir que não estamos em uma transição
          // Se acabamos de desativar o destaque nacional, não recarregar imediatamente para evitar condições de corrida
          if (mostrarDestaquesNacionalMudou && ultimoMostrarDestaquesNacionalCarregado.current === true) {
            console.log('🔍 [LANDING PAGE] Destaque nacional desativado - aguardando estabilização antes de recarregar')
            // Não retornar aqui - permitir que recarregue, mas garantir que não está em modo destaque nacional
          }
        }

        carregandoRef.current = true
        setLoadingFeatured(true)

        // Construir URL com parâmetros de estado e cidade se disponíveis
        const urlParams = new URLSearchParams()
        urlParams.append('tipo_destaque', tipoDestaqueAtual)

        // VERIFICAÇÃO CRÍTICA: Se temos estado/cidade, SEMPRE usar modo destaque local
        // Esta verificação deve ser feita ANTES de qualquer outra lógica
        // Usar múltiplas fontes para garantir que capturamos o valor correto
        const estadoParaBusca = searchFormEstado || lastFilters?.estado || null
        const cidadeParaBusca = searchFormCidade || lastFilters?.cidade || null
        const temEstadoOuCidadeParaBusca = !!(estadoParaBusca || cidadeParaBusca)

        // REGRA DEFINITIVA E ABSOLUTA: mostrarDestaquesNacional tem PRIORIDADE ABSOLUTA
        // Se mostrarDestaquesNacional é true, SEMPRE buscar destaque nacional, mesmo que tenhamos estado/cidade
        if (mostrarDestaquesNacional) {
          // MODO DESTAQUE NACIONAL - mostrarDestaquesNacional tem prioridade absoluta
          urlParams.append('destaque_nacional_only', 'true')
          console.log('✅✅✅ [LANDING PAGE] MODO DESTAQUE NACIONAL FORÇADO - mostrarDestaquesNacional=true:', {
            tipoDestaque: tipoDestaqueAtual,
            mostrarDestaquesNacional,
            estadoParaBusca,
            cidadeParaBusca,
            '⚠️ REGRA': 'mostrarDestaquesNacional TEM PRIORIDADE ABSOLUTA'
          })
        } else if (temEstadoOuCidadeParaBusca) {
          // MODO DESTAQUE LOCAL - adicionar estado e cidade
          // Só buscar local quando mostrarDestaquesNacional é false E temos localização
          if (estadoParaBusca) {
            urlParams.append('estado', estadoParaBusca)
          }
          if (cidadeParaBusca) {
            urlParams.append('cidade', cidadeParaBusca)
          }

          console.log('✅✅✅ [LANDING PAGE] MODO DESTAQUE LOCAL FORÇADO - temos localização:', {
            estado: estadoParaBusca,
            cidade: cidadeParaBusca,
            tipoDestaque: tipoDestaqueAtual,
            searchFormEstado,
            searchFormCidade,
            lastFiltersEstado: lastFilters?.estado,
            lastFiltersCidade: lastFilters?.cidade,
            mostrarDestaquesNacional,
            '⚠️ REGRA': 'LOCALIZAÇÃO TEM PRIORIDADE (quando mostrarDestaquesNacional=false)'
          })
        } else {
          // MODO DESTAQUE NACIONAL - não temos localização definida E mostrarDestaquesNacional é false
          urlParams.append('destaque_nacional_only', 'true')
          console.log('🔍 [LANDING PAGE] MODO DESTAQUE NACIONAL - sem estado/cidade:', {
            tipoDestaque: tipoDestaqueAtual,
            mostrarDestaquesNacional,
            searchFormEstado,
            searchFormCidade,
            lastFiltersEstado: lastFilters?.estado,
            lastFiltersCidade: lastFilters?.cidade
          })
        }

        // Performance: o grid pagina em 20 — não precisa buscar 50 itens
        urlParams.set('limit', '20')

        const urlFinal = urlParams.toString()
        console.log('🔍 [LANDING PAGE] URL FINAL construída:', {
          urlParams: urlFinal,
          temDestaqueNacionalOnly: urlParams.get('destaque_nacional_only'),
          temEstado: urlParams.get('estado'),
          temCidade: urlParams.get('cidade'),
          tipoDestaque: tipoDestaqueAtual,
          '⚠️ DECISÃO FINAL': temEstadoOuCidadeParaBusca ? '✅ DESTAQUE LOCAL' : '🔍 DESTAQUE NACIONAL',
          '⚠️ URL COMPLETA': `/api/public/imoveis/destaque?${urlFinal}`
        })

        const url = `/api/public/imoveis/destaque?${urlParams.toString()}`
        console.log('🔍 [LANDING PAGE] URL completa para fetch:', url)
        console.log('🔍 [LANDING PAGE] URL contém destaque_nacional_only?', url.includes('destaque_nacional_only'))
        console.log('🔍 [LANDING PAGE] URL contém estado?', url.includes('estado='))
        console.log('🔍 [LANDING PAGE] URL contém cidade?', url.includes('cidade='))

        // Cache: se a chave é a mesma e está fresca, reaproveitar (principalmente ao voltar de fluxos sem mudar filtros/localidade)
        // Só ignoramos cache quando o usuário explicitamente pediu recarregar (forceFeaturedFetchRef=true).
        const cacheKey = `${FEATURED_CACHE_PREFIX}${urlFinal}`
        if (!forceFeaturedFetchRef.current) {
          try {
            const raw = sessionStorage.getItem(cacheKey)
            if (raw) {
              const parsed = JSON.parse(raw)
              const tsOk = typeof parsed?.ts === 'number' && Date.now() - parsed.ts <= FEATURED_CACHE_TTL_MS
              const imoveisOk = Array.isArray(parsed?.imoveis)
              if (tsOk && imoveisOk) {
                console.log('✅ [LANDING PAGE] Cache HIT - reutilizando grid de destaques:', { cacheKey })
                setMensagemSemResultados(null)
                setFeaturedData(parsed.imoveis)
                setUsadoFallbackNacional(false)
                // Atualizar refs dos últimos valores carregados
                ultimoMostrarDestaquesNacionalCarregado.current = isDestaqueNacional
                ultimoTipoDestaqueCarregado.current = tipoDestaqueAtual
                setTipoDestaqueAnterior(tipoDestaqueAtual)
                return
              }
            }
          } catch { }
        }

        const response = await fetch(url)
        const data = await response.json()

        console.log('🔍 [LANDING PAGE] Resposta da API:', {
          ok: response.ok,
          success: data.success,
          quantidadeImoveis: data.imoveis?.length || 0,
          mostrarDestaquesNacional: isDestaqueNacional
        })

        // Verificar novamente se ainda estamos em modo destaque nacional antes de atualizar
        // Isso evita condições de corrida quando o botão é clicado rapidamente
        const aindaEhDestaqueNacional = mostrarDestaquesNacionalRef.current
        const aindaEhMesmoTipoDestaque = tipoDestaqueRef.current === tipoDestaqueAtual

        // IMPORTANTE: Se estávamos buscando destaque nacional mas o estado mudou, ignorar resposta
        if (isDestaqueNacional && (!aindaEhDestaqueNacional || !aindaEhMesmoTipoDestaque)) {
          console.log('⚠️ [LANDING PAGE] Estado mudou durante carregamento - ignorando resposta')
          console.log('⚠️ [LANDING PAGE] Detalhes:', {
            isDestaqueNacional,
            aindaEhDestaqueNacional,
            aindaEhMesmoTipoDestaque,
            tipoDestaqueAtual,
            tipoDestaqueRefAtual: tipoDestaqueRef.current
          })
          carregandoRef.current = false
          setLoadingFeatured(false)
          return
        }

        // IMPORTANTE: Se NÃO estávamos buscando destaque nacional mas o estado mudou para ativo, ignorar resposta
        // Isso evita que quando o botão é clicado rapidamente, resultados de destaque local sejam exibidos
        if (!isDestaqueNacional && aindaEhDestaqueNacional) {
          console.log('⚠️ [LANDING PAGE] Destaque nacional foi ativado durante carregamento - ignorando resposta de destaque local')
          carregandoRef.current = false
          setLoadingFeatured(false)
          return
        }

        if (response.ok && data.success && data.imoveis) {
          console.log('✅ [LANDING PAGE] Imóveis carregados com sucesso:', data.imoveis.length)
          console.log('🔍 [LANDING PAGE] API usou fallback nacional?', data.usadoFallbackNacional)
          console.log('🔍 [LANDING PAGE] Estamos em modo destaque local?', !isDestaqueNacional)

          // REGRA: se o usuário escolheu uma localidade sem destaques locais,
          // então devemos exibir automaticamente os destaques nacionais no grid.
          // A API marca isso com `usadoFallbackNacional=true` quando não encontra local e faz fallback para nacional.
          const operationLabel = tipoDestaqueAtual === 'DA' ? 'Alugar' : 'Comprar'
          const fallbackNacionalPorFaltaDeLocal =
            !isDestaqueNacional && data.usadoFallbackNacional === true && data.imoveis.length > 0

          if (fallbackNacionalPorFaltaDeLocal) {
            console.log('✅ [LANDING PAGE] Sem destaques locais -> exibindo fallback nacional no grid')

            // Cancelar qualquer timeout pendente antes de criar um novo
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }

            // Mostrar mensagem informativa (sem reverter tipo)
            setMensagemSemResultados(
              `Não existem imóveis em destaque para ${operationLabel} nessa localidade. Exibindo destaques nacionais.`
            )
            timeoutRef.current = setTimeout(() => {
              setMensagemSemResultados(null)
              timeoutRef.current = null
            }, 3500)

            setUsadoFallbackNacional(true)
            if (!mostrarDestaquesNacional) {
              setMostrarDestaquesNacional(true)
            }

            setFeaturedData(data.imoveis)
            ultimoMostrarDestaquesNacionalCarregado.current = true
            ultimoTipoDestaqueCarregado.current = tipoDestaqueAtual
            setTipoDestaqueAnterior(tipoDestaqueAtual)
            return
          }

          // Fora do fallback: se estamos em modo local, garantir que flags de fallback/nacional estejam desligadas
          if (!isDestaqueNacional) {
            setUsadoFallbackNacional(false)
            if (mostrarDestaquesNacional) {
              setMostrarDestaquesNacional(false)
            }
          }

          // Validação adicional: se estávamos buscando destaque nacional, garantir que todos os resultados têm destaque_nacional = true
          if (isDestaqueNacional) {
            const imoveisInvalidos = data.imoveis.filter((imovel: any) => !imovel.destaque_nacional)
            if (imoveisInvalidos.length > 0) {
              console.error('❌ [LANDING PAGE] ERRO: API retornou imóveis sem destaque_nacional = true:', imoveisInvalidos.length)
              console.error('❌ [LANDING PAGE] IDs inválidos:', imoveisInvalidos.map((i: any) => i.id))
              // Filtrar apenas imóveis válidos
              data.imoveis = data.imoveis.filter((imovel: any) => imovel.destaque_nacional === true)
              console.log('🔍 [LANDING PAGE] Imóveis válidos após filtro:', data.imoveis.length)
            }
          }

          // Verificar se não há resultados e estamos em modo destaque local (sem fallback)
          if (data.imoveis.length === 0 && !isDestaqueNacional && !data.usadoFallbackNacional) {
            const estadoParaBusca = searchFormEstado || lastFilters?.estado || null
            const cidadeParaBusca = searchFormCidade || lastFilters?.cidade || null
            const operationLabel = tipoDestaqueAtual === 'DA' ? 'Alugar' : 'Comprar'

            console.log('⚠️ [LANDING PAGE] Nenhum imóvel encontrado para destaque local:', {
              tipoDestaque: tipoDestaqueAtual,
              estado: estadoParaBusca,
              cidade: cidadeParaBusca,
              usadoFallbackNacional: data.usadoFallbackNacional
            })

            // Cancelar qualquer timeout pendente antes de criar um novo
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }

            // Sem local e sem fallback (provável ausência total) -> informar e limpar
            setMensagemSemResultados(`Nenhum imóvel em destaque encontrado para ${operationLabel} no momento.`)
            timeoutRef.current = setTimeout(() => {
              setMensagemSemResultados(null)
              timeoutRef.current = null
            }, 3500)

            setFeaturedData([])
            return
          }

          // Se encontrou resultados, limpar mensagem e atualizar dados
          // IMPORTANTE: Cancelar qualquer timeout pendente que possa reverter o tipo
          if (timeoutRef.current) {
            console.log('✅ [LANDING PAGE] Cancelando timeout pendente - encontramos resultados!')
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          setMensagemSemResultados(null)

          setFeaturedData(data.imoveis)

          // Persistir cache (melhora performance ao voltar de rotas/modais sem mudar localidade/filtros)
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), imoveis: data.imoveis }))
          } catch { }

          // Atualizar refs dos últimos valores carregados
          ultimoMostrarDestaquesNacionalCarregado.current = isDestaqueNacional
          ultimoTipoDestaqueCarregado.current = tipoDestaqueAtual

          // Atualizar tipo anterior para o tipo atual (já que encontrou resultados)
          setTipoDestaqueAnterior(tipoDestaqueAtual)
        } else {
          console.warn('⚠️ [LANDING PAGE] Nenhum imóvel retornado ou erro na resposta')

          // Se não é destaque nacional e não há resultados, exibir mensagem e reverter
          if (!isDestaqueNacional) {
            const estadoParaBusca = searchFormEstado || lastFilters?.estado || null
            const cidadeParaBusca = searchFormCidade || lastFilters?.cidade || null
            const operationLabel = tipoDestaqueAtual === 'DA' ? 'Alugar' : 'Comprar'

            setMensagemSemResultados(`Não existem imóveis em destaque para essa localidade para ${operationLabel}`)

            // Reverter ao tipo anterior após 3 segundos
            setTimeout(() => {
              console.log('🔄 [LANDING PAGE] Revertendo tipoDestaque ao anterior (erro):', tipoDestaqueAnterior)
              setTipoDestaque(tipoDestaqueAnterior)
              setMensagemSemResultados(null)
            }, 3000)

            // Não limpar featuredData para manter o grid anterior
            return
          }

          setFeaturedData([])
          setUsadoFallbackNacional(false)
        }
      } catch (error) {
        console.error('❌ [LANDING PAGE] Erro ao carregar imóveis em destaque:', error)
        setFeaturedData([])
        setUsadoFallbackNacional(false)
      } finally {
        carregandoRef.current = false
        setLoadingFeatured(false)
        forceFeaturedFetchRef.current = false

        // Se houve alguma mudança durante o carregamento (ex.: restauramos estado/cidade),
        // disparar um novo ciclo do useEffect para usar estado atualizado (evita stale closure).
        if (pendingReloadRef.current) {
          pendingReloadRef.current = false
          setReloadNonce((n) => n + 1)
        }
      }
    }

    carregarImoveis()
  }, [mostrarDestaquesNacional, searchFormEstado, searchFormCidade, lastFilters?.estado, lastFilters?.cidade, reloadNonce, initialHydrated])

  const mapToPropertyCard = useCallback((imovel: any): PropertyCard => {
    const estado = estados.find((state) => state.sigla === imovel.estado_fk)
    const estadoNome = estado?.nome || imovel.estado_fk || ''

    const precoFormatado = imovel.preco
      ? `R$ ${Number(imovel.preco).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
      : 'Preço sob consulta'

    const localizacao = [imovel.bairro, imovel.cidade_fk, estadoNome].filter(Boolean).join(', ')

    return {
      id: imovel.id,
      title: imovel.titulo,
      price: precoFormatado,
      location: localizacao || 'Localização não informada',
      bedrooms: imovel.quartos || 0,
      bathrooms: imovel.banheiros || 0,
      area: imovel.area_total ? `${imovel.area_total}m²` : '-',
      garages: imovel.vagas_garagem || 0,
      image: imovel.imagem_principal || 'placeholder',
      type: imovel.tipo_nome || 'Imóvel'
    }
  }, [estados])

  const featuredProperties = useMemo(() => featuredData.map(mapToPropertyCard), [featuredData, mapToPropertyCard])

  const totalPages = Math.ceil(featuredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProperties = featuredProperties.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildFilterSummary = () => {
    if (!lastFilters) return 'Filtros personalizados aplicados.'
    const resumo: string[] = []
    if (lastFilters.tipoId) resumo.push('Tipo selecionado')
    if (lastFilters.estado) resumo.push(`Estado: ${lastFilters.estado}`)
    if (lastFilters.cidade) resumo.push(`Cidade: ${lastFilters.cidade}`)
    if (lastFilters.bairro) resumo.push(`Bairro: ${lastFilters.bairro}`)
    if (lastFilters.precoMin || lastFilters.precoMax) resumo.push('Faixa de preço definida')
    if (lastFilters.quartosMin) resumo.push(`≥ ${lastFilters.quartosMin} quartos`)
    if (lastFilters.banheirosMin) resumo.push(`≥ ${lastFilters.banheirosMin} banheiros`)
    if (lastFilters.suitesMin) resumo.push(`≥ ${lastFilters.suitesMin} suítes`)
    if (lastFilters.vagasMin) resumo.push(`≥ ${lastFilters.vagasMin} vagas`)
    if (lastFilters.areaMin) resumo.push(`Área mínima ${lastFilters.areaMin}m²`)
    return resumo.join(' • ') || 'Filtros personalizados aplicados.'
  }

  const buildFilterConcatenation = () => {
    if (!lastFilters) return ''
    const parts: string[] = []

    // Estado
    if (lastFilters.estado) {
      const estado = estados.find(e => e.sigla === lastFilters.estado || e.nome === lastFilters.estado)
      if (estado) {
        parts.push(estado.nome)
      } else {
        parts.push(lastFilters.estado)
      }
    }

    // Cidade
    if (lastFilters.cidade) {
      const cidade = municipios.find(m => m.nome === lastFilters.cidade)
      if (cidade) {
        parts.push(cidade.nome)
      } else {
        parts.push(lastFilters.cidade)
      }
    }

    return parts.length > 0 ? ` - ${parts.join(' - ')}` : ''
  }

  // Função para construir o título do grid de destaque local
  const buildFeaturedLocalTitle = useMemo(() => {
    if (mostrarDestaquesNacional) {
      return null // Não exibir título quando destaque nacional está ativo
    }

    // Se a API usou fallback para destaque nacional, mostrar título de destaque nacional
    if (usadoFallbackNacional) {
      return null // Retornar null para usar o título do card compacto (buildTitle)
    }

    const operationLabel = tipoDestaque === 'DA' ? 'Alugar' : 'Comprar'
    const quantidade = featuredProperties.length

    // Obter estado e cidade dos filtros ou dos imóveis exibidos
    const estadoSigla = searchFormEstado || lastFilters?.estado
    const cidadeNome = searchFormCidade || lastFilters?.cidade

    // Se não há filtros de localização, tentar obter dos imóveis exibidos
    let estadoNome = ''
    let cidadeFinal = ''

    if (estadoSigla) {
      const estado = estados.find(e => e.sigla === estadoSigla || e.nome === estadoSigla)
      estadoNome = estado?.nome || estadoSigla
    }

    if (cidadeNome) {
      cidadeFinal = cidadeNome
    }

    // Construir título: "Imóveis em Destaque - Comprar/Alugar"
    let titulo = `${TITULO_DESTAQUE} - ${operationLabel}`

    if (cidadeFinal && estadoNome) {
      titulo += ` - ${cidadeFinal}, ${estadoNome}`
    } else if (estadoNome) {
      titulo += ` - ${estadoNome}`
    }

    return titulo
  }, [mostrarDestaquesNacional, usadoFallbackNacional, tipoDestaque, featuredProperties.length, searchFormEstado, searchFormCidade, lastFilters?.estado, lastFilters?.cidade, estados])

  const buildTitle = useMemo(() => {
    // REGRA CRÍTICA: mostrarDestaquesNacional tem PRIORIDADE ABSOLUTA
    // Se mostrarDestaquesNacional é true, SEMPRE retornar título nacional, ignorando localização
    if (mostrarDestaquesNacional === true || usadoFallbackNacional === true) {
      const operacaoLabel = tipoDestaque === 'DA' ? 'Alugar' : 'Comprar'
      const tituloCompleto = `${TITULO_DESTAQUE} - Nacionais - ${operacaoLabel}`
      console.log('✅ [BUILD TITLE] Destaque nacional ativo - retornando título nacional:', {
        mostrarDestaquesNacional,
        usadoFallbackNacional,
        tipoDestaque,
        operacaoLabel,
        tituloCompleto,
        '⚠️ IGNORANDO LOCALIZAÇÃO': { searchFormEstado, searchFormCidade, lastFilters: lastFilters?.estado || lastFilters?.cidade }
      })
      return tituloCompleto
    }

    // Se não é destaque nacional, usar título de destaque local baseado em estado/cidade
    const temEstadoOuCidade = !!(searchFormEstado || searchFormCidade || lastFilters?.estado || lastFilters?.cidade)

    if (temEstadoOuCidade) {
      // Modo destaque local - usar título local
      const operationLabel = tipoDestaque === 'DA' ? 'Alugar' : 'Comprar'

      // Construir título local manualmente
      const estadoSigla = searchFormEstado || lastFilters?.estado || null
      const cidadeNome = searchFormCidade || lastFilters?.cidade || null

      let estadoNome = ''
      if (estadoSigla) {
        const estado = estados.find(e => e.sigla === estadoSigla || e.nome === estadoSigla)
        estadoNome = estado?.nome || estadoSigla
      }

      let tituloLocal = `${TITULO_DESTAQUE} - ${operationLabel}`
      if (cidadeNome && estadoNome) {
        tituloLocal += ` - ${cidadeNome}, ${estadoNome}`
      } else if (estadoNome) {
        tituloLocal += ` - ${estadoNome}`
      }

      console.log('✅ [BUILD TITLE] Modo destaque local - retornando título local:', {
        tituloLocal,
        operationLabel,
        estado: estadoSigla,
        cidade: cidadeNome
      })
      return tituloLocal
    }

    // Se não é destaque nacional nem tem localização, retornar título padrão
    const tituloPadrao = TITULO_DESTAQUE
    console.log('🔍 [BUILD TITLE] Retornando título padrão', {
      mostrarDestaquesNacional,
      usadoFallbackNacional,
      tituloRetornado: tituloPadrao
    })
    return tituloPadrao
  }, [mostrarDestaquesNacional, usadoFallbackNacional, tipoDestaque, searchFormEstado, searchFormCidade, lastFilters?.estado, lastFilters?.cidade, estados])

  // Função para construir URL do mapa baseado no contexto atual
  const construirUrlMapa = useCallback((tipo: 'nacional' | 'local' | 'filtros') => {
    const params = new URLSearchParams({ tipo })

    if (tipo === 'nacional') {
      params.append('tipo_destaque', tipoDestaque)
    } else if (tipo === 'local') {
      params.append('tipo_destaque', tipoDestaque)
      if (searchFormEstado) params.append('estado', searchFormEstado)
      if (searchFormCidade) params.append('cidade', searchFormCidade)
    } else if (tipo === 'filtros') {
      if (lastFilters?.operation) params.append('operation', lastFilters.operation)
      if (lastFilters?.estado) params.append('estado', lastFilters.estado)
      if (lastFilters?.cidade) params.append('cidade', lastFilters.cidade)
      if (lastFilters?.precoMin) params.append('precoMin', lastFilters.precoMin.toString())
      if (lastFilters?.precoMax) params.append('precoMax', lastFilters.precoMax.toString())
      if (lastFilters?.quartosMin) params.append('quartos_min', lastFilters.quartosMin.toString())
      if (lastFilters?.banheirosMin) params.append('banheiros_min', lastFilters.banheirosMin.toString())
      if (lastFilters?.tipoId) params.append('tipoId', lastFilters.tipoId.toString())
      if (lastFilters?.bairro) params.append('bairro', lastFilters.bairro)
    }

    // Permite que o botão "Voltar" do mapa retorne para a tela correta (ex.: landpaging)
    try {
      if (typeof window !== 'undefined') {
        const returnTo = window.location.pathname + window.location.search
        params.append('return_to', returnTo)
      }
    } catch { }

    return `/mapa-imoveis?${params.toString()}`
  }, [tipoDestaque, searchFormEstado, searchFormCidade, lastFilters])

  const buildSubtitle = useMemo(() => {
    // Se mostrarDestaquesNacional é true OU se foi usado fallback nacional, retornar subtítulo de destaque nacional
    if (mostrarDestaquesNacional === true || usadoFallbackNacional === true) {
      console.log('🔍 [BUILD SUBTITLE] Retornando subtítulo de destaque nacional', {
        mostrarDestaquesNacional,
        usadoFallbackNacional
      })
      return 'Descubra as melhores oportunidades do mercado imobiliário em todo o Brasil'
    }

    // Se não é destaque nacional nem fallback, calcular subtítulo dinâmico
    if (mostrarDestaquesNacional === false) {
      // Se não é destaque nacional, calcular subtítulo dinâmico
      console.log('🔍 [BUILD SUBTITLE] mostrarDestaquesNacional é FALSE - calculando subtítulo dinâmico', {
        state: mostrarDestaquesNacional,
        ref: mostrarDestaquesNacionalRef.current
      })

      const filtroEstado = searchFormEstado || lastFilters?.estado
      const filtroCidade = searchFormCidade || lastFilters?.cidade
      const temFiltroEstado = !!filtroEstado
      const temFiltroCidade = !!filtroCidade

      // Se não há filtros de localização, retornar subtítulo padrão (não "Nacional")
      // para evitar confusão visual quando o botão "Destaques Nacional" é desativado
      if (!temFiltroEstado && !temFiltroCidade) {
        return 'Descubra as melhores oportunidades do mercado imobiliário'
      }

      if (featuredProperties.length > 0 && (temFiltroEstado || temFiltroCidade)) {
        const cidadesEstados = new Set<string>()
        featuredData.forEach((imovel) => {
          const estado = estados.find((state) => state.sigla === imovel.estado_fk)
          const estadoNome = estado?.nome || imovel.estado_fk || ''
          const cidadeNome = imovel.cidade_fk || ''
          if (cidadeNome && estadoNome) {
            cidadesEstados.add(`${cidadeNome} - ${estadoNome}`)
          }
        })

        if (cidadesEstados.size > 1) {
          return 'Nacional'
        }

        const localizacoes = Array.from(cidadesEstados)
        if (localizacoes.length > 0) {
          const localizacaoUnica = localizacoes[0]

          if (temFiltroEstado) {
            const estadoFiltrado = estados.find(e => e.sigla === filtroEstado || e.nome === filtroEstado)
            const estadoFiltradoNome = estadoFiltrado?.nome || filtroEstado

            if (!localizacaoUnica.includes(estadoFiltradoNome)) {
              return 'Nacional'
            }

            if (temFiltroCidade && filtroCidade) {
              if (!localizacaoUnica.toLowerCase().includes(filtroCidade.toLowerCase())) {
                return 'Nacional'
              }
            }
          }

          return localizacaoUnica
        }
      }

      return 'Descubra as melhores oportunidades do mercado imobiliário'
    }

    // Se mostrarDestaquesNacional é true, sempre retornar o padrão correto
    // Não usar o ref aqui porque quando o state é true, já é suficiente
    if (mostrarDestaquesNacional === true) {
      console.log('🔍 [BUILD SUBTITLE] mostrarDestaquesNacional é TRUE - retornando padrão correto', {
        state: mostrarDestaquesNacional,
        ref: mostrarDestaquesNacionalRef.current
      })
      return 'Descubra as melhores oportunidades do mercado imobiliário em todo o Brasil'
    }

    // Fallback (não deveria chegar aqui, mas por segurança)
    console.log('🔍 [BUILD SUBTITLE] Fallback - retornando subtítulo padrão', {
      state: mostrarDestaquesNacional,
      ref: mostrarDestaquesNacionalRef.current
    })
    return 'Descubra as melhores oportunidades do mercado imobiliário'
  }, [mostrarDestaquesNacional, searchFormEstado, searchFormCidade, lastFilters?.estado, lastFilters?.cidade, featuredProperties.length, featuredData, estados])

  const buildQueryString = (filters: SearchFormFilters, page: number) => {
    const params = new URLSearchParams()
    if (filters.tipoId) params.append('tipo', String(filters.tipoId))
    if (filters.estado) params.append('estado', filters.estado)
    if (filters.cidade) params.append('cidade', filters.cidade)
    if (filters.bairro) params.append('bairro', filters.bairro)
    if (filters.precoMin) params.append('preco_min', String(filters.precoMin))
    if (filters.precoMax) params.append('preco_max', String(filters.precoMax))
    if (filters.quartosMin) params.append('quartos_min', String(filters.quartosMin))
    if (filters.quartosMax) params.append('quartos_max', String(filters.quartosMax))
    if (filters.banheirosMin) params.append('banheiros_min', String(filters.banheirosMin))
    if (filters.banheirosMax) params.append('banheiros_max', String(filters.banheirosMax))
    if (filters.suitesMin) params.append('suites_min', String(filters.suitesMin))
    if (filters.suitesMax) params.append('suites_max', String(filters.suitesMax))
    if (filters.vagasMin) params.append('vagas_min', String(filters.vagasMin))
    if (filters.vagasMax) params.append('vagas_max', String(filters.vagasMax))
    if (filters.areaMin) params.append('area_min', String(filters.areaMin))
    if (filters.areaMax) params.append('area_max', String(filters.areaMax))
    // Adicionar operation (Comprar/Alugar) para filtrar por vender_landpaging ou alugar_landpaging
    if (filters.operation) params.append('operation', filters.operation)
    params.append('page', String(page))
    params.append('limit', String(itemsPerPage))
    return params.toString()
  }

  const fetchFilteredImoveis = async (filters: SearchFormFilters, page: number = 1) => {
    setFiltersLoading(true)
    setFiltersError(null)
    try {
      const query = buildQueryString(filters, page)
      const response = await fetch(`/api/public/imoveis/pesquisa?${query}`)
      const data: FilteredResponse = await response.json()

      if (!response.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error('Erro ao buscar imóveis')
      }

      // Se não encontrou resultados filtrados, exibir modal e fazer fallback para destaque nacional
      if (data.data.length === 0 && data.pagination.total === 0) {
        console.log('🔍 [LANDING PAGE] Nenhum resultado filtrado encontrado - exibindo modal e fazendo fallback para destaque nacional')

        // Resetar barra de progresso
        setProgressBarWidth(0)

        // Exibir modal
        setNoResultsModalOpen(true)

        // Animar barra de progresso de 0% a 100% em 6 segundos
        const progressInterval = setInterval(() => {
          setProgressBarWidth((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval)
              return 100
            }
            return prev + 1
          })
        }, 60) // Atualizar a cada 60ms (6 segundos / 100 = 60ms por 1%)

        // Após 6 segundos, fazer fallback para destaque nacional
        setTimeout(async () => {
          clearInterval(progressInterval)
          setNoResultsModalOpen(false)
          setProgressBarWidth(0)

          // Buscar imóveis em destaque nacional com a operação correta
          const operation = filters.operation || tipoDestaque
          const destaqueResponse = await fetch(`/api/public/imoveis/destaque?tipo_destaque=${operation}&destaque_nacional_only=true`)
          const destaqueData = await destaqueResponse.json()

          if (destaqueResponse.ok && destaqueData.success && destaqueData.imoveis && destaqueData.imoveis.length > 0) {
            console.log('✅ [LANDING PAGE] Fallback para destaque nacional: encontrados', destaqueData.imoveis.length, 'imóveis')

            // Converter para PropertyCard
            const imoveisNacional = destaqueData.imoveis.map(mapToPropertyCard)

            // IMPORTANTE: Setar flags de estado ANTES de setar os resultados
            // Isso evita que o componente renderize "Resultados" (que parecem locais)
            // antes de saber que são "Nacionais", prevenindo títulos incorretos (ex: "Maranhão" em lista de SP)
            setUsadoFallbackNacional(true) // Marcar que foi usado fallback nacional
            setMostrarDestaquesNacional(true) // Ativar flag para exibir título correto
            setFiltersActive(true)

            setFilteredResults(imoveisNacional)
            setFilteredPagination({
              page: 1,
              total: imoveisNacional.length,
              totalPages: 1
            })
            setLastFilters(filters)
          }
        }, 6000) // 6 segundos

        return
      }

      setFilteredResults(data.data.map(mapToPropertyCard))
      setFilteredPagination({
        page: data.pagination.page,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      })
      setFiltersActive(true)
      setLastFilters(filters)
      setUsadoFallbackNacional(false) // Resetar flag se encontrou resultados filtrados
      setMostrarDestaquesNacional(false) // Desativar destaque nacional se encontrou resultados filtrados
    } catch (error) {
      console.error('Erro na busca filtrada:', error)
      setFiltersError('Não foi possível carregar os imóveis filtrados.')
      setFilteredResults([])
    } finally {
      setFiltersLoading(false)
    }
  }

  const handleFilterSearch = (filters: SearchFormFilters) => {
    // IMPORTANTE: Quando filtros são aplicados, desativar destaque nacional APENAS se não vamos fazer fallback
    // O fallback será determinado dentro de fetchFilteredImoveis
    // Por isso, não resetamos mostrarDestaquesNacional aqui - será gerenciado pelo fetchFilteredImoveis

    // Resetar flag de fallback antes de buscar (será setada novamente se houver fallback)
    setUsadoFallbackNacional(false)

    // Atualizar tipoDestaque quando os filtros são aplicados
    // Isso garante que quando "Destaques Nacional" for acionado novamente,
    // o título reflita corretamente a operação (Comprar/Alugar) usada nos filtros
    if (filters.operation && filters.operation !== tipoDestaque) {
      console.log('🔍 [LANDING PAGE] Atualizando tipoDestaque com operation dos filtros:', {
        operationAnterior: tipoDestaque,
        operationNovo: filters.operation
      })
      setTipoDestaque(filters.operation)
    }
    fetchFilteredImoveis(filters, 1)
  }

  const handleFilterPageChange = (page: number) => {
    if (!lastFilters) return
    fetchFilteredImoveis(lastFilters, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredStartIndex = (filteredPagination.page - 1) * itemsPerPage
  const filteredEndIndex = Math.min(filteredStartIndex + itemsPerPage, filteredPagination.total)

  const handleClearFilters = () => {
    setFiltersActive(false)
    setFilteredResults([])
    setFilteredPagination({ page: 1, total: 0, totalPages: 1 })
    setFiltersError(null)
    setLastFilters(null)
    setCurrentPage(1)
    setTimeout(() => {
      const section = document.querySelector('section.pt-8.pb-16')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleVenderClick = () => {
    setVenderPopupOpen(true)
  }

  const handleCadastrarProprietario = (finalidade: number) => {
    // Guardar finalidade escolhida no sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('finalidadeEscolhida', String(finalidade))
    }
    setVenderPopupOpen(false)
    setAuthUserType('proprietario')
    setAuthModalMode('register')
    setAuthModalOpen(true)
  }

  const handleLoginProprietario = (finalidade: number) => {
    // Guardar finalidade escolhida no sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('finalidadeEscolhida', String(finalidade))
    }
    setVenderPopupOpen(false)
    setAuthUserType('proprietario')
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  // Componente Feed Inline para Debug
  function FeedSectionInline() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedStatus, setFeedStatus] = useState<{
      status: 'ativo' | 'parado' | 'erro' | 'desconhecido';
      mensagem: string;
      dados?: any;
    } | null>(null);

    // IconRenderer dentro do FeedSectionInline
    const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
      try {
        const Icon = (HeroIcons as any)[iconName];
        if (!Icon) {
          return null;
        }
        return <Icon className={className} />;
      } catch (error) {
        console.error('Erro ao renderizar ícone:', iconName, error);
        return null;
      }
    };

    // Verificar status do serviço de feed
    useEffect(() => {
      async function checkFeedStatus() {
        try {
          const res = await fetch('/api/public/feed/status', {
            cache: 'no-store'
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setFeedStatus({
                status: data.status,
                mensagem: data.mensagem,
                dados: data.dados
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ [FeedSection] Erro ao verificar status do feed:', err);
        }
      }

      checkFeedStatus();
      // Verificar status a cada 5 minutos
      const interval = setInterval(checkFeedStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }, []);

    // Verificar status do serviço de feed
    useEffect(() => {
      async function checkFeedStatus() {
        try {
          const res = await fetch('/api/public/feed/status', {
            cache: 'no-store'
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setFeedStatus({
                status: data.status,
                mensagem: data.mensagem,
                dados: data.dados
              });
            }
          }
        } catch (err) {
          console.warn('⚠️ [FeedSection] Erro ao verificar status do feed:', err);
        }
      }

      checkFeedStatus();
      // Verificar status a cada 5 minutos
      const interval = setInterval(checkFeedStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      async function fetchFeed() {
        try {
          console.log('🔍 [FeedSection] Buscando feed...');
          const res = await fetch('/api/public/feed', {
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          console.log('🔍 [FeedSection] Status da resposta:', res.status);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            console.error('❌ [FeedSection] Erro na resposta:', errorData);
            throw new Error(errorData.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          console.log('🔍 [FeedSection] Dados recebidos:', data);
          console.log('🔍 [FeedSection] Tipo de data:', typeof data);
          console.log('🔍 [FeedSection] data.success:', data.success);
          console.log('🔍 [FeedSection] data.data:', data.data);
          console.log('🔍 [FeedSection] Array.isArray(data.data):', Array.isArray(data.data));

          if (data.success && Array.isArray(data.data)) {
            console.log('✅ [FeedSection] Posts recebidos:', data.data.length);
            setPosts(data.data);
            setLoading(false);
          } else {
            console.warn('⚠️ [FeedSection] Formato de resposta inválido:', data);
            setError(data.error || 'Formato de resposta inválido');
            setLoading(false);
          }
        } catch (err: any) {
          console.error('❌ [FeedSection] Erro ao buscar feed:', err);
          console.error('❌ [FeedSection] Stack:', err.stack);
          setError(err.message || 'Erro ao carregar feed');
          setLoading(false);
        }
      }

      fetchFeed();
    }, []);

    // Debug: mostrar estado atual
    console.log('🔍 [FeedSection] Estado atual:', { loading, error, postsCount: posts?.length || 0 });

    // Não renderizar nada se estiver carregando (evita flash)
    if (loading) {
      console.log('⏳ [FeedSection] Ainda carregando...');
      return null;
    }

    // Não renderizar se houver erro (mas mostrar no console)
    if (error) {
      console.warn('⚠️ [FeedSection] Erro ao carregar feed:', error);
      return null;
    }

    // Renderizar mensagem se não houver posts (para debug)
    if (!posts || posts.length === 0) {
      console.warn('⚠️ [FeedSection] Nenhum post encontrado');
      // Retornar null para não mostrar nada (comportamento esperado)
      return null;
    }

    // Componente de Status do Serviço
    const FeedStatusIndicator = () => {
      if (!feedStatus) return null;

      const statusColors = {
        ativo: 'bg-green-100 text-green-800 border-green-300',
        parado: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        erro: 'bg-red-100 text-red-800 border-red-300',
        desconhecido: 'bg-gray-100 text-gray-800 border-gray-300'
      };

      const statusIcons = {
        ativo: '✅',
        parado: '⚠️',
        erro: '❌',
        desconhecido: '❓'
      };

      return (
        <div className={`mb-6 p-3 rounded-lg border ${statusColors[feedStatus.status]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{statusIcons[feedStatus.status]}</span>
              <div>
                <p className="text-sm font-medium">
                  Status do Serviço de Feed: {feedStatus.status.toUpperCase()}
                </p>
                <p className="text-xs mt-1">{feedStatus.mensagem}</p>
                {feedStatus.dados && (
                  <div className="text-xs mt-1 space-y-0.5">
                    {feedStatus.dados.total_conteudos > 0 && (
                      <span>• {feedStatus.dados.total_conteudos} conteúdos disponíveis</span>
                    )}
                    {feedStatus.dados.jobs_pendentes > 0 && (
                      <span>• {feedStatus.dados.jobs_pendentes} jobs pendentes</span>
                    )}
                    {feedStatus.dados.fontes_com_erro > 0 && (
                      <span>• {feedStatus.dados.fontes_com_erro} fonte(s) com erro</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {feedStatus.status === 'parado' && (
              <button
                onClick={() => window.open('/docs/VERIFICAR_SERVICO_FEED.md', '_blank')}
                className="text-xs underline hover:no-underline"
              >
                Como reiniciar?
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <section className="w-full py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-[2496px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho da Seção */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Fique por Dentro do Mercado
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              As últimas notícias, tendências e análises do setor imobiliário selecionadas para você.
            </p>
          </div>


          {/* Grid de Posts (Desktop: 2 linhas de 4 colunas, Mobile: Scroll Horizontal) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4 lg:pb-0 lg:overflow-visible snap-x snap-mandatory scrollbar-hide">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={post.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className="snap-center shrink-0 w-[85vw] sm:w-auto group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 h-full"
              >
                {/* Imagem */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                  {post.url_imagem ? (
                    <Image
                      src={post.url_imagem}
                      alt={post.titulo}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                      <IconRenderer iconName={post.categoria_icone || 'NewspaperIcon'} className="w-16 h-16" />
                    </div>
                  )}

                  {/* Badge Categoria */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
                      style={{ color: post.categoria_cor || '#3B82F6' }}
                    >
                      <IconRenderer iconName={post.categoria_icone || 'NewspaperIcon'} className="w-3 h-3 mr-1" />
                      {post.categoria_nome}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-5 flex flex-col flex-grow">
                  {/* Metadados */}
                  <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                    <span className="font-medium text-blue-600">{post.fonte_nome}</span>
                    <span>•</span>
                    <time dateTime={post.data_publicacao}>
                      {new Date(post.data_publicacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>

                  {/* Título */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {post.titulo}
                  </h3>

                  {/* Resumo */}
                  {post.resumo && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                      {post.resumo.replace(/<[^>]*>?/gm, '')}
                    </p>
                  )}

                  {/* Rodapé do Card */}
                  <div className="pt-4 mt-auto border-t border-gray-50 flex items-center text-blue-600 text-sm font-medium">
                    Ler na íntegra
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Seção de Categorias e Feeds Antigos */}
          <FeedCategoriasSection />
        </div>
      </section>
    );
  }

  // Verificar componentes antes de renderizar
  try {
    console.log('🔍 [LANDING PAGE] Verificando componentes:', {
      HeroSection: typeof HeroSection,
      LandingPropertyCard: typeof LandingPropertyCard,
      SearchForm: typeof SearchForm,
      VenderPopup: typeof VenderPopup,
      AuthModal: typeof AuthModal,
      MeuPerfilModal: typeof MeuPerfilModal,
      TenhoInteresseFormModal: typeof TenhoInteresseFormModal,
      GeolocationModal: typeof GeolocationModal,
      ArrowTrendingUpIcon: typeof ArrowTrendingUpIcon,
      StarIcon: typeof StarIcon,
      Home: typeof Home,
      Building: typeof Building,
      Image: typeof Image,
      Link: typeof Link
    });
  } catch (error) {
    console.error('❌ [LANDING PAGE] Erro ao verificar componentes:', error);
  }

  return (
    <div className="min-h-screen">
      <ToastViewport />
      <HeroSection
        venderButton={
          <button
            onClick={handleVenderClick}
            className="w-[280px] h-[72px] px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-2xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/20"
          >
            <ArrowTrendingUpIcon className="w-6 h-6 flex-shrink-0" />
            <span className="text-center leading-tight">Anuncie o seu imovel para Vender ou Alugar</span>
          </button>
        }
        destaquesNacionalButton={
          <button
            onClick={() => {
              const novoEstado = !mostrarDestaquesNacional
              console.log('🔍 [LANDING PAGE] Botão Destaques Nacional clicado:', {
                estadoAtual: mostrarDestaquesNacional,
                novoEstado
              })

              // Ação explícita do usuário: ao ATIVAR o Destaque Nacional, devemos recarregar o grid
              // (ao desativar, a exibição volta ao padrão local/não-local e o cache pode ser reaproveitado)
              if (novoEstado === true) {
                forceFeaturedFetchRef.current = true
              }

              // IMPORTANTE: Se estamos ATIVANDO o destaque nacional (novoEstado === true),
              // usar flushSync para garantir que mostrarDestaquesNacional seja atualizado
              // ANTES de limpar os filtros, evitando que buildSubtitle recalcule com estado inconsistente
              if (novoEstado === true) {
                // Atualizar mostrarDestaquesNacional PRIMEIRO de forma síncrona quando ativando
                flushSync(() => {
                  setMostrarDestaquesNacional(true)
                })

                // Depois limpar filtros (agora mostrarDestaquesNacional já está true)
                setFiltersActive(false)
                setFilteredResults([])
                setFilteredPagination({ page: 1, total: 0, totalPages: 1 })
                setLastFilters(null)
                setSearchFormEstado(undefined)
                setSearchFormCidade(undefined)
                setUsadoFallbackNacional(false) // Resetar flag de fallback ao ativar destaque nacional manualmente
              } else {
                // Se estamos DESATIVANDO, atualizar mostrarDestaquesNacional PRIMEIRO de forma síncrona
                // para garantir que os labels sejam atualizados corretamente antes de limpar os filtros
                flushSync(() => {
                  setMostrarDestaquesNacional(false)
                })

                // Depois limpar filtros (agora mostrarDestaquesNacional já está false)
                setFiltersActive(false)
                setFilteredResults([])
                setFilteredPagination({ page: 1, total: 0, totalPages: 1 })
                setLastFilters(null)
                setSearchFormEstado(undefined)
                setSearchFormCidade(undefined)
                setUsadoFallbackNacional(false) // Resetar flag de fallback ao desativar destaque nacional
              }

              setCurrentPage(1) // Reset página ao trocar
            }}
            className={`w-[280px] h-[72px] px-6 py-4 text-white font-bold text-base rounded-2xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/20 whitespace-nowrap ${mostrarDestaquesNacional
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-purple-500 hover:bg-purple-600'
              }`}
          >
            <StarIcon className="w-6 h-6 flex-shrink-0" />
            {TITULO_DESTAQUE_NACIONAL}
          </button>
        }
        filterPanel={
          <SearchForm
            onSearch={handleFilterSearch}
            onClear={handleClearFilters}
            isSearching={filtersLoading}
            hasActiveFilters={filtersActive}
            initialEstado={searchFormEstado}
            initialCidade={searchFormCidade}
            onOperationChange={(operation) => {
              // Se destaque nacional está ativo, não alterar tipoDestaque para evitar alternância
              if (mostrarDestaquesNacional) {
                console.log('🔍 [SEARCH FORM] Destaque nacional ativo - ignorando mudança de tipoDestaque')
                return
              }
              setTipoDestaque(operation)
              setCurrentPage(1) // Reset página ao trocar
            }}
            customOperation={tipoDestaque}
          />
        }
      />

      {/* Banners por perfil (não conflita com o card lateral "Anuncie..." pois fica no fluxo principal) */}
      <ProfileBanners
        onProprietarioClick={handleVenderClick}
        onClienteClick={() => {
          setAuthUserType('cliente')
          setAuthModalMode('register')
          setAuthModalOpen(true)
        }}
        onCorretorClick={() => {
          // Se já existe sessão de CORRETOR (admin login) válida no client, abrir direto o painel/modal do corretor.
          // Caso contrário, seguir fluxo padrão (popup -> login/cadastro).
          try {
            const token = localStorage.getItem('auth-token')
            const raw = localStorage.getItem('user-data')
            if (token && raw) {
              const parsed: any = JSON.parse(raw)
              const roleName = String(parsed?.role_name || parsed?.cargo || '').toLowerCase()
              const isCorretor = roleName.includes('corretor') || !!token
              if (isCorretor) {
                const fotoBase64 = (parsed?.foto as string | null | undefined) || null
                const fotoMime = (parsed?.foto_tipo_mime as string | null | undefined) || 'image/jpeg'
                const fotoDataUrl = fotoBase64 ? `data:${fotoMime};base64,${fotoBase64}` : undefined

                setCorretorHomeUser({
                  id: String(parsed?.id || parsed?.uuid || ''),
                  nome: String(parsed?.nome || ''),
                  email: String(parsed?.email || ''),
                  telefone: parsed?.telefone ? String(parsed.telefone) : undefined,
                  cpf: parsed?.cpf ? String(parsed.cpf) : undefined,
                  creci: parsed?.creci ? String(parsed.creci) : undefined,
                  fotoDataUrl,
                  isencao: parsed?.isencao !== undefined ? !!parsed.isencao : undefined
                })
                setCorretorHomeSuccessOpen(true)
                return
              }
            }
          } catch { }

          // Fluxo padrão: abrir popup do corretor
          suppressGeolocationModalOnceRef.current = true
          try {
            sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
          } catch { }
          geolocationModalOpenRef.current = false
          setGeolocationModalOpen(false)
          setCorretorPopupOpen(true)
        }}
      />

      <section className="pt-8 pb-16 px-4 sm:px-6">
        <div className="w-full mx-auto">
          {/* Header com botões em card compacto - Visível quando:
              1. mostrarDestaquesNacional é true (destaque nacional)
              2. usadoFallbackNacional é true (fallback para nacional)
              3. OU quando está exibindo destaque local (!mostrarDestaquesNacional && !filtersActive && tem estado/cidade)
          */}
          {/* Quando filtros estão ativos (resultado de busca com filtros), este card NÃO deve ser exibido */}
          {(mostrarDestaquesNacional || usadoFallbackNacional || (!filtersActive && !mostrarDestaquesNacional && (searchFormEstado || searchFormCidade))) && (
            <div className="text-center mb-12">
              <div className="inline-block">
                <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-400">
                  <div className="flex items-center gap-3">
                    {/* Botões Esquerda: Comprar e Alugar (FUNCIONAIS) */}
                    <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={async () => {
                          const estadoAtual = searchFormEstado || lastFilters?.estado || null
                          const cidadeAtual = searchFormCidade || lastFilters?.cidade || null
                          const estaEmModoDestaqueLocal = !!(estadoAtual || cidadeAtual)

                          console.log('🔍 [BOTÃO COMPRAR] Clicado', {
                            mostrarDestaquesNacional,
                            tipoDestaqueAtual: tipoDestaque,
                            novoTipoDestaque: 'DV',
                            estadoAtual,
                            cidadeAtual,
                            estaEmModoDestaqueLocal,
                            '⚠️ TÍTULO ATUAL': buildTitle
                          })

                          // IMPORTANTE: Se estamos em modo destaque local, garantir que está configurado corretamente
                          if (estaEmModoDestaqueLocal) {
                            console.log('✅ [BOTÃO COMPRAR] Modo destaque local detectado - garantindo configuração correta')
                            // Garantir que está em modo destaque local ANTES de mudar tipoDestaque
                            setMostrarDestaquesNacional(false)
                            setUsadoFallbackNacional(false)

                            // Aguardar um tick para garantir que o estado foi atualizado
                            await new Promise(resolve => setTimeout(resolve, 0))
                          }

                          // Armazenar tipo anterior antes de mudar
                          setTipoDestaqueAnterior(tipoDestaque)
                          // Alterar tipoDestaque para Comprar
                          setTipoDestaque('DV')
                          setCurrentPage(1) // Reset página ao trocar
                          setMensagemSemResultados(null) // Limpar mensagem anterior
                        }}
                        className="px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        <Home className="w-4 h-4 inline mr-2" />
                        Comprar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const estadoAtual = searchFormEstado || lastFilters?.estado || null
                          const cidadeAtual = searchFormCidade || lastFilters?.cidade || null
                          const estaEmModoDestaqueLocal = !!(estadoAtual || cidadeAtual)

                          console.log('🔍 [BOTÃO ALUGAR] Clicado', {
                            mostrarDestaquesNacional,
                            tipoDestaqueAtual: tipoDestaque,
                            novoTipoDestaque: 'DA',
                            estadoAtual,
                            cidadeAtual,
                            estaEmModoDestaqueLocal,
                            '⚠️ TÍTULO ATUAL': buildTitle
                          })

                          // IMPORTANTE: Se estamos em modo destaque local, garantir que está configurado corretamente
                          if (estaEmModoDestaqueLocal) {
                            console.log('✅ [BOTÃO ALUGAR] Modo destaque local detectado - garantindo configuração correta')
                            // Garantir que está em modo destaque local ANTES de mudar tipoDestaque
                            setMostrarDestaquesNacional(false)
                            setUsadoFallbackNacional(false)

                            // Aguardar um tick para garantir que o estado foi atualizado
                            await new Promise(resolve => setTimeout(resolve, 0))
                          }

                          // Armazenar tipo anterior antes de mudar
                          setTipoDestaqueAnterior(tipoDestaque)
                          // Alterar tipoDestaque para Alugar
                          setTipoDestaque('DA')
                          setCurrentPage(1) // Reset página ao trocar
                          setMensagemSemResultados(null) // Limpar mensagem anterior
                        }}
                        className="px-4 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <Building className="w-4 h-4 inline mr-2" />
                        Alugar
                      </button>
                    </div>

                    {/* Texto Central */}
                    <div className="text-center px-6 flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {buildTitle}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {buildSubtitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="relative min-h-[400px] bg-white overflow-x-visible -mx-4 sm:-mx-6">
            {filtersActive && (
              <div className="absolute inset-0 z-10">
                <div className="absolute -inset-1 bg-white rounded-3xl"></div>
                <div className="absolute inset-0 bg-white border border-blue-100 shadow-2xl rounded-3xl overflow-hidden">
                  <div className="relative h-full p-6 overflow-y-auto overflow-x-visible">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {(() => {
                            // Se foi usado fallback nacional, SEMPRE mostrar título de destaque nacional
                            if (usadoFallbackNacional) {
                              const operation = lastFilters?.operation || tipoDestaque
                              const operationLabel = operation === 'DA' ? 'Alugar' : 'Comprar'
                              console.log('🔍 [TÍTULO FILTRADO] Usando título de destaque nacional (fallback)', {
                                usadoFallbackNacional,
                                operation,
                                operationLabel
                              })
                              return `${TITULO_DESTAQUE} - Nacionais - ${operationLabel}`
                            }

                            // Caso contrário, mostrar título normal de resultados filtrados
                            const operation = lastFilters?.operation || tipoDestaque
                            const operationLabel = operation === 'DA'
                              ? 'Imóveis para Alugar'
                              : 'Imóveis para Comprar'
                            return `${operationLabel} - ${filteredPagination.total} imóveis encontrados${buildFilterConcatenation()}`
                          })()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                          {usadoFallbackNacional
                            ? 'Descubra as melhores oportunidades do mercado imobiliário em todo o Brasil'
                            : buildFilterSummary()
                          }
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => window.open(construirUrlMapa('filtros'), '_blank', 'noopener,noreferrer')}
                          className="px-5 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Visualizar no Mapa
                        </button>
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-5 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-gray-500 transition-colors"
                        >
                          Voltar para Destaques
                        </button>
                      </div>
                    </div>

                    {filtersLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="animate-pulse bg-gray-100 rounded-2xl h-64" />
                        ))}
                      </div>
                    ) : filtersError ? (
                      <div className="text-center py-12 text-red-600 font-semibold">{filtersError}</div>
                    ) : filteredResults.length === 0 ? (
                      <div className="text-center py-12 text-gray-600">
                        Nenhum imóvel encontrado com os filtros selecionados.
                      </div>
                    ) : (
                      <>
                        <div className="w-full">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
                            {filteredResults.map((property) => (
                              <LandingPropertyCard
                                key={property.id}
                                property={property}
                                onTenhoInteresseClick={handleTenhoInteresseClick}
                              />
                            ))}
                          </div>
                        </div>
                        {/* Paginação - Padrão igual ao grid de destaque */}
                        {filteredPagination.totalPages > 1 && (
                          <div className="bg-gray-50 px-6 py-5 border-t-2 border-gray-200 rounded-lg mt-8">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="order-2 sm:order-1">
                                <p className="text-sm font-medium text-gray-700">
                                  Mostrando <span className="font-bold text-blue-600">{filteredStartIndex + 1}</span> até <span className="font-bold text-blue-600">{filteredEndIndex}</span> de{' '}
                                  {(() => {
                                    const operation = lastFilters?.operation || tipoDestaque
                                    const operationLabel = operation === 'DA'
                                      ? 'Imóveis para Alugar'
                                      : 'Imóveis para Comprar'
                                    return (
                                      <>
                                        <span className="font-bold text-blue-600">{operationLabel} - {filteredPagination.total}</span> imóveis encontrados
                                      </>
                                    )
                                  })()}
                                </p>
                              </div>

                              <div className="order-1 sm:order-2">
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm">
                                  <button
                                    onClick={() => handleFilterPageChange(filteredPagination.page - 1)}
                                    disabled={filteredPagination.page === 1 || filtersLoading}
                                    className="relative inline-flex items-center px-4 py-2 rounded-l-md border-2 border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  >
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Anterior
                                  </button>

                                  <div className="flex -space-x-px">
                                    {Array.from({ length: filteredPagination.totalPages }, (_, i) => i + 1).map((page) => (
                                      <button
                                        key={page}
                                        onClick={() => handleFilterPageChange(page)}
                                        disabled={filtersLoading}
                                        className={`relative inline-flex items-center px-5 py-2 border-2 text-base font-bold transition-all ${page === filteredPagination.page
                                          ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                                          : 'border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:scale-105'
                                          } ${filtersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        {page}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    onClick={() => handleFilterPageChange(filteredPagination.page + 1)}
                                    disabled={
                                      filteredPagination.page === filteredPagination.totalPages || filtersLoading
                                    }
                                    className="relative inline-flex items-center px-4 py-2 rounded-r-md border-2 border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  >
                                    Próximo
                                    <svg className="h-5 w-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </nav>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loadingFeatured ? (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : featuredProperties.length > 0 ? (
              <>
                {/* Mensagem quando não há resultados para o tipo selecionado */}
                {mensagemSemResultados && (
                  <div className="px-6 pt-6 pb-4">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <p className="text-yellow-800 font-semibold">{mensagemSemResultados}</p>
                    </div>
                  </div>
                )}

                {/* Título do grid de destaque nacional */}
                {mostrarDestaquesNacional && buildTitle && (
                  <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {buildTitle}
                      </h3>
                      <p className="text-sm text-gray-600 italic mt-1">
                        Para consultar outras opções de imóveis preencha suas opções de escolha em &quot;Encontre o imóvel da sua preferência&quot;.
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(construirUrlMapa('nacional'), '_blank', 'noopener,noreferrer')}
                      className="px-5 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Visualizar no Mapa
                    </button>
                  </div>
                )}

                {/* Título do grid de destaque local */}
                {buildFeaturedLocalTitle && (
                  <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {buildFeaturedLocalTitle}
                      </h3>
                      <p className="text-sm text-gray-600 italic mt-1">
                        Para consultar outras opções de imóveis preencha suas opções de escolha em &quot;Encontre o imóvel da sua preferência&quot;.
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(construirUrlMapa('local'), '_blank', 'noopener,noreferrer')}
                      className="px-5 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Visualizar no Mapa
                    </button>
                  </div>
                )}
                <div className="p-6">
                  <div className="w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-start">
                      {currentProperties.map((property) => (
                        <LandingPropertyCard
                          key={property.id}
                          property={property}
                          onTenhoInteresseClick={handleTenhoInteresseClick}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Paginação */}
                <div className="bg-gray-50 px-6 py-5 border-t-2 border-gray-200 rounded-lg mt-8">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="order-2 sm:order-1">
                      <p className="text-sm font-medium text-gray-700">
                        Mostrando <span className="font-bold text-blue-600">{startIndex + 1}</span> até <span className="font-bold text-blue-600">{Math.min(endIndex, featuredProperties.length)}</span> de{' '}
                        <span className="font-bold text-blue-600">{featuredProperties.length}</span> imóveis em destaque
                      </p>
                    </div>

                    {totalPages > 1 && (
                      <div className="order-1 sm:order-2">
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 rounded-l-md border-2 border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Anterior
                          </button>

                          <div className="flex -space-x-px">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-5 py-2 border-2 text-base font-bold transition-all ${page === currentPage
                                  ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:scale-105'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-4 py-2 rounded-r-md border-2 border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Próximo
                            <svg className="h-5 w-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum imóvel em destaque no momento</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Seção de Feed de Conteúdo - Fique por Dentro do Mercado */}
      <FeedSectionClient />

      {/* Popup Vender */}
      <VenderPopup
        isOpen={venderPopupOpen}
        onClose={() => setVenderPopupOpen(false)}
        onCadastrarClick={handleCadastrarProprietario}
        onLoginClick={handleLoginProprietario}
      />

      {/* Popup Corretor (antes de navegar para cadastro/login) */}
      <CorretorPopup
        isOpen={corretorPopupOpen}
        onClose={() => {
          // Fechar modal do corretor não deve disparar/mostrar geolocalização.
          suppressGeolocationModalOnceRef.current = true
          try {
            sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
          } catch { }
          setCorretorPopupOpen(false)
        }}
        onCadastrarClick={() => {
          try {
            sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
          } catch { }
          setCorretorPopupOpen(false)
          router.push('/corretor/cadastro')
        }}
        onLoginClick={() => {
          try {
            sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
          } catch { }
          setCorretorPopupOpen(false)
          setCorretorLoginModalOpen(true)
        }}
      />

      {/* Modal de Cadastro de Proprietário */}
      {authModalOpen && (
        <AuthModal
          mode={authModalMode}
          onChangeMode={setAuthModalMode}
          onClose={() => {
            setAuthModalOpen(false)
            setAuthUserType(null)
          }}
          initialUserType={authUserType}
          redirectTo={authModalMode === 'login' && authUserType === 'proprietario' ? '/admin/imoveis/novo?noSidebar=true' : undefined}
          onCorretorLoginClick={() => setCorretorLoginModalOpen(true)}
        />
      )}

      <CorretorLoginModal
        isOpen={corretorLoginModalOpen}
        onClose={() => setCorretorLoginModalOpen(false)}
        redirectTo="/landpaging?corretor_home=true"
      />

      {corretorHomeSuccessOpen && corretorHomeUser && (
        <UserSuccessModal
          isOpen={true}
          onClose={() => {
            setCorretorHomeSuccessOpen(false)
            // Limpar o parâmetro corretor_home sem perder outros parâmetros do contexto original
            try {
              const url = new URL(window.location.href)
              url.searchParams.delete('corretor_home')
              router.replace(url.pathname + (url.search ? url.search : ''))
            } catch {
              router.replace('/landpaging')
            }
          }}
          userData={{
            ...corretorHomeUser,
            userType: 'corretor'
          }}
        />
      )}

      {/* Modal de Meu Perfil */}
      <MeuPerfilModal
        isOpen={meuPerfilModalOpen}
        onClose={() => setMeuPerfilModalOpen(false)}
      />

      {/* Modal Formulário Tenho Interesse */}
      {pendingImovelId && (
        <TenhoInteresseFormModal
          isOpen={tenhoInteresseFormModalOpen}
          onClose={() => {
            setTenhoInteresseFormModalOpen(false)
            setPendingImovelId(null)
            setPendingImovelTitulo(null)
          }}
          imovelId={pendingImovelId}
          imovelTitulo={pendingImovelTitulo || undefined}
          onSuccess={() => {
            console.log('✅ [LANDING PAGE] Interesse registrado com sucesso via formulário')
            setTenhoInteresseFormModalOpen(false)
            setPendingImovelId(null)
            setPendingImovelTitulo(null)
          }}
        />
      )}

      {/* Modal de Geolocalização */}
      <GeolocationModal
        isOpen={geolocationModalOpen}
        onClose={async () => {
          console.log('🔍 [LANDING PAGE] onClose chamado, locationConfirmedRef:', locationConfirmedRef.current)
          console.log('🔍 [LANDING PAGE] Valores atuais:', { searchFormEstado, searchFormCidade })

          // Se a localização foi confirmada, não limpar os valores
          if (locationConfirmedRef.current) {
            console.log('✅ [LANDING PAGE] Modal fechado após confirmação de localização, mantendo valores:', {
              estado: searchFormEstado,
              cidade: searchFormCidade
            })
            setGeolocationModalOpen(false)
            // Reset flag após um pequeno delay para garantir que os valores foram setados
            setTimeout(() => {
              locationConfirmedRef.current = false
            }, 100)
            return
          }

          console.log('🔍 [LANDING PAGE] Modal de geolocalização fechado sem escolha de localização')
          // REGRA 1: Se usuário não escolheu localização, exibir grid de destaque nacional
          setSearchFormEstado(undefined)
          setSearchFormCidade(undefined)
          setMostrarDestaquesNacional(true)
          setUsadoFallbackNacional(false)
          setGeolocationModalOpen(false)
        }}
        onCloseWithoutClearing={() => {
          console.log('✅ [LANDING PAGE] Fechando modal sem limpar valores (localização confirmada)')
          console.log('✅ [LANDING PAGE] Valores mantidos:', { searchFormEstado, searchFormCidade })
          setGeolocationModalOpen(false)
          // Reset flag após um pequeno delay
          setTimeout(() => {
            locationConfirmedRef.current = false
          }, 200)
        }}
        city={detectedCity || ''}
        region={detectedRegion || undefined}
        country={detectedCountry || undefined}
        loading={geolocationLoading}
        onConfirmLocation={async (estadoSiglaOrName, cidadeNome) => {
          console.log('✅ [LANDING PAGE] Confirmando localização detectada (raw):', estadoSiglaOrName, cidadeNome)

          // Normalizar estado para Sigla (ex: "Pernambuco" -> "PE")
          let estadoSigla = estadoSiglaOrName
          if (estados && estados.length > 0) {
            const estadoMatch = estados.find(e =>
              e.sigla.toUpperCase() === estadoSiglaOrName.toUpperCase() ||
              e.nome.toUpperCase() === estadoSiglaOrName.toUpperCase()
            )
            if (estadoMatch) {
              console.log('✅ [LANDING PAGE] Estado normalizado:', estadoSiglaOrName, '->', estadoMatch.sigla)
              estadoSigla = estadoMatch.sigla
            }
          }

          console.log('✅ [LANDING PAGE] Localização final para uso:', estadoSigla, cidadeNome)

          // Marcar que localização foi confirmada ANTES de setar valores (usando ref para evitar timing issues)
          locationConfirmedRef.current = true

          // IMPORTANTÍSSIMO: ao confirmar localização (principalmente no 1º carregamento),
          // não reutilizar cache de destaques (pode estar stale e “esconder” imóveis novos).
          // Isso explica o cenário onde só aparece após "Aplicar filtros".
          forceFeaturedFetchRef.current = true

          // REGRA 2: Verificar se existem imóveis com destaque local para essa localização
          // Verificar TANTO para Comprar (DV) quanto para Alugar (DA)
          try {
            setLoadingFeatured(true)

            // Verificar para Comprar (DV) primeiro (padrão)
            // Performance: verificação leve (1 item, sem imagens) — evita baixar base64 desnecessário
            const urlVender = `/api/public/imoveis/destaque?tipo_destaque=DV&estado=${estadoSigla}&cidade=${cidadeNome}&limit=1&include_images=false`
            console.log('🔍 [LANDING PAGE] Verificando destaque local para Comprar:', urlVender)

            // Verificar também para Alugar (DA)
            const urlAlugar = `/api/public/imoveis/destaque?tipo_destaque=DA&estado=${estadoSigla}&cidade=${cidadeNome}&limit=1&include_images=false`
            console.log('🔍 [LANDING PAGE] Verificando destaque local para Alugar:', urlAlugar)

            // Performance: buscar DV e DA em paralelo (reduz latência percebida)
            const [responseVender, responseAlugar] = await Promise.all([
              fetch(urlVender),
              fetch(urlAlugar)
            ])
            const [dataVender, dataAlugar] = await Promise.all([
              responseVender.json(),
              responseAlugar.json()
            ])

            const temDestaqueLocalVender = responseVender.ok && dataVender.success && dataVender.imoveis && dataVender.imoveis.length > 0 && !dataVender.usadoFallbackNacional
            const temDestaqueLocalAlugar = responseAlugar.ok && dataAlugar.success && dataAlugar.imoveis && dataAlugar.imoveis.length > 0 && !dataAlugar.usadoFallbackNacional

            console.log('🔍 [LANDING PAGE] Verificação de destaque local:', {
              temDestaqueLocalVender,
              temDestaqueLocalAlugar,
              quantidadeVender: dataVender.imoveis?.length || 0,
              quantidadeAlugar: dataAlugar.imoveis?.length || 0,
              usadoFallbackVender: dataVender.usadoFallbackNacional,
              usadoFallbackAlugar: dataAlugar.usadoFallbackNacional
            })

            if (temDestaqueLocalVender || temDestaqueLocalAlugar) {
              // Existem imóveis com destaque local (para Comprar OU Alugar) - exibir grid de destaque local
              console.log('✅ [LANDING PAGE] Existem imóveis com destaque local - exibindo grid de destaque local')
              setMostrarDestaquesNacional(false)
              setUsadoFallbackNacional(false)
              setSearchFormEstado(estadoSigla)
              setSearchFormCidade(cidadeNome)
              // Manter tipoDestaque como 'DV' (Comprar) por padrão
              setTipoDestaque('DV')
            } else {
              // NÃO existem imóveis com destaque local (nem para Comprar nem para Alugar) - exibir grid de destaque nacional
              console.log('⚠️ [LANDING PAGE] Nenhum imóvel com destaque local encontrado (nem Comprar nem Alugar), exibindo destaque nacional')
              // Manter a localidade escolhida (para contexto), mas exibir nacionais no grid
              setSearchFormEstado(estadoSigla)
              setSearchFormCidade(cidadeNome)
              setMostrarDestaquesNacional(true)
              setUsadoFallbackNacional(true)
              setMensagemSemResultados('Não existem destaques locais para essa cidade. Exibindo destaques nacionais.')
              setTimeout(() => setMensagemSemResultados(null), 3500)
              setTipoDestaque('DV') // Garantir tipo padrão
            }
          } catch (error) {
            console.error('❌ [LANDING PAGE] Erro ao verificar destaque local:', error)
            // Em caso de erro, exibir destaque nacional por padrão
            setMostrarDestaquesNacional(true)
            setUsadoFallbackNacional(false)
            setSearchFormEstado(undefined)
            setSearchFormCidade(undefined)
          } finally {
            setLoadingFeatured(false)
          }

          // Disparar evento para atualizar Header
          window.dispatchEvent(new CustomEvent('geolocation-confirmed', {
            detail: { cidade: cidadeNome, estado: estadoSigla }
          }))

          // Persistir para restaurar destaque local quando a página for remontada
          try {
            localStorage.setItem(LAST_GEOLOCATION_ESTADO_KEY, estadoSigla)
            localStorage.setItem(LAST_GEOLOCATION_CIDADE_KEY, cidadeNome)
          } catch { }

          console.log('✅ [LANDING PAGE] Valores setados, locationConfirmedRef:', locationConfirmedRef.current)
        }}
        onSelectOtherLocation={async (estadoSiglaOrName, cidadeNome) => {
          console.log('✅ [LANDING PAGE] Selecionando localização manual (raw):', estadoSiglaOrName, cidadeNome)

          // Normalizar estado para Sigla (ex: "Pernambuco" -> "PE")
          let estadoSigla = estadoSiglaOrName
          if (estados && estados.length > 0) {
            const estadoMatch = estados.find(e =>
              e.sigla.toUpperCase() === estadoSiglaOrName.toUpperCase() ||
              e.nome.toUpperCase() === estadoSiglaOrName.toUpperCase()
            )
            if (estadoMatch) {
              console.log('✅ [LANDING PAGE] Estado normalizado (manual):', estadoSiglaOrName, '->', estadoMatch.sigla)
              estadoSigla = estadoMatch.sigla
            }
          }

          console.log('✅ [LANDING PAGE] Localização manual final:', estadoSigla, cidadeNome)

          // Marcar que localização foi confirmada ANTES de setar valores (usando ref para evitar timing issues)
          locationConfirmedRef.current = true

          // Mesma regra: seleção manual deve ignorar cache 1x para refletir o estado atual do catálogo
          forceFeaturedFetchRef.current = true

          // REGRA 2: Verificar se existem imóveis com destaque local para essa localização
          // Verificar TANTO para Comprar (DV) quanto para Alugar (DA)
          try {
            setLoadingFeatured(true)

            // Verificar para Comprar (DV) primeiro (padrão)
            // Performance: verificação leve (1 item, sem imagens)
            const urlVender = `/api/public/imoveis/destaque?tipo_destaque=DV&estado=${estadoSigla}&cidade=${cidadeNome}&limit=1&include_images=false`
            console.log('🔍 [LANDING PAGE] Verificando destaque local para Comprar:', urlVender)

            // Verificar também para Alugar (DA)
            const urlAlugar = `/api/public/imoveis/destaque?tipo_destaque=DA&estado=${estadoSigla}&cidade=${cidadeNome}&limit=1&include_images=false`
            console.log('🔍 [LANDING PAGE] Verificando destaque local para Alugar:', urlAlugar)

            // Performance: buscar DV e DA em paralelo (reduz latência percebida)
            const [responseVender, responseAlugar] = await Promise.all([
              fetch(urlVender),
              fetch(urlAlugar)
            ])
            const [dataVender, dataAlugar] = await Promise.all([
              responseVender.json(),
              responseAlugar.json()
            ])

            const temDestaqueLocalVender = responseVender.ok && dataVender.success && dataVender.imoveis && dataVender.imoveis.length > 0 && !dataVender.usadoFallbackNacional
            const temDestaqueLocalAlugar = responseAlugar.ok && dataAlugar.success && dataAlugar.imoveis && dataAlugar.imoveis.length > 0 && !dataAlugar.usadoFallbackNacional

            console.log('🔍 [LANDING PAGE] Verificação de destaque local:', {
              temDestaqueLocalVender,
              temDestaqueLocalAlugar,
              quantidadeVender: dataVender.imoveis?.length || 0,
              quantidadeAlugar: dataAlugar.imoveis?.length || 0,
              usadoFallbackVender: dataVender.usadoFallbackNacional,
              usadoFallbackAlugar: dataAlugar.usadoFallbackNacional
            })

            if (temDestaqueLocalVender || temDestaqueLocalAlugar) {
              // Existem imóveis com destaque local (para Comprar OU Alugar) - exibir grid de destaque local
              console.log('✅ [LANDING PAGE] Existem imóveis com destaque local - exibindo grid de destaque local')
              setMostrarDestaquesNacional(false)
              setUsadoFallbackNacional(false)
              setSearchFormEstado(estadoSigla)
              setSearchFormCidade(cidadeNome)
              // Manter tipoDestaque como 'DV' (Comprar) por padrão
              setTipoDestaque('DV')
            } else {
              // NÃO existem imóveis com destaque local (nem para Comprar nem para Alugar) - exibir grid de destaque nacional
              console.log('⚠️ [LANDING PAGE] Nenhum imóvel com destaque local encontrado (nem Comprar nem Alugar), exibindo destaque nacional')
              // IMPORTANTE: Usar flushSync para garantir ordem correta de atualização
              // Ativar destaque nacional PRIMEIRO (isso tem prioridade absoluta na lógica do useEffect)
              flushSync(() => {
                setMostrarDestaquesNacional(true)
              })
              // Manter localidade selecionada e sinalizar fallback
              setSearchFormEstado(estadoSigla)
              setSearchFormCidade(cidadeNome)
              setUsadoFallbackNacional(true)
              setMensagemSemResultados('Não existem destaques locais para essa cidade. Exibindo destaques nacionais.')
              setTimeout(() => setMensagemSemResultados(null), 3500)
              setTipoDestaque('DV') // Garantir tipo padrão
            }
          } catch (error) {
            console.error('❌ [LANDING PAGE] Erro ao verificar destaque local:', error)
            // Em caso de erro, exibir destaque nacional por padrão
            flushSync(() => {
              setMostrarDestaquesNacional(true)
            })
            setUsadoFallbackNacional(false)
            setSearchFormEstado(undefined)
            setSearchFormCidade(undefined)
          } finally {
            setLoadingFeatured(false)
          }

          // Disparar evento para atualizar Header
          window.dispatchEvent(new CustomEvent('geolocation-confirmed', {
            detail: { cidade: cidadeNome, estado: estadoSigla }
          }))

          // Persistir para restaurar destaque local quando a página for remontada
          try {
            localStorage.setItem(LAST_GEOLOCATION_ESTADO_KEY, estadoSigla)
            localStorage.setItem(LAST_GEOLOCATION_CIDADE_KEY, cidadeNome)
          } catch { }

          console.log('✅ [LANDING PAGE] Valores setados após seleção manual')
        }}
      />

      {/* Modal de Nenhum Resultado Encontrado */}
      {noResultsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-orange-100 rounded-full p-4">
                <ExclamationCircleIcon className="w-12 h-12 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Nenhum imóvel encontrado
              </h3>
              <p className="text-gray-600 text-lg">
                Não existem imóveis para essas opções de escolha
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progressBarWidth}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Exibindo imóveis em destaque nacional...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
