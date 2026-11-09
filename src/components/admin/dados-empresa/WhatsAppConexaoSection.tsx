'use client';

/**
 * Conexão do WhatsApp da empresa (Evolution). Mostra o status e o QR Code para parear o celular
 * que vai receber as mensagens de campanhas e da Mensageria. Quem parea é o administrador da empresa.
 */
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

const RESOURCE = 'dados-empresa';

type Status = {
  connected: boolean;
  instance: string;
  error?: string;
  qrCode: string | null;
  qrError?: string;
};

export function WhatsAppConexaoSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminFetch('/api/admin/dados-empresa/whatsapp-conexao');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao consultar a conexão');
      setStatus(body);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const newQr = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await adminFetch('/api/admin/dados-empresa/whatsapp-conexao', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao gerar QR Code');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-black text-gray-900">Conexão do WhatsApp</h2>
        <p className="text-xs text-gray-500 mt-1">
          Parear o celular que recebe as mensagens de campanhas e da Mensageria.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Consultando…</p>}

      {!loading && status && (
        <>
          <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${status.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
            {status.connected ? 'Conectado ao WhatsApp' : 'Desconectado. Escaneie o QR Code com o celular que vai receber as mensagens.'}
          </div>

          {!status.connected && (
            <div className="flex justify-center">
              <div className="h-[22rem] w-[22rem] max-w-full rounded-2xl bg-white border border-gray-200 flex items-center justify-center p-4">
                {status.qrCode ? (
                  <img
                    src={status.qrCode.startsWith('data:') ? status.qrCode : `data:image/png;base64,${status.qrCode}`}
                    alt="QR Code do WhatsApp"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400 px-4 text-center">
                    {status.qrError || 'QR Code indisponível. Gere um novo.'}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
        <UpdateGuard resource={RESOURCE}>
          <button
            onClick={newQr}
            disabled={busy || loading}
            className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1464d0] active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {busy ? 'Gerando...' : 'Gerar novo QR Code'}
          </button>
        </UpdateGuard>
        <button onClick={load} className="text-xs font-bold text-gray-500 hover:text-gray-800">Atualizar status</button>
      </div>
    </div>
  );
}
