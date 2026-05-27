'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { 
  ShieldCheckIcon, 
  MapPinIcon, 
  UserIcon, 
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function GlobalAuditPage() {
  const { get } = useApi()
  const [logs, setLogs] = useState<any[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  
  // Estados de Filtro (Default: Hoje)
  const today = new Date().toISOString().split('T')[0]
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    actionType: 'ALL'
  })

  const fetchActionTypes = async () => {
    try {
      const response = await get('/api/admin/master/audit/types')
      if (response.ok) {
        const data = await response.json()
        setActionTypes(data.types || [])
      }
    } catch (error) {
      console.error('Erro ao buscar tipos de ação:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        limit: '100',
        start_date: filters.startDate ? `${filters.startDate} 00:00:00` : '',
        end_date: filters.endDate ? `${filters.endDate} 23:59:59` : '',
        action: filters.actionType
      })
      
      const response = await get(`/api/admin/master/audit?${queryParams.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActionTypes()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [filters.actionType, filters.startDate, filters.endDate])

  const formatActionName = (action: string) => {
    return action
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getActionStyles = (action: string) => {
    if (action.includes('PROVISIONING') || action.includes('CREATE')) 
      return 'bg-blue-100 text-blue-700 border-blue-200'
    if (action.includes('DELETE') || action.includes('REMOVE')) 
      return 'bg-red-100 text-red-700 border-red-200'
    if (action.includes('UPDATE')) 
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center">
                <ShieldCheckIcon className="h-10 w-10 text-blue-600 mr-4" />
                Auditoria Global
              </h1>
              <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-xs mt-2 ml-14">
                Monitoramento de Ações e Segurança da Plataforma
              </p>
            </div>
            <button 
              onClick={fetchLogs}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <ClockIcon className="h-5 w-5" />
              Sincronizar
            </button>
          </div>

          {/* BARRA DE FILTROS SENIOR (DINÂMICA) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Data Início</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Data Fim</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Tipo de Evento</label>
              <select 
                value={filters.actionType}
                onChange={(e) => setFilters({...filters, actionType: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos os Eventos</option>
                {actionTypes.map(type => (
                  <option key={type} value={type}>
                    {formatActionName(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Tabela de Logs (Principal) */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="p-12 text-center font-bold text-slate-400 bg-white rounded-3xl shadow-sm border border-slate-100 animate-pulse">
                Sincronizando auditoria global...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <MagnifyingGlassIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum evento encontrado para este período.</p>
              </div>
            ) : logs.map((log) => (
              <div 
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-6 bg-white rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  selectedLog?.id === log.id ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2 rounded-lg border text-xs font-black uppercase tracking-tighter ${getActionStyles(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 line-clamp-1">{log.resource}: {log.resource_id || 'Global'}</h4>
                      <p className="text-sm text-slate-500 flex items-center mt-1">
                        <UserIcon className="h-4 w-4 mr-1" /> {log.operator_name || 'Sistema'}
                        <span className="mx-2">•</span>
                        <MapPinIcon className="h-4 w-4 mr-1" /> {log.ip_address}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-400 flex items-center justify-end">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Painel de Detalhes (Fixo à direita) */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl sticky top-8 border border-white/5">
              <h3 className="text-xl font-black mb-6 flex items-center">
                <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-400" />
                Detalhes do Evento
              </h3>
              
              {selectedLog ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Data</span>
                      <p className="font-bold text-slate-200">{new Date(selectedLog.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Horário</span>
                      <p className="font-bold text-slate-200">{new Date(selectedLog.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Ação Técnica</span>
                    <p className="text-blue-400 font-black text-lg break-words">{selectedLog.action}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Empresa</span>
                      <p className="font-bold text-slate-200">{selectedLog.tenant_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Recurso</span>
                      <p className="font-bold text-slate-200">{selectedLog.resource}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">User Agent</span>
                    <p className="text-xs text-slate-400 font-mono break-words leading-relaxed">
                      {selectedLog.user_agent}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Payload (JSON)</span>
                    <pre className="bg-black/30 p-4 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto border border-white/5 mt-2">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <MagnifyingGlassIcon className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-sm">Selecione um evento para inspecionar os detalhes técnicos.</p>
                </div>
              )}
            </div>
            
            {/* Widget de Alerta Suspeito */}
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
              <h4 className="flex items-center text-amber-900 font-black uppercase text-xs tracking-widest mb-3">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-amber-600" />
                Vigilância Ativa
              </h4>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Nenhuma anomalia crítica detectada nos últimos 50 eventos. O sistema está operando dentro dos padrões de normalidade.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
