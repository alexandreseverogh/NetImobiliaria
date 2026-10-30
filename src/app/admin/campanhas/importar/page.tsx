'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, LockClosedIcon,
  LinkIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector';
import {
  getImportableCampaigns, importCampaign, getManualRef, generateManualRef,
  type ExternalCampaign,
} from '@/lib/marketing-api';
import { ManualRefInstructions } from '@/components/marketing/ManualRefInstructions';

const OBJECTIVE_LABEL: Record<string, string> = {
  OUTCOME_LEADS: 'Geração de Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_APP_PROMOTION: 'Promoção de App',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
  DELETED: 'bg-red-50 text-red-600 border-red-200',
};

export default function ImportarCampanhasPage() {
  const router = useRouter();
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('importar');

  const [network, setNetwork]       = useState<'meta'>('meta');
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [campaigns, setCampaigns]   = useState<ExternalCampaign[]>([]);
  const [error, setError]           = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  // externalId → id local da Campaign — alimentado tanto por quem já veio marcado
  // alreadyImported (localCampaignId da listagem) quanto pelo import feito nesta própria sessão.
  const [importedNow, setImportedNow] = useState<Map<string, string>>(new Map());

  async function handleSearch() {
    setLoading(true);
    setError('');
    try {
      const data = await getImportableCampaigns({ network });
      if (data.error) setError(data.error);
      setCampaigns(data.campaigns || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao buscar campanhas.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  async function handleImport(c: ExternalCampaign) {
    setImportingId(c.externalId);
    try {
      const { campaign } = await importCampaign({
        network,
        externalId: c.externalId,
        name: c.name,
        objective: c.objective || undefined,
        status: c.status,
        clientId: clientFilter,
        importedReadOnly: true,
      });
      setImportedNow(prev => new Map(prev).set(c.externalId, campaign.id));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao importar campanha.');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar
        </button>

        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Importar Campanhas Existentes</h1>
        <p className="text-gray-500 mt-1 text-sm font-medium mb-8">
          Campanhas lançadas direto no Gerenciador de Anúncios do Meta (fora desta aplicação) podem
          ser trazidas aqui pra análise — orçamento, leads, CPL, funil — sem depender de terem sido
          criadas pelo nosso assistente.
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-gray-900 uppercase tracking-wider mb-1">Atribuir a</p>
              <ClientSelector
                value={clientFilter}
                onChange={setClientFilter}
                clients={clients}
                loading={clientsLoading}
                variant="toggle"
                allowSegment={false}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Buscando...' : 'Buscar campanhas no Meta'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5">
            <LockClosedIcon className="h-3.5 w-3.5" />
            Toda campanha importada entra como <strong className="text-gray-600">somente leitura</strong> —
            o Agente Decisor nunca pausa, escala nem altera orçamento dela automaticamente.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {searched && !loading && campaigns.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nenhuma campanha encontrada nesta conta de anúncios.
          </div>
        )}

        {campaigns.length > 0 && (
          <div className="space-y-3">
            {campaigns.map(c => {
              const localCampaignId = c.localCampaignId || importedNow.get(c.externalId) || null;
              const done = c.alreadyImported || !!localCampaignId;
              const busy = importingId === c.externalId;
              return (
                <div
                  key={c.externalId}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-gray-900 truncate">{c.name}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.objective ? (OBJECTIVE_LABEL[c.objective] || c.objective) : 'Objetivo não informado'}
                        {c.createdTime && ` · criada em ${new Date(c.createdTime).toLocaleDateString('pt-BR')}`}
                        {' · '}ID {c.externalId}
                      </p>
                    </div>
                    {done ? (
                      <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 shrink-0">
                        <CheckCircleIcon className="h-4 w-4" /> Importada
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImport(c)}
                        disabled={busy}
                        className="shrink-0 px-4 py-2 bg-navy-dark text-white text-xs font-black uppercase tracking-wide rounded-lg hover:bg-gold-premium hover:text-navy-dark transition-colors disabled:opacity-50"
                      >
                        {busy ? 'Importando...' : 'Importar (somente leitura)'}
                      </button>
                    )}
                  </div>

                  {localCampaignId && <ManualRefControl campaignId={localCampaignId} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Código de rastreio manual (Sistema C) — docs/PLANO_REF_MANUAL_CAMPANHA_IMPORTADA.md ──────

function ManualRefControl({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manualRef, setManualRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getManualRef(campaignId)
      .then(d => { if (!cancelled) setManualRef(d.manualRef); })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar o código.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  async function handleGenerate(regenerate: boolean) {
    if (regenerate && !window.confirm(
      'Gerar um código novo torna o código atual inválido — mensagens que chegarem usando o código antigo deixam de ser atribuídas a esta campanha. Continuar?'
    )) return;
    setBusy(true); setError('');
    try {
      const d = await generateManualRef(campaignId, regenerate);
      setManualRef(d.manualRef);
      setShowHelp(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao gerar código.');
    } finally { setBusy(false); }
  }

  async function handleCopy() {
    if (!manualRef) return;
    try {
      await navigator.clipboard.writeText(`[ref:${manualRef}]`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard indisponível — sem fallback, usuário seleciona o texto manualmente */ }
  }

  if (loading) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      {!manualRef ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {busy ? 'Gerando...' : 'Gerar código de rastreio'}
          </button>
          <span className="text-[11px] text-gray-400">
            Pra esta campanha gerar leads/conversas no CRM e Mensageria
          </span>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              [ref:{manualRef}]
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              {copied ? <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={busy}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {busy ? 'Regenerando...' : 'Regenerar'}
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(v => !v)}
              className="flex items-center gap-1 ml-auto text-[11px] font-bold text-blue-700 hover:underline"
            >
              Como colar isso no anúncio
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showHelp && <ManualRefInstructions showMecanismosLink />}
        </div>
      )}
      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
    </div>
  );
}

