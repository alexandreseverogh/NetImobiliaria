'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  ClockIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type BillingStatus = 'active' | 'past_due' | 'canceled' | 'trialing'

interface ModulePricing {
  moduleId: string
  moduleName: string
  moduleSlug: string
  stripeProductId: string | null
  stripePriceId: string | null
  priceCents: number
  currency: string
  updatedAt: string
}

function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface ModuleRow {
  moduleId: string
  moduleSlug: string
  moduleName: string
  billingStatus: BillingStatus
  stripeSubscriptionItemId: string | null
  isento: boolean
  updatedAt: string
  effectivelyBlocked: boolean
}

interface TenantRow {
  tenantId: string
  tenantName: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  modules: ModuleRow[]
}

const STATUS_LABEL: Record<BillingStatus, string> = {
  active: 'Em dia',
  past_due: 'Inadimplente',
  canceled: 'Cancelado',
  trialing: 'Período de teste',
}

const STATUS_BADGE: Record<BillingStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  past_due: 'bg-red-50 text-red-700 border-red-200',
  canceled: 'bg-gray-100 text-gray-600 border-gray-200',
  trialing: 'bg-blue-50 text-blue-700 border-blue-200',
}

const STATUS_ICON: Record<BillingStatus, typeof CheckCircleIcon> = {
  active: CheckCircleIcon,
  past_due: ExclamationTriangleIcon,
  canceled: NoSymbolIcon,
  trialing: ClockIcon,
}

