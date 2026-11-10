'use client';

/**
 * Simulação de campanha — FERRAMENTA DE TESTE do Master.
 * Não aparece no menu nem no provisionamento. Acesso direto: /admin/master/simulacao-campanhas.
 * A API correspondente recusa qualquer usuário que não seja Master e responde 404 em produção.
 */
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';

const DEFAULT_TENANT_ID = '8c4de2ba-c41c-4353-9b38-491a9ce3e0cd'; // Artemis9 - Testes

type Ad = {
  id: string;
  name: string;
  trackingId: string | null;
  ctaType: string;
  linkUrl: string | null;
  campaignName: string;
};

type LogEntry = { at: string; title: string; body: string; ok: boolean };

export default function SimulacaoCampanhasPage() {
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phone, setPhone] = useState('5581999990000');
  const [replyText, setReplyText] = useState('Oi, quero saber mais sobre este imóvel');
  const [selectedTracking, setSelectedTracking] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const push = (entry: Omit<LogEntry, 'at'>) =>
    setLog((prev) => [{ at: new Date().toLocaleTimeString('pt-BR'), ...entry }, ...prev].slice(0, 50));

  const loadAds = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch(`/api/admin/master/simulacao-campanhas?tenantId=${encodeURIComponent(tenantId)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
      const list: Ad[] = body.ads || [];
      setAds(list);
      const first = list.find((a) => a.trackingId);
      if (first && !selectedTracking) setSelectedTracking(first.trackingId as string);
    } catch (e: any) {
      setError(e.message);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulateClick = async (ad: Ad) => {
    if (!ad.trackingId) return;
    setBusy(true);
    try {
      const res = await adminFetch('/api/admin/master/simulacao-campanhas', {
        method: 'POST',
        body: JSON.stringify({ action: 'click', trackingId: ad.trackingId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
      push({ ok: true, title: `Clique — ${ad.name}`, body: `${body.eventType} · ${body.message}` });
    } catch (e: any) {
      push({ ok: false, title: `Clique — ${ad.name}`, body: e.message });
    } finally {
      setBusy(false);
    }
  };

  const simulateReply = async () => {
    if (!selectedTracking) return;
    setBusy(true);
    try {
      const res = await adminFetch('/api/admin/master/simulacao-campanhas', {
        method: 'POST',
        body: JSON.stringify({ action: 'reply', trackingId: selectedTracking, phone, text: replyText }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
      push({
        ok: true,
        title: `Resposta — ${phone}`,
        body: `Lead: ${body.leadUuid ?? 'não criado'} · Conversa: ${body.mensageriaConversationId ?? 'não criada'}`,
      });
    } catch (e: any) {
      push({ ok: false, title: `Resposta — ${phone}`, body: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Ferramenta de teste · Master</p>
        <h1 className="text-2xl font-black text-gray-900">Simulação de campanha</h1>
        <p className="text-sm text-gray-500 mt-1">
          Simula o clique em um anúncio e a resposta do WhatsApp, sem falar com a Meta. Os dados gerados
          ficam no tenant informado.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <label className="block text-xs font-black uppercase tracking-widest text-gray-500">Tenant</label>
        <div className="flex gap-2">
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value.trim())}
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 font-mono text-sm"
          />
          <button
            onClick={() => { setSelectedTracking(''); loadAds(); }}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'Carregando…' : 'Carregar anúncios'}
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">Anúncios ({ads.length})</h2>
        {ads.length === 0 && !loading && (
          <p className="text-sm text-gray-500">Nenhum anúncio com link rastreado neste tenant.</p>
        )}
        <div className="divide-y divide-gray-100">
          {ads.map((ad) => (
            <div key={ad.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{ad.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {ad.campaignName} · CTA {ad.ctaType} · {ad.trackingId ?? 'sem trackingId'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setSelectedTracking(ad.trackingId || '')}
                  disabled={!ad.trackingId}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-40"
                >
                  Usar na resposta
                </button>
                <button
                  onClick={() => simulateClick(ad)}
                  disabled={busy || !ad.trackingId}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
                >
                  Simular clique
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700">Simular resposta no WhatsApp</h2>
        <p className="text-xs text-gray-500">
          Anúncio usado: <span className="font-mono">{selectedTracking || 'nenhum selecionado'}</span>
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone (ex.: 5581999990000)"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Texto da resposta"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
        <button
          onClick={simulateReply}
          disabled={busy || !selectedTracking}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
        >
          Enviar resposta simulada
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-700 mb-3">Registro da sessão</h2>
        {log.length === 0 && <p className="text-sm text-gray-500">Nenhuma ação ainda.</p>}
        <ul className="space-y-2">
          {log.map((l, i) => (
            <li key={i} className="text-sm">
              <span className={`font-black ${l.ok ? 'text-emerald-600' : 'text-red-600'}`}>{l.ok ? '✓' : '✗'}</span>{' '}
              <span className="text-gray-400 text-xs">{l.at}</span> <span className="font-bold">{l.title}</span>
              <div className="text-xs text-gray-600 ml-5">{l.body}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
