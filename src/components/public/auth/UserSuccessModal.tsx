'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, X, User, Mail, Phone, MapPin, Building2, BadgeCheck, UserPlus, Users, List, Edit2, Save, XCircle, QrCode, Clock, CheckCircle2, RefreshCcw, Bell, Settings, ArrowUpRight, Bed, Bath, Car, Layers, DollarSign, CreditCard, ArrowLeftRight, Home } from 'lucide-react'
import { formatCPF, validateCPF } from '@/lib/utils/formatters'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface UserSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  userData: {
    id?: string
    uuid?: string
    nome: string
    email: string
    telefone?: string
    userType: 'cliente' | 'proprietario' | 'corretor'
    cpf?: string
    creci?: string
    isencao?: boolean
    tipo_corretor?: 'Interno' | 'Externo' | null
    fotoDataUrl?: string
    endereco?: string
    numero?: string
    bairro?: string
    cidade_fk?: string
    estado_fk?: string
    foto?: string // Base64 puro
    foto_tipo_mime?: string
    cep?: string
    complemento?: string
  }
  redirectTo?: string
}

export default function UserSuccessModal({
  isOpen,
  onClose,
  userData,
  redirectTo
}: UserSuccessModalProps) {
  const router = useRouter()
  const { get, post } = useAuthenticatedFetch()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  // Estados para o Modal de Negócio Fechado
  const [isNegocioFechadoOpen, setIsNegocioFechadoOpen] = useState(false)
  const [codigoBusca, setCodigoBusca] = useState('')
  const inputBuscaRef = useRef<HTMLInputElement>(null)
  const [imovelEncontrado, setImovelEncontrado] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [negocioFechadoChecked, setNegocioFechadoChecked] = useState(false)
  const [isConfirmingNegocio, setIsConfirmingNegocio] = useState(false)
  const [negocioError, setNegocioError] = useState<string | null>(null)
  const [showParabens, setShowParabens] = useState(false)
  const [initialStatus, setInitialStatus] = useState<number | null>(null)

  // Lógica robusta para foto: usa fotoDataUrl se existir, senão tenta montar com base64 bruto
  const initialFoto = useMemo(() => {
    if (userData.fotoDataUrl) return userData.fotoDataUrl
    if (userData.foto) {
      const mime = userData.foto_tipo_mime || 'image/jpeg'
      return `data:${mime};base64,${userData.foto}`
    }
    return null
  }, [userData.fotoDataUrl, userData.foto, userData.foto_tipo_mime])

  const [fotoPreview, setFotoPreview] = useState<string | null>(initialFoto)

  // Atualizar preview se a prop mudar (ex: reabertura do modal com dados diferentes)
  useEffect(() => {
    setFotoPreview(initialFoto)
  }, [initialFoto])
  const [editForm, setEditForm] = useState({
    nome: userData.nome,
    email: userData.email,
    telefone: userData.telefone || '',
    cpf: userData.cpf || '',
    creci: userData.creci || ''
  })

  // Tentar obter o ID do usuário de múltiplas fontes para evitar o erro de "ID não encontrado"
  const getUserId = () => {
    // 1. Tentar da prop userData (passada pelo modal de login)
    if (userData.id) return userData.id
    if (userData.uuid) return userData.uuid

    // 2. Tentar do localStorage (onde o login salva os dados)
    try {
      const stored = localStorage.getItem('user-data')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.id) return parsed.id
        if (parsed.uuid) return parsed.uuid
      }

      const publicStored = localStorage.getItem('public-user-data')
      if (publicStored) {
        const parsed = JSON.parse(publicStored)
        if (parsed.uuid) return parsed.uuid
        if (parsed.id) return parsed.id
      }
    } catch (e) {
      console.error('Erro ao ler ID do localStorage:', e)
    }

    return null
  }

  const userId = getUserId()

  const handleEditarCadastroCorretor = () => {
    // UX: manter consistente com o fluxo de retorno (não disparar geolocalização novamente na landing)
    try {
      sessionStorage.setItem('suppress-geolocation-modal-once', 'true')
    } catch { }
    onClose()
    // Abrir tela pública de cadastro em modo edição
    router.push('/corretor/cadastro?edit=true')
  }

  // ===========================
  // Leads do corretor (aceite)
  // ===========================
  type LeadRow = {
    prospect_id: number
    status: string
    atribuido_em: string
    expira_em: string | null
    aceito_em: string | null
    motivo_type?: string | null
    requires_aceite?: boolean | null
    imovel_id: number
    codigo: string | null
    titulo: string | null
    preco: number | null
    cidade_fk: string | null
    estado_fk: string | null
    cliente_nome: string | null
    cliente_email: string | null
    cliente_telefone: string | null
    preferencia_contato: string | null
    mensagem: string | null
    imovel_status_fk: number | null
  }

  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [acceptingProspectId, setAcceptingProspectId] = useState<number | null>(null)
  const [slaMinutos, setSlaMinutos] = useState<number | null>(null)
  const [slaMinutosInterno, setSlaMinutosInterno] = useState<number | null>(null)
  const [leadStats, setLeadStats] = useState<{
    recebidos: number
    perdidosSla: number
    aceiteNoSlaPercent: number | null
    aceiteNoSlaAceitos: number
    aceiteNoSlaAvaliados: number
  } | null>(null)

  const formatMoney = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  }

  const loadLeads = useCallback(async () => {
    try {
      setLeadsLoading(true)
      setLeadsError(null)
      // Precisamos de todos os status para conseguir categorizar (Pendentes/Atribuídos/Aceitos/Perdidos).
      const resp = await get('/api/corretor/prospects?status=all')
      const data = await resp.json()
      if (!resp.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar leads')
      setLeads(data.leads || [])
    } catch (e: any) {
      setLeadsError(e?.message || 'Erro ao carregar leads')
    } finally {
      setLeadsLoading(false)
    }
  }, [get])

  useEffect(() => {
    if (userData.userType !== 'corretor') return
    // Pré-carregar categorias e KPIs assim que o modal abrir.
    loadLeads()

      ; (async () => {
        try {
          const resp = await get('/api/corretor/lead-config')
          const data = await resp.json()
          if (resp.ok && data?.success) {
            const n = Number(data?.data?.sla_minutos_aceite_lead)
            if (Number.isFinite(n) && n > 0) setSlaMinutos(n)
            const ni = Number(data?.data?.sla_minutos_aceite_lead_interno)
            if (Number.isFinite(ni) && ni > 0) setSlaMinutosInterno(ni)
          }
        } catch { }
      })()

      ; (async () => {
        try {
          const resp = await get('/api/corretor/lead-stats')
          const data = await resp.json()
          if (resp.ok && data?.success) {
            setLeadStats({
              recebidos: Number(data?.data?.leads_recebidos_total) || 0,
              perdidosSla: Number(data?.data?.leads_perdidos_sla_total) || 0,
              // Nunca aceitar NaN/undefined no KPI: se vier inválido, vira 0.00
              aceiteNoSlaPercent: (() => {
                const n = Number(data?.data?.aceite_no_sla_percent)
                return Number.isFinite(n) ? n : 0
              })(),
              aceiteNoSlaAceitos: Number(data?.data?.aceite_no_sla_aceitos) || 0,
              aceiteNoSlaAvaliados: Number(data?.data?.aceite_no_sla_avaliados) || 0
            })
          }
        } catch { }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.userType])

  const acceptLead = useCallback(
    async (prospectId: number) => {
      try {
        setAcceptingProspectId(prospectId)
        setLeadsError(null)
        const resp = await post(`/api/corretor/prospects/${prospectId}/accept`, {})
        const data = await resp.json()
        if (!resp.ok || !data?.success) throw new Error(data?.error || 'Não foi possível aceitar o lead')
        await loadLeads()
      } catch (e: any) {
        setLeadsError(e?.message || 'Erro ao aceitar lead')
      } finally {
        setAcceptingProspectId(null)
      }
    },
    [post, loadLeads]
  )

  const leadsResumo = useMemo(() => {
    const isReq = (l: any) => (l?.requires_aceite ?? (l?.expira_em ? true : false)) === true
    const pendentes = leads.filter((l: any) => l.status === 'atribuido' && isReq(l) && l.imovel_status_fk !== 100).length
    const atribuidos = leads.filter((l: any) => (l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l))) && l.imovel_status_fk !== 100).length
    const aceitos = leads.filter((l: any) => l.status === 'aceito' && l.imovel_status_fk !== 100).length
    const perdidos = leads.filter((l: any) => l.status === 'expirado').length
    const fechados = leads.filter((l: any) => l.imovel_status_fk === 100).length
    const todos = leads.length
    return { pendentes, atribuidos, aceitos, perdidos, fechados, todos }
  }, [leads])

  const leadTabs = useMemo(
    () =>
      [
        { id: 'pendentes', label: 'Pendentes (SLA)', count: leadsResumo.pendentes, tone: 'danger' as const },
        { id: 'atribuido', label: 'Atribuídos', count: leadsResumo.atribuidos, tone: 'primary' as const },
        { id: 'aceito', label: 'Aceitos', count: leadsResumo.aceitos, tone: 'success' as const },
        { id: 'fechado', label: 'Fechados', count: leadsResumo.fechados, tone: 'muted' as const },
        { id: 'expirado', label: 'Perdidos (SLA)', count: leadsResumo.perdidos, tone: 'muted' as const },
        { id: 'todos', label: 'Todos', count: leadsResumo.todos, tone: 'muted' as const }
      ] as const,
    [leadsResumo]
  )

  type LeadTabId = (typeof leadTabs)[number]['id']
  const [activeLeadTab, setActiveLeadTab] = useState<LeadTabId>('atribuido')
  const defaultTabSetRef = useRef(false)
  useEffect(() => {
    if (defaultTabSetRef.current) return
    // Opção (A): se houver pendentes, abrir em Pendentes, senão em Atribuídos.
    if (leadsResumo.pendentes > 0) setActiveLeadTab('pendentes')
    else setActiveLeadTab('atribuido')
    defaultTabSetRef.current = true
  }, [leadsResumo.pendentes])

  const getTabLeads = useCallback(
    (tab: LeadTabId): LeadRow[] => {
      const isReq = (l: any) => (l?.requires_aceite ?? (l?.expira_em ? true : false)) === true
      if (tab === 'pendentes') return leads.filter((l: any) => l.status === 'atribuido' && isReq(l) && l.imovel_status_fk !== 100)
      if (tab === 'atribuido') return leads.filter((l: any) => (l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l))) && l.imovel_status_fk !== 100)
      if (tab === 'aceito') return leads.filter((l: any) => l.status === 'aceito' && l.imovel_status_fk !== 100)
      if (tab === 'expirado') return leads.filter((l: any) => l.status === 'expirado')
      if (tab === 'fechado') return leads.filter((l: any) => l.imovel_status_fk === 100)
      return leads
    },
    [leads]
  )

  const formatDateTime = (value: any): string => {
    if (!value) return '-'
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '-'
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
    } catch {
      return '-'
    }
  }

  const openLeadsPanel = useCallback(
    (tab: LeadTabId, prospectId?: number) => {
      // UX: navegar na mesma aba para manter a sessão
      try {
        const currentPath = window.location.pathname
        // Só salvar a origem se não estivermos já na área de leads (para não sobrescrever a verdadeira origem)
        if (!currentPath.includes('/corretor/leads')) {
          sessionStorage.setItem('corretor_return_url', currentPath + window.location.search)
        }
      } catch { }

      const params = new URLSearchParams()
      params.set('status', 'all')
      params.set('view', tab)
      if (prospectId) params.set('prospectId', String(prospectId))
      window.location.href = `/corretor/leads?${params.toString()}`
    },
    []
  )

  const openLeadDetailsPage = useCallback((prospectId: number) => {
    if (!prospectId) return
    // UX: navegar na mesma aba para manter a sessão
    try {
      const currentPath = window.location.pathname
      // Só salvar a origem se não estivermos já na área de leads (para não sobrescrever a verdadeira origem)
      if (!currentPath.includes('/corretor/leads')) {
        sessionStorage.setItem('corretor_return_url', currentPath + window.location.search)
      }
    } catch { }
    window.location.href = `/corretor/leads/${prospectId}`
  }, [])

  const openImovelPublic = (imovelId: number) => {
    if (!imovelId) return
    window.open(`/imoveis/${imovelId}`, '_blank', 'noopener,noreferrer')
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar: resetar form
      setEditForm({
        nome: userData.nome,
        email: userData.email,
        telefone: userData.telefone || '',
        cpf: userData.cpf || '',
        creci: userData.creci || ''
      })
      setFotoFile(null)
      setFotoPreview(userData.fotoDataUrl || null)
      setError(null)
    }
    setIsEditing(!isEditing)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    if (name === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (name === 'telefone') {
      // Formatação simples de telefone
      const digits = value.replace(/\D/g, '').slice(0, 11)
      if (digits.length <= 2) formattedValue = digits
      else if (digits.length <= 6) formattedValue = `(${digits.slice(0, 2)}) ${digits.slice(2)}`
      else if (digits.length <= 10) formattedValue = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
      else formattedValue = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }

    setEditForm(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('A foto deve ter no máximo 2MB.')
        return
      }
      setFotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!userId) {
      setError('Erro: ID do usuário não encontrado.')
      return
    }

    // Validações básicas
    if (!editForm.nome.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      setError('Email inválido.')
      return
    }
    if (editForm.cpf && !validateCPF(editForm.cpf)) {
      setError('CPF inválido.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('nome', editForm.nome)
      formData.append('email', editForm.email)
      formData.append('telefone', editForm.telefone)
      formData.append('cpf', editForm.cpf.replace(/\D/g, ''))
      formData.append('creci', editForm.creci)
      if (fotoFile) {
        formData.append('foto', fotoFile)
      }

      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Obter nova foto em base64 do retorno da API se houver
        const newFotoBase64 = data.user?.foto
        const newFotoMime = data.user?.foto_tipo_mime || 'image/jpeg'
        const newFotoDataUrl = newFotoBase64 ? `data:${newFotoMime};base64,${newFotoBase64}` : userData.fotoDataUrl

        // Atualizar localStorage para refletir as mudanças no header/app
        const storedUserData = localStorage.getItem('user-data')
        if (storedUserData) {
          const user = JSON.parse(storedUserData)
          const updatedUser = {
            ...user,
            nome: editForm.nome,
            email: editForm.email,
            telefone: editForm.telefone,
            cpf: editForm.cpf,
            creci: editForm.creci,
            isencao: data.user?.isencao,
            foto: newFotoBase64,
            foto_tipo_mime: newFotoMime
          }
          localStorage.setItem('user-data', JSON.stringify(updatedUser))
        }

        // Também atualizar public-user-data se existir
        const storedPublicUser = localStorage.getItem('public-user-data')
        if (storedPublicUser) {
          const user = JSON.parse(storedPublicUser)
          const updatedUser = {
            ...user,
            nome: editForm.nome,
            email: editForm.email,
            telefone: editForm.telefone,
            cpf: editForm.cpf,
            isencao: data.user?.isencao,
            foto: newFotoBase64,
            foto_tipo_mime: newFotoMime
          }
          localStorage.setItem('public-user-data', JSON.stringify(updatedUser))
        }

        // ATUALIZAR sessionStorage (para persistência entre navegações no landpaging)
        if (userData.userType === 'corretor') {
          try {
            const raw = sessionStorage.getItem('corretor_success_user')
            if (raw) {
              const current = JSON.parse(raw)
              const updated = {
                ...current,
                nome: editForm.nome,
                email: editForm.email,
                telefone: editForm.telefone,
                cpf: editForm.cpf,
                creci: editForm.creci,
                isencao: data.user?.isencao,
                fotoDataUrl: newFotoDataUrl
              }
              sessionStorage.setItem('corretor_success_user', JSON.stringify(updated))
            }
          } catch { }
        }

        setIsEditing(false)

        // Pequena gambiarra para atualizar a UI sem recarregar (opcional)
        userData.nome = editForm.nome
        userData.email = editForm.email
        userData.telefone = editForm.telefone
        userData.cpf = editForm.cpf
        userData.creci = editForm.creci
        userData.isencao = data.user?.isencao
        userData.fotoDataUrl = newFotoDataUrl

        window.dispatchEvent(new Event('user-data-updated'))
      } else {
        setError(data.error || 'Erro ao salvar alterações.')
      }
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setError('Erro de conexão ao salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCadastrarProprietario = () => {
    onClose()
    setTimeout(() => {
      // Fluxo do corretor: ao concluir, a tela de "Novo Proprietário" deve voltar para o modal do corretor
      try {
        // Salvar de onde o corretor veio (para voltar ao mesmo modal/contexto após cadastrar proprietário)
        sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
      } catch { }
      window.location.href = '/admin/proprietarios/novo?from_corretor=true'
    }, 100)
  }

  const handleVisualizarProprietarios = () => {
    onClose()
    setTimeout(() => {
      // Filtra para mostrar apenas os proprietários associados ao corretor logado
      try {
        // Salvar de onde o corretor veio (para voltar ao mesmo modal/contexto após visualizar/fechar)
        sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
      } catch { }
      window.location.href = '/admin/proprietarios?mine_corretor=true'
    }, 100)
  }

  const handleCadastrarImovelComoCorretor = () => {
    // Regra: não permitir cadastrar imóvel se o corretor ainda não tem nenhum proprietário associado.
    ; (async () => {
      try {
        const resp = await get('/api/admin/proprietarios/mine?limit=1&page=1')
        const data = await resp.json().catch(() => null)
        const total =
          Number(data?.total) ||
          Number(data?.pagination?.total) ||
          (Array.isArray(data?.proprietarios) ? data.proprietarios.length : 0) ||
          (Array.isArray(data?.data) ? data.data.length : 0) ||
          0

        if (!resp.ok || !data?.success) {
          throw new Error(data?.error || 'Não foi possível verificar seus proprietários no momento.')
        }

        if (total <= 0) {
          // Alerta UX (central) e não navega
          try {
            window.dispatchEvent(
              new CustomEvent('ui-toast', {
                detail: {
                  type: 'warning',
                  position: 'center',
                  durationMs: 0,
                  message:
                    'Antes de cadastrar um imóvel, você precisa cadastrar pelo menos 1 proprietário associado ao seu perfil de corretor. No seu painel, clique em “Novo Proprietário” e depois volte para cadastrar o imóvel.'
                }
              })
            )
          } catch { }
          return
        }

        onClose()
        setTimeout(() => {
          // Opcional: reaproveitar a finalidade escolhida, se houver
          try {
            // Salvar de onde o corretor veio (para voltar ao mesmo modal/contexto após cadastrar imóvel)
            sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
          } catch { }
          const finalidadeEscolhida =
            typeof window !== 'undefined' ? sessionStorage.getItem('finalidadeEscolhida') : null
          const url = finalidadeEscolhida
            ? `/admin/imoveis/novo?from_corretor=true&finalidade=${finalidadeEscolhida}`
            : '/admin/imoveis/novo?from_corretor=true'
          window.location.href = url
        }, 100)
      } catch (e: any) {
        // Falha na checagem: avisar e não navegar
        const msg = e?.message || 'Não foi possível verificar seus proprietários. Tente novamente.'
        try {
          window.dispatchEvent(
            new CustomEvent('ui-toast', {
              detail: { type: 'error', position: 'center', durationMs: 0, message: msg }
            })
          )
        } catch { }
      }
    })()
  }

  const handleVisualizarImoveis = () => {
    onClose()
    setTimeout(() => {
      try {
        // Salvar de onde o corretor veio (para voltar ao mesmo modal/contexto após fechar a listagem)
        sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
      } catch { }
      window.location.href = '/corretor/imoveis'
    }, 100)
  }

  // Efeito para focar o input ao abrir o modal de Negócio Fechado
  useEffect(() => {
    if (isNegocioFechadoOpen) {
      setTimeout(() => {
        inputBuscaRef.current?.focus()
      }, 300)
    }
  }, [isNegocioFechadoOpen])

  const handleAreasAtuacao = () => {
    // UX: navegar na mesma aba para manter sessão e permitir "Voltar" consistente
    try {
      sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
    } catch { }
    window.location.href = '/corretor/areas-atuacao'
  }

  const handleNegocioFechado = (codigo?: string) => {
    setNegocioError(null)
    setImovelEncontrado(null)
    if (codigo) {
      setCodigoBusca(codigo)
      setIsNegocioFechadoOpen(true)
      // Chamar a busca automaticamente após um pequeno delay para garantir que o estado abriu
      setTimeout(() => {
        handleBuscarImovelStatus(codigo)
      }, 100)
    } else {
      setCodigoBusca('')
      setIsNegocioFechadoOpen(true)
    }
  }

  const handleBuscarImovelStatus = async (overrideCodigo?: string) => {
    const codigoEfetivo = overrideCodigo || codigoBusca
    if (!codigoEfetivo.trim()) return
    setIsSearching(true)
    setNegocioError(null)
    setImovelEncontrado(null)
    setInitialStatus(null)
    try {
      const resp = await fetch(`/api/admin/imoveis/by-codigo/${codigoEfetivo}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token') || localStorage.getItem('auth-token')}`
        }
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        const imovel = data.imovel

        // Validação: conferir se o imóvel pertence ao corretor logado
        const currentBrokerId = String(userData?.id || '').toLowerCase().trim()
        const imovelBrokerId = String(imovel?.corretor_fk || '').toLowerCase().trim()

        if (imovelBrokerId !== currentBrokerId) {
          setNegocioError('Este código de imóvel não está associado a você')
          return
        }

        setImovelEncontrado(imovel)
        setNegocioFechadoChecked(imovel.status_fk === 100)
        setInitialStatus(imovel.status_fk)
      } else {
        setNegocioError('Este código de imóvel não está associado a você')
      }
    } catch (err) {
      setNegocioError('Erro ao buscar imóvel.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirmarNegocioFechado = async () => {
    if (!imovelEncontrado) return
    setIsConfirmingNegocio(true)
    setNegocioError(null)
    try {
      const novoStatus = negocioFechadoChecked ? 100 : 1
      const resp = await fetch(`/api/admin/imoveis/${imovelEncontrado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token') || localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ status_fk: novoStatus })
      })
      const data = await resp.json()
      if (resp.ok && data.success) {
        if (novoStatus === 100) {
          setShowParabens(true)
          setTimeout(() => {
            setIsNegocioFechadoOpen(false)
            setShowParabens(false)
            setImovelEncontrado(null)
            setCodigoBusca('')

            // Limpar cache de destaques da landpaging para garantir sincronia após reload
            try {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('featured-destaque-cache:')) {
                  sessionStorage.removeItem(key)
                }
              })
            } catch { }

            const statusAlterado = novoStatus !== initialStatus

            // Se o status foi alterado, o usuário quer retornar para a landpaging (limpa) para ver o resultado no grid.
            // Se NÃO foi alterado, podemos manter o comportamento de reabrir o painel.
            if (statusAlterado) {
              const url = new URL(window.location.origin + '/landpaging')
              // Preservar filtros caso já esteja na landpaging
              if (window.location.pathname.includes('/landpaging')) {
                const currentUrl = new URL(window.location.href)
                currentUrl.searchParams.forEach((value, key) => {
                  if (key !== 'corretor_home' && key !== 'corretor_popup') {
                    url.searchParams.set(key, value)
                  }
                })
              }
              window.location.href = url.toString()
            } else {
              // Comportamento original: reabrir painel
              if (window.location.pathname.includes('/landpaging')) {
                const url = new URL(window.location.href)
                url.searchParams.set('corretor_home', 'true')
                window.location.href = url.toString()
              } else {
                window.location.reload()
              }
            }
          }, 3000)
        } else {
          setIsNegocioFechadoOpen(false)
          setImovelEncontrado(null)
          setCodigoBusca('')

          const statusAlterado = novoStatus !== initialStatus

          if (statusAlterado) {
            // Limpar cache de destaques da landpaging para garantir sincronia após reload
            try {
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('featured-destaque-cache:')) {
                  sessionStorage.removeItem(key)
                }
              })
            } catch { }

            const url = new URL(window.location.origin + '/landpaging')
            // Preservar filtros caso já esteja na landpaging
            if (window.location.pathname.includes('/landpaging')) {
              const currentUrl = new URL(window.location.href)
              currentUrl.searchParams.forEach((value, key) => {
                if (key !== 'corretor_home' && key !== 'corretor_popup') {
                  url.searchParams.set(key, value)
                }
              })
            }
            window.location.href = url.toString()
          } else {
            // Comportamento original: reabrir painel
            if (window.location.pathname.includes('/landpaging')) {
              const url = new URL(window.location.href)
              url.searchParams.set('corretor_home', 'true')
              window.location.href = url.toString()
            } else {
              window.location.reload()
            }
          }
        }

        try {
          window.dispatchEvent(new CustomEvent('ui-toast', {
            detail: { type: 'success', message: 'Status do imóvel atualizado com sucesso!' }
          }))
        } catch { }
      } else {
        setNegocioError(data.error || 'Erro ao atualizar status.')
      }
    } catch (err) {
      setNegocioError('Erro ao atualizar status.')
    } finally {
      setIsConfirmingNegocio(false)
    }
  }

  const handleGerarQRCode = () => {
    // UX: navegar na mesma aba
    try {
      sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
    } catch { }
    window.location.href = '/corretor/pagamentos/qrcode'
  }

  const handleCadastrarImovel = () => {
    onClose()
    setTimeout(() => {
      // Ler finalidade escolhida do sessionStorage
      const finalidadeEscolhida = typeof window !== 'undefined' ? sessionStorage.getItem('finalidadeEscolhida') : null
      const url = finalidadeEscolhida
        ? `/admin/imoveis/novo?noSidebar=true&finalidade=${finalidadeEscolhida}`
        : '/admin/imoveis/novo?noSidebar=true'
      window.location.href = url
    }, 100)
  }

  const handleFechar = () => {
    onClose()
    // Disparar evento para atualizar AuthButtons após fechar modal
    if (typeof window !== 'undefined') {
      // Sempre notificar mudança de auth admin (corretor) e público para garantir que o header atualize
      window.dispatchEvent(new Event('admin-auth-changed'))

      // Apenas o login público (cliente/proprietário) precisa atualizar o header público especificamente
      if (userData.userType === 'cliente' || userData.userType === 'proprietario') {
        window.dispatchEvent(new Event('public-auth-changed'))
      }
    }

    // Redirecionar após fechar modal
    setTimeout(() => {
      // Se houver redirectTo específico (ex: para proprietários), usar ele
      if (redirectTo) {
        window.location.href = redirectTo
      }
      // Se for cliente ou proprietário, abrir modal de perfil ao invés de redirecionar
      else if (userData.userType === 'cliente' || userData.userType === 'proprietario') {
        // Disparar evento para abrir modal de perfil
        window.dispatchEvent(new Event('open-meu-perfil-modal'))
      }
    }, 100)
  }

  const handleMeusImoveis = () => {
    onClose()
    setTimeout(() => {
      // Redirecionar para a página CRUD de imóveis com filtro de proprietário
      const proprietarioUuid = userData.uuid || userData.id
      window.location.href = `/admin/imoveis?fromProprietario=true&proprietario_uuid=${proprietarioUuid}`
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div
        className={`relative w-full ${userData.userType === 'corretor' || userData.userType === 'proprietario' ? 'max-w-[90%] md:max-w-5xl' : 'max-w-lg'
          } bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 my-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-100 rounded-full">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 truncate">
                Seu Portal de Negócios de Imóveis
              </h2>
              <p className="text-sm text-gray-600">Bem-vindo(a) de volta ao seu painel.</p>
            </div>
          </div>
          <button
            onClick={handleFechar}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            Fechar
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5">
          {userData.userType === 'corretor' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* 1) Informações do corretor + KPIs */}
              <div className="md:col-span-3 space-y-5">
                {/* Foto e Nome */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    <img
                      src={fotoPreview || '/default-avatar.png'}
                      alt={userData.nome}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl transition-all group-hover:brightness-90"
                    />
                    {isEditing && (
                      <label
                        htmlFor="foto-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-6 h-6 text-white" />
                        <input
                          id="foto-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{userData.nome}</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full mt-2 uppercase tracking-wider">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Corretor Parceiro
                    </div>
                  </div>
                </div>

                {/* Lista de Dados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Informações Pessoais</span>
                    {!isSaving && (
                      userData.userType === 'corretor' ? (
                        <button
                          type="button"
                          onClick={handleEditarCadastroCorretor}
                          className="text-[10px] font-bold uppercase transition-all text-blue-600 hover:text-blue-700"
                        >
                          Editar cadastro
                        </button>
                      ) : (
                        <button
                          onClick={handleEditToggle}
                          className={`text-[10px] font-bold uppercase transition-all ${isEditing ? 'text-red-500 hover:text-red-600' : 'text-blue-500 hover:text-blue-600'
                            }`}
                        >
                          {isEditing ? 'Cancelar' : 'Editar'}
                        </button>
                      )
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Campos de Dados (Email, Tel, CPF, CRECI) */}
                    {[
                      { icon: Mail, label: 'Email', name: 'email', value: userData.email, editValue: editForm.email },
                      { icon: Phone, label: 'Telefone', name: 'telefone', value: userData.telefone, editValue: editForm.telefone },
                      { icon: User, label: 'CPF', name: 'cpf', value: userData.cpf, editValue: editForm.cpf },
                      { icon: BadgeCheck, label: 'CRECI', name: 'creci', value: userData.creci, editValue: editForm.creci }
                    ].map((field) => (
                      <div key={field.name} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <field.icon className="w-4 h-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-gray-400 uppercase font-bold leading-none mb-1">{field.label}</p>
                          {isEditing ? (
                            <input
                              name={field.name}
                              value={field.editValue}
                              onChange={handleInputChange}
                              className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          ) : (
                            <p className="text-xs font-semibold text-gray-700 truncate">{field.value || 'Não informado'}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isEditing && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full mt-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? 'Salvando...' : <><Save className="w-3.5 h-3.5" /> Salvar Alterações</>}
                    </button>
                  )}

                </div>

                {/* KPIs */}
                {leadStats && (
                  <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-lg shadow-slate-100/50 relative overflow-hidden group hover:border-blue-200 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                      Seu Dashboard - Leads
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 1. Leads Atribuídos */}
                      <div className="rounded-xl bg-white border border-blue-200 p-3">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Leads Atribuídos</div>
                        <div className="mt-1 text-xl font-black text-blue-700">{leadStats.recebidos}</div>
                      </div>

                      {/* 2. Leads aceitos */}
                      <div className="rounded-xl bg-white border border-emerald-200 p-3">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Leads aceitos</div>
                        <div className="mt-1 text-xl font-black text-emerald-700">{leadsResumo.aceitos}</div>
                      </div>

                      {/* 3. Leads Perdidos */}
                      <div className="rounded-xl bg-white border border-rose-200 p-3">
                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Leads Perdidos</div>
                        <div className="mt-1 text-xl font-black text-rose-700">{leadsResumo.perdidos}</div>
                      </div>

                      {/* 4. Negócios Fechados */}
                      <div className="rounded-xl bg-white border border-purple-200 p-3">
                        <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Negócios Fechados</div>
                        <div className="mt-1 text-xl font-black text-purple-700">{leadsResumo.fechados}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2) Leads (mais “deitados” / horizontais) */}
              <div className="md:col-span-6 space-y-5">
                {/* HUB premium de Leads */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden pt-4 px-0 pb-0">
                  <div className="flex flex-col gap-4 px-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-5 h-5 text-amber-600" />
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Leads</h4>
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {leadsResumo.pendentes > 0 ? (
                            <>
                              Você tem <strong className="text-rose-700">{leadsResumo.pendentes} pendente(s)</strong> para aceite.
                            </>
                          ) : (
                            <>
                              Sem pendências de aceite agora. Confira seus leads atribuídos e aceitos.
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadLeads()}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-white text-xs font-black hover:bg-blue-700"
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Atualizar
                        </button>
                        {leadsResumo.pendentes > 0 && (
                          <button
                            type="button"
                            onClick={() => openLeadsPanel('pendentes')}
                            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-sm hover:shadow-md transition-all bg-rose-600 text-white hover:bg-rose-700"
                          >
                            <Clock className="w-4 h-4" />
                            Ver pendentes ({leadsResumo.pendentes})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-400 bg-slate-50/50 p-2 shadow-sm">
                      {leadTabs.map((t) => {
                        const isActive = activeLeadTab === t.id
                        const disabled = (t as any).disabled === true
                        const base =
                          'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-black transition-all'
                        const active =
                          'bg-blue-600 text-white shadow-md'
                        const inactive =
                          'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        const dis =
                          'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                        const badgeTone =
                          t.tone === 'danger'
                            ? 'bg-rose-600 text-white'
                            : t.tone === 'success'
                              ? 'bg-emerald-600 text-white'
                              : t.tone === 'primary'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-700'

                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && setActiveLeadTab(t.id)}
                            className={`${base} ${disabled ? dis : isActive ? active : inactive}`}
                            title={disabled ? 'Em breve' : undefined}
                          >
                            <span>{t.label}</span>
                            <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-2 rounded-full text-[10px] ${badgeTone}`}>
                              {t.count}
                            </span>
                            {disabled && <span className="text-[10px] font-black">(em breve)</span>}
                          </button>
                        )
                      })}
                    </div>

                    {leadsError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 text-sm font-semibold">
                        {leadsError}
                      </div>
                    )}
                  </div>

                  {/* Preview (Full Width) */}
                  <div className="border-t border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Resumo</div>
                      <button
                        type="button"
                        onClick={() => openLeadsPanel(activeLeadTab)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-white text-[11px] font-black hover:bg-blue-700"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        Ver todos
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                      {leadsLoading ? (
                        <div className="p-6 text-slate-600 text-sm">Carregando leads...</div>
                      ) : getTabLeads(activeLeadTab).length === 0 ? (
                        <div className="p-8 text-center bg-slate-50/50">
                          <div className="text-slate-900 font-black">
                            {activeLeadTab === 'fechado'
                              ? 'Em breve: leads fechados.'
                              : 'Nenhum lead nesta categoria.'}
                          </div>
                          <div className="text-slate-600 text-sm mt-1">
                            {activeLeadTab === 'pendentes'
                              ? 'Quando houver lead com SLA para aceite, ele aparecerá aqui.'
                              : 'Assim que houver novos leads, eles serão listados automaticamente.'}
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {getTabLeads(activeLeadTab)
                            .slice(0, 3)
                            .map((l: any) => (
                              <div
                                key={l.prospect_id}
                                className="p-4 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="mt-0.5 text-[11px] text-slate-600 font-bold">
                                      <span className="text-slate-500 font-black">Data:</span>{' '}
                                      {formatDateTime(l.data_interesse || l.atribuido_em)}
                                    </div>
                                    <div className="mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest space-y-0.5">
                                      <div>Negócio: <span className="text-slate-700">{l.codigo || '-'}</span></div>
                                      <div>Código do Imóvel: <span className="text-slate-700">{l.imovel_id || '-'}</span></div>
                                    </div>
                                    <div className="mt-1.5 text-sm font-black text-slate-900">{formatMoney(l.preco)}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {activeLeadTab === 'pendentes' && (
                                      <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-900 text-[11px] font-black">
                                        <Clock className="w-4 h-4" />
                                        SLA{slaMinutos ? `: ${slaMinutos} min` : ''}
                                      </span>
                                    )}
                                    <div className="flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openLeadDetailsPage(l.prospect_id)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-slate-900 text-[11px] font-black hover:bg-slate-50 shadow-sm"
                                      >
                                        <ArrowUpRight className="w-4 h-4 text-blue-600" />
                                        Ver detalhes
                                      </button>
                                      {l.codigo && (
                                        <button
                                          type="button"
                                          onClick={() => handleNegocioFechado(l.codigo)}
                                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 text-indigo-700 text-[11px] font-black hover:bg-indigo-100 transition-colors shadow-sm"
                                        >
                                          <BadgeCheck className="w-4 h-4" />
                                          Negócio Fechado
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Características rápidas no modal (compacto) */}
                                <div className="mt-3 py-2 border-y border-slate-50 bg-slate-50/50 rounded-xl px-2.5 space-y-2">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-3">
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <Bed className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>Quartos:</strong> <span className="font-black text-slate-900">{l.quartos || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <Bed className="w-3 h-3 text-purple-400 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>Suites:</strong> <span className="font-black text-slate-900">{l.suites || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <Bath className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>Banheiros:</strong> <span className="font-black text-slate-900">{l.banheiros || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <Car className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>Garagem:</strong> <span className="font-black text-slate-900">{l.vagas_garagem || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>Andar:</strong> <span className="font-black text-slate-900">{l.andar || '-'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                                      <span className="text-slate-600 truncate"><strong>IPTU:</strong> <span className="font-black text-slate-900">{formatMoney(l.preco_iptu)}</span></span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-slate-100/50">
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600"><strong>Financiamento:</strong> <span className="font-black text-slate-900">{l.aceita_financiamento ? 'Sim' : 'Não'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <ArrowLeftRight className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600"><strong>Permuta:</strong> <span className="font-black text-slate-900">{l.aceita_permuta ? 'Sim' : 'Não'}</span></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 text-[12px] text-slate-700 leading-snug">
                                  <span className="font-black text-slate-900">Cliente:</span> {l.cliente_nome || '-'}
                                  <span className="text-slate-300 font-black"> • </span>
                                  <span className="font-black text-slate-900">Tel:</span> {l.cliente_telefone || '-'}
                                  <span className="text-slate-300 font-black"> • </span>
                                  <span className="font-black text-slate-900">E-mail:</span>{' '}
                                  <span className="break-all">{l.cliente_email || '-'}</span>
                                </div>
                                <div className="mt-1 text-[12px] text-slate-700 leading-snug">
                                  <span className="font-black text-slate-900">Preferência:</span> {l.preferencia_contato || 'Não informado'}
                                  <span className="text-slate-300 font-black"> • </span>
                                  <span className="font-black text-slate-900">Msg:</span>{' '}
                                  <span className="italic line-clamp-1">{l.mensagem ? String(l.mensagem) : 'Sem mensagem.'}</span>
                                </div>
                                <div className="mt-1 text-[12px] text-slate-700 leading-snug">
                                  <span className="font-black text-slate-900">Status:</span>{' '}
                                  <span className="text-slate-600 font-bold">
                                    {l.status || '-'}
                                    {l.status === 'expirado' && (() => {
                                      const type = String(userData.tipo_corretor || '').toLowerCase()
                                      const mins = type === 'interno' ? slaMinutosInterno : slaMinutos
                                      return mins ? ` SLA ${mins} min` : ''
                                    })()}
                                  </span>
                                </div>

                                {activeLeadTab === 'pendentes' && (
                                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <button
                                      type="button"
                                      onClick={() => acceptLead(l.prospect_id)}
                                      disabled={acceptingProspectId === l.prospect_id}
                                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white text-xs font-black hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      {acceptingProspectId === l.prospect_id ? 'Aceitando...' : 'Aceitar agora'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openImovelPublic(l.imovel_id)}
                                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white text-xs font-black hover:bg-slate-800"
                                    >
                                      <ArrowUpRight className="w-4 h-4" />
                                      Ver imóvel
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3) Operacionais */}
              <div className="md:col-span-3 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Operacionais</div>
                    <div className="text-[11px] font-bold text-slate-500">Acesso rápido</div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proprietários</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCadastrarProprietario}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-white text-xs font-black hover:bg-blue-700 shadow-sm"
                        >
                          <UserPlus className="w-4 h-4" />
                          Novo
                        </button>
                        <button
                          type="button"
                          onClick={handleVisualizarProprietarios}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-900 text-xs font-black hover:bg-slate-50 shadow-sm"
                        >
                          <Users className="w-4 h-4 text-blue-700" />
                          Todos
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Imóveis</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCadastrarImovelComoCorretor}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-white text-xs font-black hover:bg-emerald-700 shadow-sm"
                        >
                          <Building2 className="w-4 h-4" />
                          Novo
                        </button>
                        <button
                          type="button"
                          onClick={handleVisualizarImoveis}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-900 text-xs font-black hover:bg-slate-50 shadow-sm"
                        >
                          <List className="w-4 h-4 text-emerald-700" />
                          Cadastrados
                        </button>
                      </div>
                    </div>



                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configurações</div>
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleAreasAtuacao}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-white text-xs font-black hover:bg-indigo-700 shadow-sm"
                        >
                          <MapPin className="w-6 h-6" />
                          Áreas de atuação
                        </button>
                        {!userData.isencao && (
                          <button
                            type="button"
                            onClick={handleGerarQRCode}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-white text-xs font-black hover:bg-amber-600 shadow-sm"
                          >
                            <QrCode className="w-6 h-6" />
                            Gerar QR Code para Pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : userData.userType === 'proprietario' ? (
            /* Layout Detalhado para Proprietário */
            <div className="space-y-8">
              {/* Header com Tipo e Ações */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm text-green-600">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Área do Proprietário</h3>
                    <p className="text-sm font-medium text-gray-500">Gerencie seus dados e imóveis</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleMeusImoveis}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Meus Imóveis Cadastrados
                  </button>
                  <button
                    onClick={handleCadastrarImovel}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Cadastrar Novo Imóvel
                  </button>
                </div>
              </div>

              {/* Grid de Informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna 1: Dados Pessoais */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User className="w-5 h-5 text-green-600" />
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Dados Pessoais</h4>
                  </div>

                  <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome Completo</label>
                      <div className="text-sm font-bold text-gray-900 mt-1">{userData.nome}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CPF</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.cpf || '-'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telefone</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.telefone || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</label>
                      <div className="text-sm font-bold text-gray-900 mt-1 break-all">{userData.email}</div>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Endereço */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Endereço</h4>
                  </div>

                  <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logradouro</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.endereco || '-'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Número</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.numero || '-'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bairro</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.bairro || '-'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CEP</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.cep || '-'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cidade</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.cidade_fk || '-'}</div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.estado_fk || '-'}</div>
                      </div>
                    </div>

                    {userData.complemento && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Complemento</label>
                        <div className="text-sm font-bold text-gray-900 mt-1">{userData.complemento}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Layout Simplificado para Cliente */
            <div className="space-y-6">
              {/* Tipo de Usuário */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo de Conta</p>
                  <p className="text-lg font-semibold text-gray-900">Cliente</p>
                </div>
              </div>

              {/* Dados Básicos */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{userData.nome}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{userData.email}</p>
                  </div>
                </div>
              </div>

              {/* Footer para Clientes */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={handleFechar}
                    className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-medium rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Negócio Fechado */}
      {isNegocioFechadoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header / Parabens */}
            <div className={`p-6 border-b border-slate-100 transition-all duration-500 ${showParabens ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-indigo-50 to-white'}`}>
              <div className="flex items-center justify-between">
                {!showParabens ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <BadgeCheck className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">Negócio Fechado</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gerenciar Status</p>
                      </div>
                    </div>
                    <button
                      onClick={() => !isConfirmingNegocio && setIsNegocioFechadoOpen(false)}
                      className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex-1 text-center py-4 animate-bounce">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                      <BadgeCheck className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter">Parabéns !!!</h3>
                    <p className="text-white/80 font-bold mt-2 uppercase text-xs tracking-[0.3em]">Negócio Finalizado com Sucesso</p>
                  </div>
                )}
              </div>
            </div>

            {!showParabens && (
              <div className="p-8 space-y-8">
                {/* Busca por Código */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-1">
                    Código do Imóvel
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors group-focus-within:text-indigo-600">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <input
                        ref={inputBuscaRef}
                        type="text"
                        value={codigoBusca}
                        onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleBuscarImovelStatus()}
                        placeholder="Ex: AP-001"
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleBuscarImovelStatus()}
                      disabled={isSearching || !codigoBusca.trim()}
                      className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                      {isSearching ? <RefreshCcw className="w-5 h-5 animate-spin" /> : 'Buscar'}
                    </button>
                  </div>
                </div>

                {negocioError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-black text-rose-800">{negocioError}</p>
                  </div>
                )}

                {imovelEncontrado && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{imovelEncontrado.codigo}</div>
                          <h4 className="text-sm font-black text-slate-900 truncate mt-1">{imovelEncontrado.titulo}</h4>
                          <div className="text-xs font-black text-indigo-600 mt-1">{formatMoney(imovelEncontrado.preco)}</div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200/50">
                        <label
                          className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${negocioFechadoChecked
                            ? 'bg-emerald-50 border-emerald-500/30'
                            : 'bg-white border-transparent hover:border-slate-200'
                            }`}
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={negocioFechadoChecked}
                              onChange={(e) => setNegocioFechadoChecked(e.target.checked)}
                              className="w-6 h-6 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <span className={`text-sm font-black ${negocioFechadoChecked ? 'text-emerald-900' : 'text-slate-900'}`}>
                              Negócio Fechado
                            </span>
                            <p className={`text-[10px] font-bold mt-0.5 ${negocioFechadoChecked ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {negocioFechadoChecked ? 'Este imóvel será marcado como vendido/locado.' : 'Marque para finalizar o negócio.'}
                            </p>
                          </div>
                          {negocioFechadoChecked && <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-in zoom-in" />}
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsNegocioFechadoOpen(false)}
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-900 text-sm font-black hover:bg-slate-200 transition-colors active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirmarNegocioFechado}
                        disabled={isConfirmingNegocio}
                        className="flex-[2] px-6 py-4 rounded-2xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 disabled:opacity-50"
                      >
                        {isConfirmingNegocio ? <RefreshCcw className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button
                onClick={() => setIsNegocioFechadoOpen(false)}
                className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                Retornar ao Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