export default function MasterBillingPage() {
  const { get, patch, post } = useApi()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [modulePricing, setModulePricing] = useState<ModulePricing[]>([])
  const [stripeConfigured, setStripeConfigured] = useState(true)
  const [activatingTenantId, setActivatingTenantId] = useState<string | null>(null)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null)
  const [moduleError, setModuleError] = useState<string | null>(null)

  const loadModulePricing = useCallback(async () => {
    try {
      const res = await get('/api/admin/master/billing/modules')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar valores')
      setModulePricing(data.modules || [])
      setStripeConfigured(data.stripeConfigured !== false)
    } catch (err: any) {
      setModuleError(err.message || 'Erro ao carregar valores por módulo')
    }
  }, [get])

  useEffect(() => { loadModulePricing() }, [loadModulePricing])

  function startEdit(m: ModulePricing) {
    setModuleError(null)
    setEditingModuleId(m.moduleId)
    setEditValue((m.priceCents / 100).toFixed(2).replace('.', ','))
  }

  async function saveEdit(m: ModulePricing) {
    const normalized = editValue.replace(/\./g, '').replace(',', '.')
    const reais = parseFloat(normalized)
    if (!reais || reais <= 0) {
      setModuleError('Valor inválido')
      return
    }
    const priceCents = Math.round(reais * 100)
    setSavingModuleId(m.moduleId)
    setModuleError(null)
    try {
      const res = await patch('/api/admin/master/billing/modules', { moduleId: m.moduleId, priceCents })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      setEditingModuleId(null)
      await loadModulePricing()
    } catch (err: any) {
      setModuleError(err.message || 'Erro ao salvar valor')
    } finally {
      setSavingModuleId(null)
    }
  }

  const load = useCallback(async (issuesOnly: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await get(`/api/admin/master/billing${issuesOnly ? '?onlyIssues=1' : ''}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setTenants(data.tenants || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de cobrança')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => { load(onlyIssues) }, [load, onlyIssues])

  async function handleChangeStatus(tenantId: string, moduleId: string, billingStatus: BillingStatus) {
    const key = `${tenantId}:${moduleId}`
    setSavingKey(key)
    try {
      const res = await patch('/api/admin/master/billing', { tenantId, moduleId, billingStatus })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      await load(onlyIssues)
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status de cobrança')
    } finally {
      setSavingKey(null)
    }
  }

  async function handleActivateBilling(tenantId: string) {
    setActivatingTenantId(tenantId)
    try {
      const res = await post('/api/admin/master/billing/activate', { tenantId })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao ativar cobrança')
      await load(onlyIssues)
    } catch (err: any) {
      alert(err.message || 'Erro ao ativar cobrança')
    } finally {
      setActivatingTenantId(null)
    }
  }

  const totalModules = tenants.reduce((acc, t) => acc + t.modules.length, 0)
  const blockedCount = tenants.reduce(
    (acc, t) => acc + t.modules.filter((m) => m.effectivelyBlocked).length,
    0,
  )
  const pastDueButIsentoCount = tenants.reduce(
    (acc, t) => acc + t.modules.filter((m) => m.billingStatus === 'past_due' && m.isento).length,
    0,
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <BanknotesIcon className="h-8 w-8 mr-3 text-amber-600" />
              Gestão de Cobrança
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Status de billing (Stripe) por tenant × módulo contratado. Marketing Digital,
              Mensageria e CRM são os únicos módulos cobrados — os demais nunca aparecem aqui.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            Mostrar só com pendência
          </label>
        </div>

        {/* Valores por Módulo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-900">Valores por Módulo</h2>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Valor mensal cobrado de cada tenant que contrata o módulo. Editar aqui cria um novo
              Price real na Stripe (o antigo é desativado, nunca apagado — quem já pagava o valor
              anterior continua nele até ser migrado).
            </p>
          </div>
          {!stripeConfigured && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
              STRIPE_SECRET_KEY não configurada neste ambiente — valores exibidos são só leitura.
            </div>
          )}
          {moduleError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
              {moduleError}
            </div>
          )}
          <div className="divide-y divide-gray-50">
            {modulePricing.map((m) => {
              const isEditing = editingModuleId === m.moduleId
              const isSaving = savingModuleId === m.moduleId
              return (
                <div key={m.moduleId} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{m.moduleName}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{m.stripePriceId || 'sem Price ainda'}</p>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-500">R$</span>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        disabled={isSaving}
                        className="w-24 px-3 py-2 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(m)}
                        disabled={isSaving}
                        className="px-3 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => setEditingModuleId(null)}
                        disabled={isSaving}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-gray-900">{formatCentsToBRL(m.priceCents)}</span>
                      <span className="text-xs text-gray-400 font-medium">/mês</span>
                      {stripeConfigured && (
                        <button
                          onClick={() => startEdit(m)}
                          className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Editar valor"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {modulePricing.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm font-medium">Carregando valores...</div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-4 rounded-xl bg-gray-50 mr-5">
              <ShieldCheckIcon className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Módulos contratados</p>
              <p className="text-3xl font-black text-gray-900">{totalModules}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-4 rounded-xl bg-gray-50 mr-5">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Bloqueados agora</p>
              <p className="text-3xl font-black text-gray-900">{blockedCount}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-4 rounded-xl bg-gray-50 mr-5">
              <ShieldCheckIcon className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Inadimplentes isentos</p>
              <p className="text-3xl font-black text-gray-900">{pastDueButIsentoCount}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Tenant</th>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Cobrança</th>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Módulo</th>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Status</th>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Isento</th>
                <th className="text-left px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Efetivo</th>
                <th className="text-right px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Alterar status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">Carregando...</td></tr>
              )}
              {!loading && tenants.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">
                  {onlyIssues ? 'Nenhum tenant com pendência de cobrança.' : 'Nenhum tenant com módulo billável contratado.'}
                </td></tr>
              )}
              {tenants.flatMap((t) =>
                t.modules.map((m, idx) => {
                  const key = `${t.tenantId}:${m.moduleId}`
                  const StatusIcon = STATUS_ICON[m.billingStatus]
                  return (
                    <tr key={key} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {idx === 0 ? t.tenantName : <span className="text-gray-300">{t.tenantName}</span>}
                      </td>
                      <td className="px-6 py-4">
                        {idx !== 0 ? null : t.stripeSubscriptionId ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200"
                            title={t.stripeSubscriptionId}
                          >
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Ativada
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateBilling(t.tenantId)}
                            disabled={activatingTenantId === t.tenantId || !stripeConfigured}
                            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!stripeConfigured ? 'STRIPE_SECRET_KEY não configurada' : 'Cria Customer + Subscription real na Stripe pros módulos já contratados'}
                          >
                            {activatingTenantId === t.tenantId ? 'Ativando...' : 'Ativar Cobrança'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{m.moduleName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[m.billingStatus]}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {STATUS_LABEL[m.billingStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {m.isento ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                            <ShieldCheckIcon className="h-4 w-4" /> Isento
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {m.effectivelyBlocked ? (
                          <span className="text-xs font-bold text-red-600">Bloqueado</span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600">Liberado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={m.billingStatus}
                          disabled={savingKey === key}
                          onChange={(e) => handleChangeStatus(t.tenantId, m.moduleId, e.target.value as BillingStatus)}
                          className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                        >
                          <option value="active">Em dia</option>
                          <option value="past_due">Inadimplente</option>
                          <option value="canceled">Cancelado</option>
                          <option value="trialing">Período de teste</option>
                        </select>
                      </td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-gray-400 font-medium">
          "Isento" vem do cadastro do tenant (isento_marketingdigital/isento_mensageria/isento_crm)
          — enquanto ativo, o módulo nunca é bloqueado por inadimplência, mesmo com status
          "Inadimplente" aqui. "Efetivo" é o que a aplicação de fato aplica: sidebar, API e login
          checam exatamente essa combinação (inadimplente + não isento = bloqueado).
        </p>
      </div>
    </div>
  )
}
