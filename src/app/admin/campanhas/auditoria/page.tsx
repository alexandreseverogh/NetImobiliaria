"use client";
import { useState, useCallback, useEffect } from 'react';
import {
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

// ── Types ─────────────────────────────────────────────────────

interface ScorecardDimension {
  id: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
  status: 'ok' | 'warn' | 'critical';
}

interface AuditProblem {
  rank: number;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  dimensionId: string;
  metric?: string;
}

interface AuditOpportunity {
  rank: number;
  title: string;
  description: string;
  potentialGain: string;
  dimensionId: string;
}

interface ActionItem {
  week: number;
  priority: 'urgent' | 'high' | 'medium';
  action: string;
  owner: string;
}

interface AuditReport {
  id: string;
  period: { start: string; end: string; days: number };
  overallScore: number;
  scorecard: ScorecardDimension[];
  problems: AuditProblem[];
  opportunities: AuditOpportunity[];
  wastedSpend: {
    total: number;
    byCategory: Record<string, number>;
    topCampaigns: Array<{ name: string; amount: number; reason: string }>;
  };
  actionPlan: ActionItem[];
  narrative?: string;
}

interface CampaignOption {
  id: string;
  name: string;
}

// ── Constants ─────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: '7 dias',  value: 7  },
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
];

const IMPACT_COLORS: Record<string, string> = {
  high:   'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low:    'bg-blue-50 border-blue-200 text-blue-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
};

