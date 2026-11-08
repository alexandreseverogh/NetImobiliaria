'use client';

/**
 * Número de WhatsApp Business usado nos anúncios de click-to-WhatsApp (lançamento de campanhas).
 * Avisa quando não bate com o número pareado na Mensageria: nesse caso as conversas dos
 * anúncios não chegam na caixa de entrada.
 */
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

const RESOURCE = 'dados-empresa';

type Config = {
  phoneNumber: string; defaultMessage: string; businessName: string;
  evolutionNumber: string; numbersMatch: boolean | null;
};

export function WhatsAppCampanhasSection() {
  const [data, setData] = useState<Config>({
    phoneNumber: '', defaultMessage: '', businessName: '', evolutionNumber: '', numbersMatch: null,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminFetch('/api/admin/dados-empresa/whatsapp-campanhas');
      if (res.ok) setData({ ...(await res.json()) });
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/dados-empresa/whatsapp-campanhas', {
        method: 'PUT',
        body: JSON.stringify({
          phoneNumber: data.phoneNumber,
          defaultMessage: data.defaultMessage,
          businessName: data.businessName,
        }),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resBody.error || 'Erro ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-black text-gray-900">WhatsApp Business (anúncios)</h2>
        <p className="text-xs text-gray-500 mt-1">
          Número que recebe as conversas iniciadas pelos anúncios de click-to-WhatsApp da Meta.
        </p>
      </div>

      {data.numbersMatch === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Este número é diferente do número conectado à Mensageria ({data.evolutionNumber || 'não conectado'}).
          Conversas dos anúncios não vão aparecer na caixa de entrada enquanto os dois não forem o mesmo.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número (DDI + DDD + número)</label>
          <input
            type="text"
            value={data.phoneNumber}
            onChange={e => setData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="5581999999999"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome da empresa no WhatsApp</label>
          <input
            type="text"
            value={data.businessName}
            onChange={e => setData(prev => ({ ...prev, businessName: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mensagem inicial pré-preenchida</label>
        <textarea
          rows={2}
          value={data.defaultMessage}
          onChange={e => setData(prev => ({ ...prev, defaultMessage: e.target.value }))}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1464d0] active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar WhatsApp Business'}
          </button>
        </UpdateGuard>
        {saved && <span className="text-xs font-bold text-emerald-600">Salvo</span>}
      </div>
    </div>
  );
}
