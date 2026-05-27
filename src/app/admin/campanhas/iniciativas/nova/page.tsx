"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

interface Client {
  uuid: string;
  nome: string;
}

const STEPS = ['Dados', 'Orçamento & Período', 'Campanhas', 'Revisão'] as const;

const KPI_OPTIONS = [
  'Leads', 'CPL', 'CTR', 'Conversões', 'Impressões', 'ROAS', 'Vendas',
];

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
const labelCls = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2";

export default function NovaIniciativaPage() {
  const router = useRouter();

  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [goalDescription, setGoalDesc]= useState('');
  const [clientId, setClientId]       = useState('');

  const [budget, setBudget]               = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [primaryKpi, setPrimaryKpi]       = useState('Leads');
  const [primaryKpiTarget, setPrimaryTarget] = useState('');

  const [availableCampaigns, setAvailable] = useState<Campaign[]>([]);
  const [selectedIds, setSelectedIds]      = useState<Set<string>>(new Set());
  const [loadingCampaigns, setLoadingCamp] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch('/api/admin/clientes?limit=200')
      .then(r => r.ok ? r.json() : { clientes: [] })
      .then((d: { clientes?: Client[] }) => setClients(d.clientes ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 2) {
      setLoadingCamp(true);
      fetch('/api/admin/campanhas/campaigns')
        .then(r => r.ok ? r.json() : [])
        .then(d => setAvailable(Array.isArray(d) ? d : (d.campaigns ?? d.items ?? [])))
        .catch(() => {})
        .finally(() => setLoadingCamp(false));
    }
  }, [step]);

  function toggleCampaign(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function canAdvance() {
    if (step === 0) return name.trim().length >= 2;
    return true;
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/campanhas/iniciativas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:               name.trim(),
          description:        description || null,
          goalDescription:    goalDescription || null,
          clientId:           clientId || null,
          totalBudgetPlanned: budget ? Number(budget) : null,
          startDate:          startDate || null,
          endDate:            endDate   || null,
          primaryKpi:         primaryKpi || null,
          primaryKpiTarget:   primaryKpiTarget ? Number(primaryKpiTarget) : null,
          status:             'PLANNED',
          campaignIds:        Array.from(selectedIds),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Erro ao criar iniciativa');
        return;
      }
      const created = await res.json();
      router.push(`/admin/campanhas/iniciativas/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Iniciativas</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Nova Iniciativa</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Agrupe campanhas sob um objetivo estratégico</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  i < step  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' :
                  i === step ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-md' :
                               'bg-white border-2 border-gray-200 text-gray-400'
                }`}>
                  {i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-black hidden sm:block uppercase tracking-wide ${
                  i <= step ? 'text-gray-900' : 'text-gray-400'
                }`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded-full ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          {/* Step 0 */}
          {step === 0 && (
            <>
              <div>
                <label className={labelCls}>Nome da Iniciativa *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Ex: Lançamento Empreendimento X — Q3 2026"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Objetivo estratégico</label>
                <input value={goalDescription} onChange={e => setGoalDesc(e.target.value)}
                  placeholder="Ex: Gerar 200 leads qualificados para o lançamento"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} placeholder="Descrição detalhada da iniciativa..."
                  className={`${inputCls} resize-none`} />
              </div>
              {clients.length > 0 && (
                <div>
                  <label className={labelCls}>Cliente (opcional)</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className={selectCls}>
                    <option value="">Sem cliente específico</option>
                    {clients.map(c => <option key={c.uuid} value={c.uuid}>{c.nome}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data de início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data de fim</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Budget total planejado (R$)</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="Ex: 15000" min={0} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>KPI Principal</label>
                  <select value={primaryKpi} onChange={e => setPrimaryKpi(e.target.value)} className={selectCls}>
                    {KPI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Meta do KPI</label>
                  <input type="number" value={primaryKpiTarget} onChange={e => setPrimaryTarget(e.target.value)}
                    placeholder="Ex: 200" min={0} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Selecione campanhas existentes para vincular a esta iniciativa (opcional — você pode vincular depois).
              </p>
              {loadingCampaigns ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                </div>
              ) : availableCampaigns.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhuma campanha disponível para vincular.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {availableCampaigns.map(c => (
                    <label key={c.id} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${
                      selectedIds.has(c.id)
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-100 hover:border-indigo-200'
                    }`}>
                      <input type="checkbox" checked={selectedIds.has(c.id)}
                        onChange={() => toggleCampaign(c.id)}
                        className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.objective} · {c.status}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs font-bold text-indigo-600 mt-3">{selectedIds.size} selecionada(s)</p>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confirme os dados antes de criar</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nome', value: name },
                  { label: 'Status inicial', value: 'Planejada' },
                  { label: 'Budget', value: budget ? `R$ ${Number(budget).toLocaleString('pt-BR')}` : '—' },
                  { label: 'Período', value: `${startDate || '—'} → ${endDate || '—'}` },
                  { label: 'KPI / Meta', value: `${primaryKpi}${primaryKpiTarget ? ` → ${primaryKpiTarget}` : ''}` },
                  { label: 'Campanhas vinculadas', value: String(selectedIds.size) },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              {goalDescription && (
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Objetivo</p>
                  <p className="text-sm font-medium text-gray-700">{goalDescription}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
            className="px-5 py-2.5 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
          >
            {step === 0 ? 'Cancelar' : '← Voltar'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}
              className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
              Avançar →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20">
              {saving ? 'Criando...' : '✓ Criar Iniciativa'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