// ── Score Gauge ───────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 45 ? '#d97706' : '#dc2626';
  const pct   = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={140} height={80} viewBox="0 0 140 80">
        <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#e5e7eb" strokeWidth={12} strokeLinecap="round" />
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 188} 188`}
        />
        <text x="70" y="68" textAnchor="middle" fontSize="28" fontWeight="800" fill={color}>{score}</text>
      </svg>
      <p className="text-xs text-gray-500 font-medium">Score Geral /100</p>
    </div>
  );
}

// ── Dimension Bar ─────────────────────────────────────────────

function DimensionBar({ dim }: { dim: ScorecardDimension }) {
  const barColor   = dim.status === 'ok' ? 'bg-green-500' : dim.status === 'warn' ? 'bg-amber-500' : 'bg-red-500';
  const StatusIcon = dim.status === 'ok' ? CheckCircleIcon : dim.status === 'warn' ? MinusCircleIcon : XCircleIcon;
  const iconColor  = dim.status === 'ok' ? 'text-green-500' : dim.status === 'warn' ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex items-start gap-3">
      <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-800">{dim.label}</span>
          <span className="text-sm font-bold text-gray-700">{dim.score}/100</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
          <div className={`h-2 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${dim.score}%` }} />
        </div>
        <p className="text-xs text-gray-500">{dim.detail}</p>
      </div>
    </div>
  );
}

// ── Campaign Selector ─────────────────────────────────────────

function CampaignSelect({
  campaigns,
  value,
  onChange,
}: {
  campaigns: CampaignOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-sm hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
      >
        <option value="">Todas as campanhas</option>
        {campaigns.map(c => (
          <option key={c.id} value={c.id}>{c.name.length > 28 ? c.name.slice(0, 28) + '…' : c.name}</option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [report, setReport]     = useState<AuditReport | null>(null);
  const [loading, setLoading]   = useState(false);
  const [days, setDays]         = useState(30);
  const [withNarr, setWithNarr] = useState(false);
  const [error, setError]       = useState('');

  // Filtro de cliente (toggle: Todas / Minha Empresa / Para um Cliente)
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } =
    useClientSelector('auditoria');
  const clientId = clientFilter === 'all' ? null : clientFilter;

  // Filtro de campanha
  const [campaigns, setCampaigns]         = useState<CampaignOption[]>([]);
  const [campaignFilter, setCampaignFilter] = useState('');

  // Carregar lista de campanhas (filtrada pelo cliente selecionado)
  useEffect(() => {
    const params = new URLSearchParams();
    if (clientFilter && clientFilter !== 'all') params.set('clientId', clientFilter);
    fetch(`/api/admin/campanhas/campaigns?${params}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setCampaigns((Array.isArray(data) ? data : []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => setCampaigns([]));
    // Limpa filtro de campanha ao trocar cliente
    setCampaignFilter('');
  }, [clientFilter]);

  const generate = useCallback(async (
    periodDays: number,
    narrative: boolean,
    cid: string | null,
    campId: string,
  ) => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch('/api/admin/campanhas/auditoria', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          periodDays,
          withNarrative: narrative,
          clientId:      cid,
          campaignId:    campId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar relatório');
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-gera ao trocar período, cliente ou campanha
  useEffect(() => {
    generate(days, false, clientId, campaignFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, clientFilter, campaignFilter]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const fmtCur  = (n: number) =>
    `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="w-full">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="mb-6">
          {/* Título */}
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600" />
            Auditoria de Campanhas
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Relatório estruturado com scorecard, problemas, oportunidades e plano de ação
          </p>
        </div>

        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col gap-3">

            {/* Linha 1: Toggle de contexto (Todas / Minha Empresa / Para um Cliente) */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Contexto
              </p>
              <ClientSelector
                value={clientFilter}
                onChange={setClientFilter}
                clients={clients}
                loading={clientsLoading}
                storageKey="auditoria"
                variant="toggle"
              />
            </div>

            {/* Linha 2: Campanha + Período */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Campanha */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campanha</p>
                <CampaignSelect
                  campaigns={campaigns}
                  value={campaignFilter}
                  onChange={setCampaignFilter}
                />
              </div>

              {/* Período */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Período</p>
                <div className="flex items-center gap-1 bg-gray-50 rounded-xl border border-gray-200 p-1">
                  {PERIOD_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setDays(o.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        days === o.value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Narrativa + Atualizar — push para a direita */}
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={withNarr}
                    onChange={e => setWithNarr(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <SparklesIcon className="h-3.5 w-3.5 text-purple-500" />
                  Narrativa LLM
                </label>
                <button
                  onClick={() => generate(days, withNarr, clientId, campaignFilter)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
                >
                  {loading
                    ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Gerando...</>
                    : <><ArrowPathIcon className="h-4 w-4" /> Atualizar</>
                  }
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-20">
            <div className="h-8 w-8 mx-auto mb-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-base font-semibold text-gray-600">
              Analisando campanhas dos últimos {days} dias…
            </p>
            <p className="text-sm mt-1 text-gray-400">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* ── Report ───────────────────────────────────────────── */}
        {report && !loading && (
          <div className="space-y-6">

            {/* Period badge */}
            <div className="text-xs text-gray-500 font-medium text-center">
              Período: <strong>{fmtDate(report.period.start)}</strong> a <strong>{fmtDate(report.period.end)}</strong>
              {' '}· {report.period.days} dias
              {campaignFilter && campaigns.find(c => c.id === campaignFilter) && (
                <> · <span className="text-indigo-600">{campaigns.find(c => c.id === campaignFilter)?.name}</span></>
              )}
            </div>

            {/* Score + Scorecard */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Gauge */}
                <div className="flex flex-col items-center gap-2 md:w-44 shrink-0">
                  <ScoreGauge score={report.overallScore} />
                  <p className={`text-xs font-bold px-3 py-1 rounded-full ${
                    report.overallScore >= 70 ? 'bg-green-100 text-green-700'
                    : report.overallScore >= 45 ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {report.overallScore >= 70 ? 'Saudável' : report.overallScore >= 45 ? 'Atenção' : 'Crítico'}
                  </p>
                </div>
                {/* Dimensions */}
                <div className="flex-1 space-y-3">
                  <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3">Scorecard por Dimensão</h2>
                  {report.scorecard.map(dim => (
                    <DimensionBar key={dim.id} dim={dim} />
                  ))}
                </div>
              </div>
            </div>

            {/* Problems + Opportunities */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Problems */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  Top Problemas
                </h2>
                <div className="space-y-3">
                  {report.problems.map(p => (
                    <div key={p.rank} className={`rounded-xl border p-3 ${IMPACT_COLORS[p.impact]}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-black">#{p.rank} {p.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          p.impact === 'high'   ? 'bg-red-200 text-red-800'
                          : p.impact === 'medium' ? 'bg-amber-200 text-amber-800'
                          : 'bg-blue-200 text-blue-800'
                        }`}>
                          {p.impact === 'high' ? 'Alta' : p.impact === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed">{p.description}</p>
                      {p.metric && <p className="text-xs font-bold mt-1.5 opacity-90">📊 {p.metric}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <LightBulbIcon className="h-4 w-4 text-green-500" />
                  Oportunidades
                </h2>
                <div className="space-y-3">
                  {report.opportunities.map(o => (
                    <div key={o.rank} className="rounded-xl border border-green-200 bg-green-50 p-3">
                      <div className="text-xs font-black text-green-800 mb-1">#{o.rank} {o.title}</div>
                      <p className="text-xs text-green-700 opacity-85 leading-relaxed mb-1.5">{o.description}</p>
                      <p className="text-xs font-bold text-green-800">✨ {o.potentialGain}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Wasted Spend */}
            {report.wastedSpend.total > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">💸 Desperdício Consolidado</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-3xl font-black text-red-600">{fmtCur(report.wastedSpend.total)}</div>
                  <div className="text-xs text-gray-500">total estimado<br />no período</div>
                </div>
                {Object.entries(report.wastedSpend.byCategory).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(report.wastedSpend.byCategory)
                      .filter(([, v]) => v > 0)
                      .map(([key, val]) => (
                        <span key={key} className="text-xs bg-red-50 border border-red-100 text-red-700 rounded-lg px-2.5 py-1 font-medium">
                          {key.replace(/_/g, ' ')}: {fmtCur(val)}
                        </span>
                      ))}
                  </div>
                )}
                {report.wastedSpend.topCampaigns.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Campanhas com maior desperdício:</p>
                    {report.wastedSpend.topCampaigns.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.reason}</p>
                        </div>
                        <span className="text-sm font-black text-red-600 shrink-0">{fmtCur(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Plan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">🗓️ Plano de Ação</h2>
              <div className="space-y-2">
                {report.actionPlan.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="shrink-0 text-center">
                      <div className="text-[10px] font-black text-gray-400 uppercase">Sem</div>
                      <div className="text-lg font-black text-gray-700">{item.week}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PRIORITY_COLORS[item.priority]}`}>
                          {item.priority === 'urgent' ? 'Urgente' : item.priority === 'high' ? 'Alta' : 'Média'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">→ {item.owner}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LLM Narrative */}
            {report.narrative && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-6">
                <h2 className="text-sm font-black text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4" />
                  Diagnóstico Executivo — IA
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{report.narrative}</p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
