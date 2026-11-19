'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

const RESOURCE = 'dados-empresa';

/**
 * Configurações da Central de Mensagens da empresa. Só existe quando a Mensageria está contratada
 * e "Gerar mensagens no WhatsApp" está ligado; fora disso mostra uma nota explicativa.
 */
export function CentralMensagensSection() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [ttl, setTtl] = useState<number | null>(null);
  const [lidTimeout, setLidTimeout] = useState<number>(15);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/dados-empresa/perfil')
      .then(r => r.json())
      .then(d => {
        setEnabled(!!d.avatarTtlEnabled);
        setTtl(d.avatarTtlDays ?? null);
        setLidTimeout(d.lidMediaTimeoutSeconds ?? 15);
      })
      .catch(() => setError('Não foi possível carregar a Central de Mensagens'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      const res = await adminFetch('/api/admin/dados-empresa/perfil', {
        method: 'PUT',
        body: JSON.stringify({ avatarTtlDays: ttl, lidMediaTimeoutSeconds: lidTimeout }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Carregando…</p>;

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
        <p className="text-sm font-black text-gray-700">Central de Mensagens indisponível</p>
        <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
          Disponível quando o módulo de Mensageria está contratado e a opção "Gerar mensagens no WhatsApp"
          está ativada para a sua empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-sm font-black text-gray-900">Foto dos contatos</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl">
          A foto de cada contato é buscada somente quando ele é usado (mensagem recebida ou conversa aberta)
          e renovada depois do prazo abaixo. Vazio usa o padrão do segmento.
        </p>
      </div>

      <div className="max-w-xs">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Atualizar a cada (dias)
        </label>
        <input
          type="number"
          min={1}
          max={365}
          placeholder="Padrão do segmento"
          value={ttl ?? ''}
          onChange={e => setTtl(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      <div className="max-w-xs pt-2 border-t border-gray-50">
        <h2 className="text-sm font-black text-gray-900 mt-4">Mídia de contato sem número</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl">
          Tempo máximo para baixar uma foto, áudio ou vídeo de um contato que o WhatsApp não identificou com número.
          Passou disso, a mensagem é registrada sem o arquivo, para não travar o recebimento das demais.
        </p>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 mb-2">
          Tempo limite (segundos)
        </label>
        <input
          type="number"
          min={1}
          max={120}
          value={lidTimeout}
          onChange={e => setLidTimeout(Number(e.target.value))}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button
            onClick={save}
            disabled={busy}
            className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </UpdateGuard>
        {saved && <span className="text-xs font-semibold text-emerald-600">Salvo</span>}
      </div>
    </div>
  );
}
