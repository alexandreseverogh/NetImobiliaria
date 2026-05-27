'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BuildingOffice2Icon, 
  Squares2X2Icon, 
  CommandLineIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SparklesIcon,
  CubeIcon,
  SquaresPlusIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useApi } from '@/hooks/useApi'
import { toast } from 'react-hot-toast'

interface Feature {
  id: number
  name: string
  slug: string
  is_default: boolean
  is_skill?: boolean
  skill_metadata?: any
  category_id?: number
  category_name?: string
}

interface Module {
  id: string
  name: string
  slug: string
  features: Feature[]
}

interface Segment {
  id: string
  name: string
  icon: string
  modules: Module[]
}

interface Tenant {
  id: string
  name: string
  segment_id: string
  status: string
}

export function MasterProvisioningHub() {
  const { get, post } = useApi()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Data State
  const [tree, setTree] = useState<Segment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [orphanFeatures, setOrphanFeatures] = useState<Feature[]>([])
  
  // UI Selection State
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [selectedModuleForFeatures, setSelectedModuleForFeatures] = useState<string | number | 'orphans' | null>(null)
  const [featureSearch, setFeatureSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [tenantSearch, setTenantSearch] = useState('')
  const [segmentSearch, setSegmentSearch] = useState('')
  const [isTenantListOpen, setIsTenantListOpen] = useState(false)
  
  // Security State
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [master2FA, setMaster2FA] = useState(false)
  const [schemaCache, setSchemaCache] = useState<Record<string, any[]>>({})

  const fetchTableSchema = async (table: string) => {
    if (schemaCache[table]) return
    try {
      const resp = await get(`/api/admin/master/schema?table=${table}`)
      const data = await resp.json()
      if (data.success) {
        setSchemaCache(prev => ({ ...prev, [table]: data.columns }))
      }
    } catch (err) {
      console.error('Erro ao buscar schema:', err)
    }
  }
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [provisioningData, setProvisioningData] = useState<{
    modules: string[],
    features: number[],
    moduleConfigs: Record<string, { theme_mode: string, primary_color: string }>,
    skillConfigs: Record<number, any>
  }>({ modules: [], features: [], moduleConfigs: {}, skillConfigs: {} })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const resp = await get('/api/admin/master/provisioning')
      const data = await resp.json()
      if (data.success) {
        setTree(Array.isArray(data.tree) ? data.tree : [])
        setTenants(Array.isArray(data.tenants) ? data.tenants : [])
        setOrphanFeatures(Array.isArray(data.orphanFeatures) ? data.orphanFeatures : [])
        // Carregar status 2FA do Master (admin)
        const masterUser = data.masterUserInfo;
        if (masterUser) {
          setMaster2FA(!!masterUser.two_fa_enabled)
        }
        
        // Carregar tabelas disponíveis
        loadTables()
      }
    } catch (err) {
      toast.error('Erro ao conectar com a Central de Provisionamento')
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async () => {
    try {
      const resp = await get('/api/admin/master/governance/tables')
      const data = await resp.json()
      if (data.success) setAvailableTables(data.tables)
    } catch (err) {
      console.error('Erro ao carregar tabelas')
    }
  }

  const loadTenantProvisioning = async (tenantId: string) => {
    try {
      const resp = await get(`/api/admin/master/provisioning?tenant_id=${tenantId}`)
      const data = await resp.json()
      if (data.success) {
        const modules = data.modules.map((id: string) => String(id));
        setProvisioningData({
          modules,
          moduleConfigs: data.moduleConfigs || {},
          features: data.features.map((id: string | number) => Number(id)),
          skillConfigs: data.skillConfigs || {}
        })
        
        // 🚀 AUTO-SELECT: Se houver módulos, seleciona o primeiro para exibir features imediatamente
        if (modules.length > 0) {
          setSelectedModuleForFeatures(modules[0])
        } else {
          setSelectedModuleForFeatures(null)
        }
      }
    } catch (err) {
      toast.error('Erro ao carregar contrato da empresa')
    }
  }

  // Filtrar dados baseados na seleção
  const filteredSegments = (tree || [])
    .filter(s => s && s.name && s.name.toLowerCase().includes((segmentSearch || '').toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const fullTenantListForSegment = tenants
    .filter(t => !selectedSegment || t.segment_id === selectedSegment)
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredTenants = fullTenantListForSegment
    .filter(t => 
      !tenantSearch || t.name.toLowerCase().startsWith(tenantSearch.toLowerCase())
    )
    .slice(0, 50) // Limite de performance para milhares de itens
  const activeSegmentData = tree.find(s => s.id === selectedSegment)
  
  // Dados da Coluna 4 (Features a exibir)
  let featuresToShow: Feature[] = []
  if (selectedModuleForFeatures === 'orphans') {
    featuresToShow = orphanFeatures
  } else if (selectedModuleForFeatures !== null && activeSegmentData) {
    const activeMod = activeSegmentData.modules.find(m => String(m.id) === String(selectedModuleForFeatures))
    if (activeMod) featuresToShow = activeMod.features
  }

  const toggleAllFeatures = (assign: boolean) => {
    if (!selectedModuleForFeatures) return
    
    const idsToModify = featuresToShow.map(f => f.id)
    setProvisioningData(prev => {
      const filtered = prev.features.filter(id => !idsToModify.includes(id))
      return {
        ...prev,
        features: assign ? [...filtered, ...idsToModify] : filtered
      }
    })
  }

  const toggleModuleTheme = (moduleId: string) => {
    setProvisioningData(prev => {
      const currentConfig = prev.moduleConfigs[moduleId] || { theme_mode: 'light', primary_color: '' }
      const nextTheme = currentConfig.theme_mode === 'dark' ? 'light' : 'dark'
      return {
        ...prev,
        moduleConfigs: {
          ...prev.moduleConfigs,
          [moduleId]: { ...currentConfig, theme_mode: nextTheme }
        }
      }
    })
  }

  const handleSaveProvisioning = async () => {
    if (!selectedTenant) return
    
    setSaving(true)
    try {
      const resp = await post('/api/admin/master/provisioning', {
        tenant_id: selectedTenant,
        selected_modules: provisioningData.modules,
        module_configs: provisioningData.moduleConfigs,
        feature_overrides: provisioningData.features,
        skill_configs: provisioningData.skillConfigs
      })
      const data = await resp.json()
      if (data.success) {
        toast.success('Contrato Master atualizado com sucesso!')
      }
    } catch (err) {
      toast.error('Erro ao salvar provisionamento')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMasterSecurity = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem!')
      return
    }

    setChangingPassword(true)
    try {
      // Capturar senha atual diretamente do DOM para suportar preenchimento automático do navegador
      const resp = await post('/api/admin/master/security', {
        two_fa_enabled: master2FA,
        new_password: newPassword || undefined
      })

      const data = await resp.json()

      if (data && (data.success || data.id)) {
        toast.success(data.message || 'Segurança Master atualizada!')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordForm(false)
        await loadInitialData()
      } else {
        toast.error(data?.message || 'Erro ao atualizar segurança')
      }
    } catch (err) {
      toast.error('Erro ao conectar com o serviço de segurança')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <SparklesIcon className="h-12 w-12 text-blue-500 mb-4 animate-bounce" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sincronizando Central Master...</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* 🔐 CONTAINER DE SEGURANÇA MASTER - TOP SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-50 to-slate-200 rounded-[2.5rem] p-1 shadow-xl shadow-slate-200 overflow-hidden border border-slate-300/50"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.3rem] p-8 shadow-inner">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Info Master */}
            <div className="flex items-center space-x-6">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-lg shadow-blue-900/40">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
                  Segurança de Acesso MASTER
                  <div className="ml-3 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                    Célula de Governança
                  </div>
                </h2>
                <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-tighter">Administração de Credenciais Raiz</p>
              </div>
            </div>

            {/* Controles de Segurança */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Toggle 2FA */}
              <div className="flex items-center space-x-4 bg-white hover:bg-slate-50 p-3 rounded-2xl border border-slate-200 transition-all shadow-sm">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master 2FA Access</span>
                  <span className={`text-[11px] font-bold ${master2FA ? 'text-blue-600' : 'text-slate-400'}`}>
                    {master2FA ? 'Padrão Ativado' : 'Acesso Simples'}
                  </span>
                </div>
                <button 
                  onClick={() => setMaster2FA(!master2FA)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    master2FA ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      master2FA ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Botão Trocar Senha */}
              <button 
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className={`flex items-center px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm ${
                  showPasswordForm 
                  ? 'bg-red-50 text-red-600 border border-red-100' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                {showPasswordForm ? 'Cancelar' : 'Alterar Senha MASTER'}
              </button>
              
              <button 
                onClick={handleUpdateMasterSecurity}
                disabled={changingPassword || (!showPasswordForm && master2FA === (loading ? false : master2FA))}
                className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gray-200 transition-all disabled:opacity-50"
              >
                {changingPassword ? 'Processando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          {/* Formulário de Senha (Expansível) */}
          <AnimatePresence>
            {showPasswordForm && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-7 bg-white rounded-3xl border border-slate-200 shadow-sm relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nova Senha MASTER</label>
                    <div className="relative group">
                      <input 
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateMasterSecurity();
                        }}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-white border-slate-200 rounded-xl px-4 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 border-2 transition-all placeholder-slate-300"
                        placeholder="Definir nova senha raiz"
                        autoFocus
                      />
                      <button 
                         type="button"
                         onMouseDown={(e) => e.preventDefault()}
                         onClick={() => setShowPasswords(!showPasswords)}
                         className="absolute right-4 top-4 text-slate-300 hover:text-slate-900 transition-colors"
                      >
                        {showPasswords ? <EyeSlashIcon className="h-5 w-5" /> : <KeyIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                    <div className="relative group">
                      <input 
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateMasterSecurity();
                        }}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className={`w-full bg-white rounded-xl px-4 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 border-2 transition-all ${
                          confirmPassword && newPassword === confirmPassword ? 'border-emerald-500/50' : confirmPassword ? 'border-red-500/50' : 'border-slate-200'
                        }`}
                        placeholder="Repetir nova senha"
                      />
                      <button 
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-4 top-4 text-slate-300 hover:text-slate-900 transition-colors"
                      >
                        {showPasswords ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="absolute -bottom-5 left-1 text-[9px] font-bold text-red-500 uppercase tracking-tighter animate-pulse">As senhas digitadas divergem</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex flex-col h-[calc(100vh-14rem)] space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
        
        {/* COLUNA 1: Segmentos */}
        <div className="bg-white/50 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm overflow-hidden">
          <div className="flex flex-col space-y-4 mb-6 pb-4 bg-blue-50/30 -m-6 p-6 rounded-t-3xl border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-blue-700">
                <Squares2X2Icon className="h-6 w-6" />
                <h3 className="text-sm font-black tracking-tight uppercase">Segmento</h3>
              </div>
              <span className="px-2 py-0.5 bg-blue-100/50 text-blue-600 text-[10px] font-black rounded-md border border-blue-200">
                {filteredSegments.length}
              </span>
            </div>

            <div className="relative">
              <input 
                type="text"
                placeholder="Filtrar segmento..."
                value={segmentSearch}
                onChange={(e) => setSegmentSearch(e.target.value)}
                className="w-full bg-white/60 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all placeholder-blue-300"
              />
              <Squares2X2Icon className="absolute left-3 top-2.5 h-4 w-4 text-blue-300" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 space-y-2">
            {filteredSegments.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10 italic">Nenhum segmento...</p>
            ) : filteredSegments.map(segment => (
              <button
                key={segment.id}
                onClick={() => {
                  setSelectedSegment(segment.id)
                  setSelectedTenant(null)
                  setSelectedModuleForFeatures(null)
                }}
                className={`w-full group flex items-center p-4 rounded-2xl transition-all border-2 ${
                  selectedSegment === segment.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className={`p-2 rounded-xl mr-4 ${selectedSegment === segment.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                   {segment.icon === 'box' ? <CubeIcon className="h-5 w-5" /> : <Squares2X2Icon className="h-5 w-5" />}
                </div>
                <span className="flex-1 text-left font-bold text-xs uppercase tracking-tight">{segment.name}</span>
                <ChevronRightIcon className={`h-4 w-4 transform transition-transform ${selectedSegment === segment.id ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </div>
        </div>

        {/* COLUNA 2: Empresas (Tenants) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/50 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm overflow-hidden"
        >
          <div className="flex flex-col space-y-4 mb-6 pb-4 bg-emerald-50/30 -m-6 p-6 rounded-t-3xl border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-700">
                <BuildingOffice2Icon className="h-6 w-6" />
                <h3 className="text-sm font-black tracking-tight uppercase">Empresa</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-900 text-[10px] font-black text-white rounded-md shadow-sm border border-emerald-800">
                {filteredTenants.length}
              </span>
            </div>
            
            {selectedSegment && (
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Buscar empresa pelo nome..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-full bg-white/60 border-none rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all placeholder-emerald-300"
                />
                <CommandLineIcon className="absolute left-3 top-2.5 h-4 w-4 text-emerald-300" />
                {tenantSearch && (
                  <button 
                    onClick={() => setTenantSearch('')}
                    className="absolute right-3 top-2.5 text-[10px] font-black text-emerald-400 hover:text-emerald-600 uppercase"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            {!selectedSegment ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                <Squares2X2Icon className="h-12 w-12" />
                <p className="text-sm font-bold uppercase tracking-widest">Selecione um Segmento</p>
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4">
                {/* O SELETOR ESTILO DROPDOWN */}
                <div className="relative group">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Escolha a Empresa</p>
                  
                  <button 
                    onClick={() => setIsTenantListOpen(!isTenantListOpen)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      selectedTenant 
                      ? 'bg-emerald-900 border-emerald-900 text-white shadow-xl' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-[10px] ${selectedTenant ? 'bg-white/20' : 'bg-gray-100'}`}>
                        {selectedTenant ? tenants.find(t => t.id === selectedTenant)?.name.substring(0, 2).toUpperCase() : '?'}
                      </div>
                      <span className="font-bold text-xs uppercase tracking-tight truncate">
                        {selectedTenant ? tenants.find(t => t.id === selectedTenant)?.name : 'Pesquisar empresa...'}
                      </span>
                    </div>
                    <ChevronRightIcon className={`h-4 w-4 transform transition-transform ${isTenantListOpen ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isTenantListOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 top-full mt-2 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden ring-1 ring-black/5"
                      >
                        {/* BUSCA INTERNA NO DROPDOWN */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                          <div className="relative">
                            <input 
                              autoFocus
                              type="text"
                              placeholder="Filtro por iniciais..."
                              value={tenantSearch}
                              onChange={(e) => setTenantSearch(e.target.value)}
                              className="w-full bg-white border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                            />
                            <CommandLineIcon className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400" />
                          </div>
                        </div>

                        {/* LISTA RESULTADOS */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          {filteredTenants.length === 0 ? (
                            <div className="py-8 text-center opacity-40">
                              <p className="text-[10px] font-black uppercase italic text-gray-400">Nenhum resultado para "{tenantSearch}"</p>
                            </div>
                          ) : (
                            filteredTenants.map(tenant => (
                              <button
                                key={tenant.id}
                                onClick={() => {
                                  setSelectedTenant(tenant.id)
                                  setIsTenantListOpen(false)
                                  setTenantSearch('')
                                  setSelectedModuleForFeatures(null)
                                  loadTenantProvisioning(tenant.id)
                                }}
                                className={`w-full flex items-center p-3 rounded-xl transition-all border-2 ${
                                  selectedTenant === tenant.id 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                                  : 'border-transparent hover:bg-gray-50 hover:border-gray-100 text-gray-600'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mr-3 font-black text-[8px] ${selectedTenant === tenant.id ? 'bg-emerald-200' : 'bg-gray-100'}`}>
                                  {tenant.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="flex-1 text-left font-bold text-[11px] uppercase truncate">{tenant.name}</span>
                                {selectedTenant === tenant.id && <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
                              </button>
                            ))
                          )}
                          {fullTenantListForSegment.length > 50 && tenantSearch === '' && (
                            <p className="text-center py-2 text-[9px] font-black text-gray-400 uppercase bg-gray-50 rounded-lg">Exibindo Primeiros 50 (Total: {fullTenantListForSegment.length})</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* AREA DE CONTEXTO / INFO */}
                <div className="flex-1 flex flex-col items-center justify-center opacity-10 border-2 border-dashed border-gray-200 rounded-3xl p-8">
                  <BuildingOffice2Icon className="h-16 w-16 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Controle de Ativos Estendido</p>
                </div>

                {selectedTenant && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                         <div className="p-1.5 bg-emerald-600 rounded-lg">
                           <CheckCircleIcon className="h-4 w-4 text-white" />
                         </div>
                         <h4 className="text-[10px] font-black text-emerald-900 uppercase">Ficha Master</h4>
                      </div>
                      <button onClick={() => setSelectedTenant(null)} className="text-[9px] font-black text-emerald-600/50 hover:text-red-500 uppercase transition-colors">Remover</button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-emerald-950 uppercase truncate">
                        {tenants.find(t => t.id === selectedTenant)?.name}
                      </p>
                      <p className="text-[9px] font-mono text-emerald-600/70">UUID: {selectedTenant}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* COLUNA 3: Módulos do Contrato */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/50 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm border-l-4 border-l-indigo-500 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-6 pb-4 bg-indigo-50/30 -m-6 p-6 rounded-t-3xl border-b border-indigo-100">
            <div className="flex items-center space-x-3 text-indigo-700">
              <CubeIcon className="h-6 w-6" />
              <h3 className="text-sm font-black tracking-tight uppercase">Módulos Assinados</h3>
            </div>
          </div>

          {!selectedTenant ? (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
               <BuildingOffice2Icon className="h-12 w-12" />
               <p className="text-sm font-bold uppercase tracking-widest">Selecione uma Empresa</p>
             </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 space-y-4">
              {activeSegmentData?.modules.map(module => {
                const isSelected = selectedModuleForFeatures === module.id;
                const isProvisioned = provisioningData.modules.includes(String(module.id));
                const config = provisioningData.moduleConfigs[module.id] || { theme_mode: 'light' };

                return (
                  <div 
                    key={module.id} 
                    className={`relative overflow-hidden group flex flex-col p-4 rounded-2xl transition-all border-2 cursor-pointer ${
                      isSelected 
                      ? 'bg-indigo-50/50 border-indigo-600 shadow-md ring-2 ring-indigo-50' 
                      : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'
                    }`}
                    onClick={() => setSelectedModuleForFeatures(module.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center">
                        <input 
                          type="checkbox"
                          checked={isProvisioned}
                          onChange={(e) => {
                            e.stopPropagation()
                            const isChecked = e.target.checked
                            const nextModules = isChecked 
                              ? [...provisioningData.modules, String(module.id)]
                              : provisioningData.modules.filter(id => id !== String(module.id))
                            
                            const featureIds = module.features.map(f => f.id)
                            const nextFeatures = isChecked 
                              ? Array.from(new Set([...provisioningData.features, ...featureIds]))
                              : provisioningData.features.filter(id => !featureIds.includes(id))

                            setProvisioningData({ ...provisioningData, modules: nextModules, features: nextFeatures })
                          }}
                          className="h-5 w-5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer mr-3"
                        />
                        <span className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {module.name}
                        </span>
                      </div>
                      <ChevronRightIcon className={`h-4 w-4 text-gray-400 ${isSelected ? 'text-indigo-600' : ''}`} />
                    </div>
                    
                    {/* Opções de Tema (Só aparece se o módulo estiver selecionado E provisionado) */}
                    {isSelected && isProvisioned && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-1">
                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">Estética Visual:</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModuleTheme(String(module.id));
                          }}
                          className={`flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                            config.theme_mode === 'dark' 
                            ? 'bg-gray-900 text-white border border-gray-700' 
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                          }`}
                        >
                          {config.theme_mode === 'dark' ? (
                            <>
                              <SparklesIcon className="h-3 w-3 mr-1 text-blue-400" />
                              Modo Dark
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="h-3 w-3 mr-1 text-amber-400" />
                              Modo Light
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 font-medium ml-8 mt-1">{module.features.length} Features Atreladas</p>
                  </div>
                );
              })}

              {orphanFeatures.length > 0 && (
                <div 
                  className={`mt-8 relative overflow-hidden group flex items-center p-4 rounded-2xl transition-all border-2 border-dashed cursor-pointer ${
                    selectedModuleForFeatures === 'orphans' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-orange-200 bg-white hover:bg-orange-50'
                  }`}
                  onClick={() => setSelectedModuleForFeatures('orphans')}
                >
                  <SquaresPlusIcon className="h-5 w-5 text-orange-500 mr-3" />
                  <span className="flex-1 text-xs font-black text-orange-700 uppercase tracking-widest">Funcionalidades Extras</span>
                  <ChevronRightIcon className="h-4 w-4 text-orange-400" />
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* COLUNA 4: Features Granulares */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/50 backdrop-blur-xl border border-gray-100 rounded-3xl p-6 flex flex-col shadow-sm overflow-hidden"
        >
          <div className="flex flex-col space-y-4 mb-6 pb-4 bg-amber-50/30 -m-6 p-6 rounded-t-3xl border-b border-amber-100 text-amber-950">
            <div className="flex items-center space-x-3 text-amber-700">
              <CommandLineIcon className="h-6 w-6" />
              <h3 className="text-sm font-black tracking-tight uppercase">Exceções e Features</h3>
            </div>
            
            {selectedModuleForFeatures && (
              <div className="space-y-3">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Buscar funcionalidade..."
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    className="w-full bg-white/60 border-none rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all placeholder-amber-300"
                  />
                  <SparklesIcon className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAllFeatures(true)}
                    className="flex-1 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-amber-200 transition-colors border border-amber-200"
                  >
                    Marcar Todas
                  </button>
                  <button 
                    onClick={() => toggleAllFeatures(false)}
                    className="flex-1 py-1.5 bg-white/60 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-white transition-colors border border-amber-100"
                  >
                    Limpar Tudo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2">
            {!selectedModuleForFeatures ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                <CubeIcon className="h-12 w-12" />
                <p className="text-sm font-bold uppercase tracking-widest max-w-[200px]">Selecione um bloco na coluna anterior</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const filtered = featuresToShow.filter(f => f.name.toLowerCase().includes(featureSearch.toLowerCase()));
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Nenhuma Feature Encontrada</p>
                        {featureSearch && (
                          <button onClick={() => setFeatureSearch('')} className="mt-2 text-[10px] font-black text-indigo-600 uppercase underline">Limpar Busca</button>
                        )}
                      </div>
                    );
                  }

                  // Agrupar por categoria
                  const groups: Record<string, Feature[]> = {};
                  filtered.forEach(f => {
                    const cat = f.category_name || 'Diversos';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(f);
                  });

                  return Object.entries(groups).map(([catName, features]) => {
                    const allInCatChecked = features.every(f => provisioningData.features.includes(f.id));
                    const someInCatChecked = features.some(f => provisioningData.features.includes(f.id));
                    const isExpanded = expandedCategories.includes(catName);

                    return (
                      <div key={catName} className="border border-gray-100 rounded-3xl overflow-hidden bg-white/40 mb-3 last:mb-0">
                        <div 
                          className={`px-4 py-3 flex items-center justify-between border-b border-gray-100 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-gray-50/80 shadow-sm' : 'bg-white/20 hover:bg-white/40'
                          }`}
                          onClick={() => {
                            setExpandedCategories(prev => 
                              prev.includes(catName) 
                                ? prev.filter(c => c !== catName) 
                                : [...prev, catName]
                            )
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-1.5 rounded-xl transition-all ${
                              someInCatChecked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                               <SquaresPlusIcon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">{catName}</span>
                              <span className="text-[9px] font-bold text-gray-400">
                                {features.length} Funcionalidades
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idsToToggle = features.map(f => f.id);
                                  setProvisioningData(prev => {
                                    const others = prev.features.filter(id => !idsToToggle.includes(id));
                                    return {
                                      ...prev,
                                      features: allInCatChecked ? others : [...others, ...idsToToggle]
                                    };
                                  });
                                }}
                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                                  allInCatChecked 
                                  ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                }`}
                              >
                                {allInCatChecked ? 'Remover Grupo' : 'Assinar Grupo'}
                              </button>
                            </div>
                            
                            <div className={`p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-gray-100 text-gray-600' : 'text-gray-400'}`}>
                              <ChevronDownIcon className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-gray-50/30 animate-in slide-in-from-top-2 duration-300">
                            {features.map(feature => (
                              <div 
                                key={feature.id} 
                                className={`flex flex-col p-3 border rounded-2xl transition-all ${
                                  provisioningData.features.includes(feature.id)
                                    ? 'bg-white border-indigo-100 shadow-sm'
                                    : 'bg-white/40 border-transparent hover:bg-white hover:border-gray-100'
                                }`}
                              >
                                <label className="flex items-start cursor-pointer group">
                                  <input 
                                    type="checkbox"
                                    checked={provisioningData.features.includes(feature.id)}
                                    onChange={(e) => {
                                      const next = e.target.checked 
                                        ? [...provisioningData.features, feature.id]
                                        : provisioningData.features.filter(id => id !== feature.id)
                                      setProvisioningData({ ...provisioningData, features: next })
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <p className={`text-[11px] font-black uppercase tracking-tight group-hover:text-indigo-700 transition-colors ${provisioningData.features.includes(feature.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                          {feature.name}
                                        </p>
                                        {feature.is_skill && (
                                          <div className="flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 animate-pulse">
                                            <SparklesIcon className="h-2.5 w-2.5 mr-1" />
                                            <span className="text-[8px] font-black tracking-widest uppercase">Skill</span>
                                          </div>
                                        )}
                                      </div>
                                      {feature.is_default && (
                                        <span className="text-[8px] font-black tracking-widest uppercase bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md border border-green-100">Padrão</span>
                                      )}
                                    </div>
                                    <p className="text-[9px] font-mono text-gray-400/70 mt-0.5">{feature.slug}</p>
                                  </div>
                                </label>

                                {/* Área de Parametrização de Superpoderes */}
                                {feature.is_skill && provisioningData.features.includes(feature.id) && (
                                  <div className="mt-3 ml-7 pt-3 border-t border-blue-50 space-y-4 animate-in slide-in-from-top-1 duration-300 text-left">
                                    <div className="flex items-center space-x-2">
                                      <SparklesIcon className="h-3 w-3 text-blue-500" />
                                      <p className="text-[9px] font-black text-blue-900 uppercase tracking-tighter">
                                        Associação de Superpoderes
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Parametrização Visual */}
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Estilo (Cor Primária)</label>
                                        <div className="flex items-center space-x-2">
                                          <input 
                                            type="text"
                                            value={provisioningData.skillConfigs[feature.id]?.primary_color || ''}
                                            onChange={(e) => {
                                              const color = e.target.value;
                                              setProvisioningData(prev => ({
                                                ...prev,
                                                skillConfigs: {
                                                  ...prev.skillConfigs,
                                                  [feature.id]: { ...prev.skillConfigs[feature.id], primary_color: color }
                                                }
                                              }));
                                            }}
                                            className="w-full bg-blue-50/50 border-none rounded-lg px-2 py-1.5 text-[10px] font-mono focus:ring-1 focus:ring-blue-500 transition-all"
                                            placeholder="#6366f1"
                                          />
                                          <div 
                                            className="w-5 h-5 rounded-md border border-gray-200 flex-shrink-0"
                                            style={{ backgroundColor: provisioningData.skillConfigs[feature.id]?.primary_color || '#6366f1' }}
                                          />
                                        </div>
                                      </div>

                                      {/* Mapeamento de Dados (Data Bridging) */}
                                      {feature.skill_metadata?.requirements?.map((req: any) => {
                                        if (!schemaCache[req.target]) fetchTableSchema(req.target)
                                        
                                        return (
                                            <div key={req.id} className="space-y-1">
                                              <div className="flex items-center justify-between ml-1">
                                                <label className="text-[8px] font-bold text-indigo-500 uppercase">{req.label}</label>
                                                {req.default_mapping && !provisioningData.skillConfigs[feature.id]?.mappings?.[req.id] && (
                                                  <span className="text-[7px] font-black text-amber-500 uppercase flex items-center animate-pulse">
                                                    <SparklesIcon className="h-2 w-2 mr-0.5" /> Sugestão Ativa
                                                  </span>
                                                )}
                                              </div>
                                              <select
                                                value={provisioningData.skillConfigs[feature.id]?.mappings?.[req.id] || req.default_mapping || ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setProvisioningData(prev => ({
                                                    ...prev,
                                                    skillConfigs: {
                                                      ...prev.skillConfigs,
                                                      [feature.id]: { 
                                                        ...prev.skillConfigs[feature.id], 
                                                        mappings: { 
                                                          ...(prev.skillConfigs[feature.id]?.mappings || {}),
                                                          [req.id]: val 
                                                        }
                                                      }
                                                    }
                                                  }));
                                                }}
                                                className={`w-full border-none rounded-lg px-2 py-1.5 text-[10px] font-bold focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer ${
                                                  !provisioningData.skillConfigs[feature.id]?.mappings?.[req.id] && req.default_mapping 
                                                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' 
                                                  : 'bg-indigo-50/50 text-indigo-900'
                                                }`}
                                              >
                                                <option value="">Mapear campo...</option>
                                                {schemaCache[req.target]?.map((col: any) => (
                                                  <option key={col.id} value={col.id}>{col.label} ({col.type})</option>
                                                ))}
                                                {/* Fallback caso a coluna sugerida não esteja no cache ainda */}
                                                {req.default_mapping && !schemaCache[req.target]?.some(c => c.id === req.default_mapping) && (
                                                  <option value={req.default_mapping}>{req.default_mapping} (Sugerido)</option>
                                                )}
                                              </select>
                                            </div>
                                        )
                                      })}

                                      {/* 🌉 PONTES AD HOC (CUSTOM MAPPINGS) */}
                                      <div className="col-span-2 mt-4 pt-4 border-t border-dashed border-gray-100 italic">
                                         <div className="flex items-center justify-between mb-2">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Atributos Ad Hoc (Exclusivos Empresa)</span>
                                            <button 
                                              onClick={() => {
                                                const featureConfig = provisioningData.skillConfigs[feature.id] || {};
                                                const custom = Array.isArray(featureConfig.custom_mappings) ? featureConfig.custom_mappings : [];
                                                const newMapping = { id: Date.now(), label: '', table: '', column: '' };
                                                
                                                setProvisioningData(prev => ({
                                                  ...prev,
                                                  skillConfigs: {
                                                    ...prev.skillConfigs,
                                                    [feature.id]: { 
                                                      ...prev.skillConfigs[feature.id], 
                                                      custom_mappings: [...custom, newMapping]
                                                    }
                                                  }
                                                }));
                                              }}
                                              className="flex items-center px-2 py-1 bg-gray-900 text-white rounded-md text-[7px] font-black uppercase hover:bg-black transition-all"
                                            >
                                              <SquaresPlusIcon className="h-2 w-2 mr-1" /> [+] Adicionar Atributo Extra
                                            </button>
                                         </div>
                                         
                                         <div className="space-y-3">
                                            {(provisioningData.skillConfigs[feature.id]?.custom_mappings || []).map((extra: any, extraIdx: number) => (
                                              <div key={extra.id} className="grid grid-cols-12 gap-2 bg-gray-50/50 p-2 rounded-xl border border-gray-100 relative group/extra">
                                                 <div className="col-span-4">
                                                   <input 
                                                     placeholder="Rótulo (Ex: Débitos)"
                                                     className="w-full bg-white border-transparent focus:ring-1 focus:ring-gray-300 rounded-lg px-2 py-1 text-[9px] font-bold"
                                                     value={extra.label}
                                                     onChange={(e) => {
                                                       const newCustom = [...provisioningData.skillConfigs[feature.id].custom_mappings];
                                                       newCustom[extraIdx].label = e.target.value;
                                                       setProvisioningData(prev => ({
                                                         ...prev,
                                                         skillConfigs: {
                                                           ...prev.skillConfigs,
                                                           [feature.id]: { ...prev.skillConfigs[feature.id], custom_mappings: newCustom }
                                                         }
                                                       }));
                                                     }}
                                                   />
                                                 </div>
                                                 <div className="col-span-4">
                                                   <select 
                                                     className="w-full bg-white border-transparent focus:ring-1 focus:ring-gray-300 rounded-lg px-2 py-1 text-[9px] font-bold appearance-none"
                                                     value={extra.table}
                                                     onChange={(e) => {
                                                       const table = e.target.value;
                                                       const newCustom = [...provisioningData.skillConfigs[feature.id].custom_mappings];
                                                       newCustom[extraIdx].table = table;
                                                       setProvisioningData(prev => ({
                                                         ...prev,
                                                         skillConfigs: {
                                                           ...prev.skillConfigs,
                                                           [feature.id]: { ...prev.skillConfigs[feature.id], custom_mappings: newCustom }
                                                         }
                                                       }));
                                                       if (table) fetchTableSchema(table);
                                                     }}
                                                   >
                                                      <option value="">Tabela...</option>
                                                      {availableTables.map(t => <option key={t} value={t}>{t}</option>)}
                                                   </select>
                                                 </div>
                                                 <div className="col-span-4">
                                                   <select 
                                                     className="w-full bg-white border-transparent focus:ring-1 focus:ring-gray-300 rounded-lg px-2 py-1 text-[9px] font-bold appearance-none"
                                                     value={extra.column}
                                                     onChange={(e) => {
                                                       const newCustom = [...provisioningData.skillConfigs[feature.id].custom_mappings];
                                                       newCustom[extraIdx].column = e.target.value;
                                                       setProvisioningData(prev => ({
                                                         ...prev,
                                                         skillConfigs: {
                                                           ...prev.skillConfigs,
                                                           [feature.id]: { ...prev.skillConfigs[feature.id], custom_mappings: newCustom }
                                                         }
                                                       }));
                                                     }}
                                                   >
                                                      <option value="">Coluna...</option>
                                                      {schemaCache[extra.table]?.map((col: any) => (
                                                        <option key={col.id} value={col.id}>{col.label}</option>
                                                      ))}
                                                   </select>
                                                 </div>
                                                 <button 
                                                   onClick={() => {
                                                     const newCustom = provisioningData.skillConfigs[feature.id].custom_mappings.filter((_:any, i:number) => i !== extraIdx);
                                                     setProvisioningData(prev => ({
                                                       ...prev,
                                                       skillConfigs: {
                                                         ...prev.skillConfigs,
                                                         [feature.id]: { ...prev.skillConfigs[feature.id], custom_mappings: newCustom }
                                                       }
                                                     }));
                                                   }}
                                                   className="absolute -right-1 -top-1 opacity-0 group-hover/extra:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition-all shadow-sm"
                                                 >
                                                   <XMarkIcon className="h-2 w-2" />
                                                 </button>
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {selectedTenant && (
            <div className="mt-6 pt-6 border-t border-gray-100">
               <button
                 onClick={handleSaveProvisioning}
                 disabled={saving}
                 className="w-full py-5 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all flex items-center justify-center disabled:opacity-50"
               >
                 <CheckCircleIcon className="w-5 h-5 mr-2" />
                 {saving ? 'Gravando...' : 'Aplicar Contrato Master'}
               </button>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  </div>
  )
}
