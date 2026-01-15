'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, X, User, Mail, Phone, MapPin, Building2, BadgeCheck, UserPlus, Users, List, Edit2, Save, XCircle, QrCode, Clock, CheckCircle2, RefreshCcw, Bell, Settings, ArrowUpRight } from 'lucide-react'
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
    fotoDataUrl?: string
    endereco?: string
    numero?: string
    bairro?: string
    cidade_fk?: string
    estado_fk?: string
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
  const [fotoPreview, setFotoPreview] = useState<string | null>(userData.fotoDataUrl || null)
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
  }

  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [acceptingProspectId, setAcceptingProspectId] = useState<number | null>(null)
  const [slaMinutos, setSlaMinutos] = useState<number | null>(null)
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
    const pendentes = leads.filter((l: any) => l.status === 'atribuido' && isReq(l)).length
    const atribuidos = leads.filter((l: any) => (l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l)))).length
    const aceitos = leads.filter((l: any) => l.status === 'aceito').length
    const perdidos = leads.filter((l: any) => l.status === 'expirado').length
    const fechados = 0 // futuro
    const todos = leads.length
    return { pendentes, atribuidos, aceitos, perdidos, fechados, todos }
  }, [leads])

  const leadTabs = useMemo(
    () =>
      [
        { id: 'pendentes', label: 'Pendentes (SLA)', count: leadsResumo.pendentes, tone: 'danger' as const },
        { id: 'atribuido', label: 'Atribuídos (diretos ou via plataforma)', count: leadsResumo.atribuidos, tone: 'primary' as const },
        { id: 'aceito', label: 'Aceitos', count: leadsResumo.aceitos, tone: 'success' as const },
        { id: 'expirado', label: 'Perdidos (SLA)', count: leadsResumo.perdidos, tone: 'muted' as const },
        { id: 'fechado', label: 'Fechados', count: leadsResumo.fechados, tone: 'muted' as const, disabled: true as const },
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
      if (tab === 'pendentes') return leads.filter((l: any) => l.status === 'atribuido' && isReq(l))
      if (tab === 'atribuido') return leads.filter((l: any) => l.status === 'aceito' || (l.status === 'atribuido' && !isReq(l)))
      if (tab === 'aceito') return leads.filter((l: any) => l.status === 'aceito')
      if (tab === 'expirado') return leads.filter((l: any) => l.status === 'expirado')
      if (tab === 'fechado') return []
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
      // UX: abrir em nova aba para não "tomar" o modal do corretor.
      const params = new URLSearchParams()
      params.set('status', 'all')
      params.set('view', tab)
      if (prospectId) params.set('prospectId', String(prospectId))
      window.open(`/corretor/leads?${params.toString()}`, '_blank', 'noopener,noreferrer')
    },
    []
  )

  const openLeadDetailsPage = useCallback((prospectId: number) => {
    if (!prospectId) return
    // Abrir em nova aba para não "perder" o contexto do modal do corretor.
    window.open(`/corretor/leads/${prospectId}`, '_blank', 'noopener,noreferrer')
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

  const handleAreasAtuacao = () => {
    // UX: abrir em nova aba para não sobrepor o modal do corretor
    try {
      sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
    } catch { }
    window.open('/corretor/areas-atuacao', '_blank', 'noopener,noreferrer')
  }

  const handleGerarQRCode = () => {
    // UX: abrir em nova aba para não sobrepor o modal do corretor
    try {
      sessionStorage.setItem('corretor_return_url', window.location.pathname + window.location.search)
    } catch { }
    window.open('/corretor/pagamentos/qrcode', '_blank', 'noopener,noreferrer')
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
      // Apenas o login público (cliente/proprietário) precisa atualizar o header público
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full ${userData.userType === 'corretor' ? 'max-w-7xl' : 'max-w-lg'
          } bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-green-100 rounded-full">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 truncate">
                Login realizado com sucesso!
              </h2>
              <p className="text-sm text-gray-600">Bem-vindo(a) de volta ao seu painel.</p>
            </div>
          </div>
          <button
            onClick={handleFechar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Seus Índices - Leads</div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white border border-rose-200 p-3">
                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Pendentes</div>
                        <div className="mt-1 text-xl font-black text-rose-700">{leadsResumo.pendentes}</div>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recebidos</div>
                        <div className="mt-1 text-xl font-black text-slate-900">{leadStats.recebidos}</div>
                      </div>
                      <div className="rounded-xl bg-white border border-rose-200 p-3">
                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Perdidos SLA</div>
                        <div className="mt-1 text-xl font-black text-rose-700">{leadStats.perdidosSla}</div>
                      </div>
                      <div className="rounded-xl bg-white border border-emerald-200 p-3">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aceite no SLA</div>
                        <div className="mt-1 text-xl font-black text-emerald-700">
                          {(Number(leadStats.aceiteNoSlaPercent) || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}%
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          {`${leadStats.aceiteNoSlaAceitos ?? 0}/${leadStats.aceiteNoSlaAvaliados ?? 0}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2) Leads (mais “deitados” / horizontais) */}
              <div className="md:col-span-6 space-y-5">
                {/* HUB premium de Leads */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                  <div className="flex flex-col gap-4">
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
                        <button
                          type="button"
                          onClick={() => openLeadsPanel(leadsResumo.pendentes > 0 ? 'pendentes' : 'atribuido')}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-sm hover:shadow-md transition-all ${leadsResumo.pendentes > 0
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                        >
                          {leadsResumo.pendentes > 0 ? (
                            <>
                              <Clock className="w-4 h-4" />
                              Ver pendentes ({leadsResumo.pendentes})
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Ver atribuídos
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
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

                    {/* Preview */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
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

                      <div className="p-3">
                        {leadsLoading ? (
                          <div className="text-slate-600 text-sm">Carregando leads...</div>
                        ) : getTabLeads(activeLeadTab).length === 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
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
                          <div className="space-y-2">
                            {getTabLeads(activeLeadTab)
                              .slice(0, 3)
                              .map((l: any) => (
                                <div
                                  key={l.prospect_id}
                                  className="rounded-2xl border border-slate-200 p-3 hover:shadow-sm transition-shadow"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Código <span className="text-slate-700">{l.codigo || '-'}</span>
                                      </div>
                                      <div className="mt-0.5 text-sm font-black text-slate-900">{formatMoney(l.preco)}</div>
                                      <div className="mt-0.5 text-[11px] text-slate-600 font-bold">
                                        <span className="text-slate-500 font-black">Data:</span>{' '}
                                        {formatDateTime(l.data_interesse || l.atribuido_em)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {activeLeadTab === 'pendentes' && (
                                        <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-900 text-[11px] font-black">
                                          <Clock className="w-4 h-4" />
                                          SLA{slaMinutos ? `: ${slaMinutos} min` : ''}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => openLeadDetailsPage(l.prospect_id)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-slate-900 text-[11px] font-black hover:bg-slate-50"
                                      >
                                        <ArrowUpRight className="w-4 h-4" />
                                        Ver detalhes
                                      </button>
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
          ) : (
            /* Layout Simplificado para Cliente/Proprietário (Original) */
            <div className="space-y-6">
              {/* Tipo de Usuário */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
                <div
                  className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${userData.userType === 'cliente' ? 'bg-blue-100' : 'bg-green-100'
                    }`}
                >
                  <User className={`w-5 h-5 ${userData.userType === 'cliente' ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo de Conta</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userData.userType === 'cliente' ? 'Cliente' : 'Proprietário'}
                  </p>
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

              {/* Footer para Clientes/Proprietários */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {userData.userType === 'proprietario' && (
                    <button
                      onClick={handleCadastrarImovel}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Cadastrar Imóvel
                    </button>
                  )}
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
    </div>
  )
}
