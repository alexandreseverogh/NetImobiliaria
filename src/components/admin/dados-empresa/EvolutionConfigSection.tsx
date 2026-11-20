'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';

/**
 * Conexão Evolution da própria empresa: URL do servidor, nome da instância e chave.
 * A chave é só de escrita: depois de salva, a tela mostra apenas que ela existe.
 * Para trocar a chave, o administrador digita a nova; campo vazio mantém a atual.
 */
export function EvolutionConfigSection() {
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [instance, setInstance] = useState('');
  const [key, setKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/dados-empresa/perfil')
      .then(r => r.json())
      .then(d => {
        setUrl(d.evolutionApiUrl ?? '');
        setInstance(d.evolutionInstance ?? '');
        setKeyConfigured(!!d.evolutionKeyConfigured);
      })
      .catch(() => setError('Não foi possível carregar a conexão Evolution'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      const payload: Record<string, string> = { evolutionApiUrl: url.trim(), evolutionInstance: instance.trim() };
      if (key.trim()) payload.evolutionApiKey = key.trim();
      const res = await adminFetch('/api/admin/dados-empresa/perfil', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao salvar');
      if (key.trim()) setKeyConfigured(true);
      setKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Carregando…</p>;

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent';
  const labelCls = 'block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-sm font-black text-gray-900">Conexão Evolution</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl">
          Servidor e instância da Evolution usados pela empresa para enviar e receber mensagens do WhatsApp.
          A chave fica guardada e não é exibida de volta.
        </p>
      </div>

      <div>
        <label className={labelCls}>URL do servidor Evolution</label>
        <input
          type="text"
          placeholder="http://evolution_api:8080"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="max-w-md">
        <label className={labelCls}>Nome da instância</label>
        <input
          type="text"
          placeholder="artemis9-business"
          value={instance}
          onChange={e => setInstance(e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="max-w-md">
        <label className={labelCls}>Chave da Evolution</label>
        <input
          type="password"
          autoComplete="new-password"
          placeholder={keyConfigured ? 'Chave configurada — digite só para trocar' : 'Cole a chave da Evolution'}
          value={key}
          onChange={e => setKey(e.target.value)}
          className={inputCls}
        />
        <p className="text-[11px] mt-1.5 text-gray-400">
          {keyConfigured ? 'Chave configurada.' : 'Nenhuma chave configurada ainda.'}
        </p>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar conexão'}
        </button>
        {saved && <span className="text-xs font-bold text-emerald-600">Salvo</span>}
      </div>
    </div>
  );
}
