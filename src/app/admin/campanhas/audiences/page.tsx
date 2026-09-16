"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  UserGroupIcon, SparklesIcon, ArrowPathIcon, PlusIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector';

interface TenantAudience {
  id: string;
  clientId: string | null;
  kind: 'custom' | 'lookalike';
  externalId: string | null;
  name: string;
  memberCountUploaded: number;
  approximateCount: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

const MIN_SEED_MEMBERS = 100;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  CREATING:   { label: 'Criando…',     cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  UPLOADING:  { label: 'Enviando…',    cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  PROCESSING: { label: 'Processando',  cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  READY:      { label: 'Pronta',       cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  FAILED:     { label: 'Falhou',       cls: 'bg-red-50 text-red-600 border-red-100' },
};

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<TenantAudience[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [audienceName, setAudienceName] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lookalikeRatio, setLookalikeRatio] = useState<Record<string, string>>({});

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('audiences');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientFilter !== 'all') params.set('clientId', clientFilter);
      const res = await fetch(`/api/admin/campanhas/audiences?${params}`);
      const data = await res.json();
      if (res.ok) {
        setAudiences(data.audiences || []);
        setEligibleCount(data.eligibleCount || 0);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [clientFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!audienceName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/campanhas/audiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientFilter !== 'all' ? clientFilter : 'own',
          name: audienceName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar audiência');
      setAudienceName('');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRefresh(id: string) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/campanhas/audiences/${id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar status');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateLookalike(originId: string) {
    setBusyId(originId);
    setError('');
    try {
      const ratio = parseFloat(lookalikeRatio[originId] || '1') / 100;
      const res = await fetch(`/api/admin/campanhas/audiences/${originId}/lookalike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'BR', ratio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar Lookalike');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const canCreate = eligibleCount >= MIN_SEED_MEMBERS;

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="w-full max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Audiências (Lookalike / Custom)</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Cria uma Custom Audience real na Meta a partir dos negócios fechados no CRM, e a partir dela
              uma audiência Lookalike — pra achar mais gente parecida com quem já comprou de verdade.
            </p>
          </div>
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="audiences"
            variant="toggle"
          />
        </div>

        {/* Pendência real — nenhuma conta Meta de teste disponível ainda */}
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Pendência real:</strong> as chamadas contra a API real da Meta (criar audiência, enviar
            membros, gerar Lookalike, consultar status) ainda não foram testadas ponta a ponta com uma
            conta de anúncio de verdade — nenhuma está disponível nesta plataforma até o momento. Tudo o
            que aparece nesta tela funciona com dado real do CRM e valida a amostra antes de tentar; a
            confirmação com a Meta de verdade fica pendente até haver uma conta de teste.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Card de criação */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <UserGroupIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="font-black text-gray-900">Criar Custom Audience</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Semente = todo lead com negócio fechado real no Kanban (etapa de Ganho) e e-mail ou
            telefone cadastrado. A Meta exige pelo menos <strong>{MIN_SEED_MEMBERS} membros</strong> na
            semente pra permitir gerar uma Lookalike depois.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-2xl font-black ${canCreate ? 'text-emerald-600' : 'text-gray-400'}`}>
              {loading ? '…' : eligibleCount}
            </span>
            <span className="text-sm text-gray-500">
              lead(s) elegível(is) neste escopo
              {!loading && !canCreate && ` — faltam ${MIN_SEED_MEMBERS - eligibleCount} pra atingir o mínimo`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={audienceName}
              onChange={(e) => setAudienceName(e.target.value)}
              placeholder="Nome da audiência (ex: Clientes Reais - Setembro/2026)"
              disabled={!canCreate}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating || !audienceName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:bg-gray-200 disabled:text-gray-400 hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              {creating ? 'Criando…' : 'Criar'}
            </button>
          </div>
        </div>

        {/* Lista de audiências */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-black text-gray-900">Audiências deste escopo</h2>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-400">Carregando…</div>
          ) : audiences.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">Nenhuma audiência criada ainda neste escopo.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {audiences.map((a) => {
                const meta = STATUS_META[a.status] || { label: a.status, cls: 'bg-gray-50 text-gray-600 border-gray-100' };
                const canLookalike = a.kind === 'custom' && a.memberCountUploaded >= MIN_SEED_MEMBERS;
                return (
                  <div key={a.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{a.name}</span>
                          <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                            {a.kind === 'lookalike' ? 'Lookalike' : 'Custom'}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {a.memberCountUploaded > 0 && `${a.memberCountUploaded} membro(s) enviado(s) · `}
                          {a.approximateCount != null && `~${a.approximateCount} na Meta · `}
                          {a.externalId ? `ID Meta: ${a.externalId}` : 'ainda sem ID real na Meta'}
                        </p>
                        {a.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{a.errorMessage}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.externalId && (
                          <button
                            onClick={() => handleRefresh(a.id)}
                            disabled={busyId === a.id}
                            title="Consultar status real na Meta"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <ArrowPathIcon className={`h-3.5 w-3.5 ${busyId === a.id ? 'animate-spin' : ''}`} />
                            Atualizar status
                          </button>
                        )}
                        {canLookalike && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number" min={1} max={20} step={1}
                              value={lookalikeRatio[a.id] ?? '1'}
                              onChange={(e) => setLookalikeRatio((p) => ({ ...p, [a.id]: e.target.value }))}
                              className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-center"
                            />
                            <span className="text-xs text-gray-400">%</span>
                            <button
                              onClick={() => handleCreateLookalike(a.id)}
                              disabled={busyId === a.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 disabled:opacity-50"
                            >
                              <SparklesIcon className="h-3.5 w-3.5" />
                              Criar Lookalike
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
