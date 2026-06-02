"use client";
import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/marketing-utils';
import {
  ExclamationTriangleIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

interface WastedCampaign {
  id: string; name: string; wasted: number; details: string;
}
interface WastedCategory {
  amount: number; campaigns: WastedCampaign[]; explanation: string;
}
interface WastedReport {
  totalWasted: number;
  period: { start: string; end: string };
  byCategory: {
    ZERO_LEADS_SPEND:  WastedCategory;
    HIGH_CPL_SPEND:    WastedCategory;
    FATIGUED_CONTINUE: WastedCategory;
    LEARNING_LIMITED:  WastedCategory;
  };
  recoveryPlan: string[];
}

const CATEGORY_META: Record<string, { label: string; icon: string; accent: string; bg: string; border: string }> = {
  ZERO_LEADS_SPEND:  { label: 'Sem Leads',           icon: '💸', accent: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
  HIGH_CPL_SPEND:    { label: 'CPL Crítico',          icon: '📉', accent: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  FATIGUED_CONTINUE: { label: 'Fadiga de Audiência',  icon: '😴', accent: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  LEARNING_LIMITED:  { label: 'Aprendizado Limitado', icon: '🔄', accent: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
};

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 }, { label: '15 dias', value: 15 },
  { label: '30 dias', value: 30 }, { label: '60 dias', value: 60 }, { label: '90 dias', value: 90 },
];

export default function DesperdicioPage() {
  const [report, setReport]       = useState<WastedReport | null>(null);
  const [loading, setLoading]     = useState(true);
  const [days, setDays]           = useState(30);
  const [narrativa, setNarrativa] = useState('');
  const [genNarr, setGenNarr]     = useState(false);
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});

  // Seletor Minha Empresa / Para um Cliente — padrão 'own'
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('desperdicio');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (clientFilter !== 'all') params.set('clientId', clientFilter);
      const res  = await fetch(`/api/admin/campanhas/desperdicio?${params}`);
      const data = await res.json();
      if (res.ok) setReport(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [days, clientFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerateNarrativa() {
    setGenNarr(true);
    setNarrativa('');
    try {
      const res  = await fetch('/api/admin/campanhas/desperdicio/narrativa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, clientId: clientFilter !== 'all' ? clientFilter : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNarrativa(data.content);
    } catch (err: any) {
      setNarrativa(`Erro: ${err.message}`);
    } finally { setGenNarr(false); }
  }

  function toggleCategory(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const topWasted = report
    ? Object.values(report.byCategory)
        .flatMap(c => c.campaigns)
        .sort((a, b) => b.wasted - a.wasted)
        .slice(0, 5)
    : [];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Desperdício de Verba</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Identifica e quantifica verba gasta sem retorno adequado</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor Minha Empresa / Para um Cliente */}
            <ClientSelector
              value={clientFilter}
              onChange={setClientFilter}
              clients={clients}
              loading={clientsLoading}
              storageKey="desperdicio"
              variant="toggle"
            />
            {/* Period selector */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              {PERIOD_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setDays(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    days === o.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Calculando desperdícios...</p>
            </div>
          </div>
        ) : !report ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-16 text-center">
            <ExclamationTriangleIcon className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-black text-red-600">Erro ao carregar dados</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Total destaque */}
            <div className={`bg-white rounded-2xl border shadow-sm p-6 ${report.totalWasted > 0 ? 'border-red-100' : 'border-emerald-100'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total identificado como desperdício</p>
                  <p className={`text-5xl font-black tracking-tight ${report.totalWasted > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(report.totalWasted)}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">nos últimos {days} dias</p>
                </div>
                {report.totalWasted > 0 && (
                  <div className="flex flex-col gap-2">
                    {(Object.entries(report.byCategory) as [string, WastedCategory][])
                      .filter(([, c]) => c.amount > 0)
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .slice(0, 3)
                      .map(([key, cat]) => {
                        const meta = CATEGORY_META[key];
                        return (
                          <div key={key} className={`flex items-center gap-3 px-4 py-2 rounded-xl ${meta.bg} border ${meta.border}`}>
                            <span className="text-sm">{meta.icon}</span>
                            <span className={`text-[10px] font-black uppercase tracking-wide ${meta.accent}`}>{meta.label}</span>
                            <span className={`text-sm font-black ml-2 ${meta.accent}`}>{formatCurrency(cat.amount)}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-3">
              {(Object.entries(report.byCategory) as [string, WastedCategory][]).map(([key, cat]) => {
                const meta   = CATEGORY_META[key];
                const isOpen = expanded[key] ?? false;
                return (
                  <div key={key} className={`bg-white rounded-2xl border ${meta.border} shadow-sm overflow-hidden`}>
                    <button onClick={() => toggleCategory(key)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${meta.bg}`}>
                          <span className="text-xl leading-none">{meta.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{meta.label}</p>
                          <p className={`text-xs mt-0.5 ${cat.amount > 0 ? 'text-gray-500' : 'text-gray-400'}`}>{cat.explanation}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className={`text-lg font-black ${cat.amount > 0 ? meta.accent : 'text-gray-300'}`}>
                            {formatCurrency(cat.amount)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">{cat.campaigns.length} campanha(s)</p>
                        </div>
                        {isOpen
                          ? <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-50 px-5 py-4">
                        {cat.campaigns.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhuma campanha nesta categoria.</p>
                        ) : (
                          <div className="space-y-2">
                            {cat.campaigns.sort((a, b) => b.wasted - a.wasted).map(c => (
                              <div key={c.id} className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{c.details}</p>
                                </div>
                                <p className="text-sm font-black text-red-600 shrink-0">{formatCurrency(c.wasted)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recovery plan */}
              {report.recoveryPlan.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-black text-gray-900 mb-4">Plano de Recuperação</h2>
                  <ul className="space-y-2.5">
                    {report.recoveryPlan.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <span className="text-indigo-500 font-black mt-0.5 shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top wasted */}
              {topWasted.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-black text-gray-900 mb-4">Top Campanhas com Desperdício</h2>
                  <div className="space-y-3">
                    {topWasted.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-300 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.details}</p>
                        </div>
                        <p className="text-sm font-black text-red-600 shrink-0">{formatCurrency(c.wasted)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Narrative */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-50 rounded-xl">
                    <SparklesIcon className="h-4 w-4 text-violet-600" />
                  </div>
                  <h2 className="text-sm font-black text-gray-900">Análise Executiva com IA</h2>
                </div>
                <ExecuteGuard resource="desperdicio-campanhas">
                  <button onClick={handleGenerateNarrativa} disabled={genNarr}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
                    {genNarr
                      ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                      : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar com IA</>}
                  </button>
                </ExecuteGuard>
              </div>
              {narrativa ? (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-medium">{narrativa}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Clique em "Gerar com IA" para obter uma análise executiva com recomendações prioritárias.
                </p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
