'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Network {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  network_active: boolean;
  capabilities: {
    supported?: boolean;
    formats?: string[];
    objectives?: string[];
  };
  sort_order: number;
  credential_id: string | null;
  account_id: string | null;
  display_name: string | null;
  credential_active: boolean;
  expires_at: string | null;
  last_validated: string | null;
  connected_at: string | null;
  connected: boolean;
}

interface MetaForm {
  access_token: string;
  ad_account_id: string;
  app_id: string;
  app_secret: string;
}

const NETWORK_ICONS: Record<string, string> = {
  meta:     '𝕗',
  google:   'G',
  linkedin: 'in',
  tiktok:   '♪',
};

export default function RedesPage() {
  const [networks, setNetworks]       = useState<Network[]>([]);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState<string | null>(null);
  const [validating, setValidating]   = useState<string | null>(null);
  const [expandedCode, setExpanded]   = useState<string | null>(null);
  const [metaForm, setMetaForm]       = useState<MetaForm>({
    access_token: '', ad_account_id: '', app_id: '', app_secret: '',
  });
  const [feedback, setFeedback]       = useState<{ code: string; ok: boolean; msg: string } | null>(null);

  const fetchNetworks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/campanhas/configuracoes/redes');
      setNetworks(data.networks || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNetworks(); }, []);

  const handleConnectMeta = async () => {
    if (!metaForm.access_token || !metaForm.ad_account_id) {
      setFeedback({ code: 'meta', ok: false, msg: 'Access token e ID da conta são obrigatórios.' });
      return;
    }
    setConnecting('meta');
    setFeedback(null);
    try {
      await axios.post('/api/admin/campanhas/configuracoes/redes', {
        network_code: 'meta',
        credentials: {
          access_token: metaForm.access_token,
          app_id:       metaForm.app_id,
          app_secret:   metaForm.app_secret,
        },
        account_id:   metaForm.ad_account_id,
        display_name: 'Meta Ads',
      });
      await fetchNetworks();
      setExpanded(null);
      setFeedback({ code: 'meta', ok: true, msg: 'Credenciais salvas com sucesso.' });
    } catch (err: any) {
      setFeedback({ code: 'meta', ok: false, msg: err?.response?.data?.error || 'Erro ao salvar.' });
    } finally {
      setConnecting(null);
    }
  };

  const handleValidate = async (code: string) => {
    setValidating(code);
    setFeedback(null);
    try {
      const { data } = await axios.post('/api/admin/campanhas/configuracoes/redes/validate', {
        network_code: code,
      });
      setFeedback({ code, ok: data.valid, msg: data.valid ? 'Conexão validada com sucesso!' : `Falha: ${data.error}` });
      if (data.valid) fetchNetworks();
    } catch (err: any) {
      setFeedback({ code, ok: false, msg: err?.response?.data?.error || 'Erro na validação.' });
    } finally {
      setValidating(null);
    }
  };

  const handleDisconnect = async (code: string) => {
    if (!confirm(`Deseja desconectar ${code.toUpperCase()}? As campanhas existentes não serão afetadas.`)) return;
    try {
      await axios.delete(`/api/admin/campanhas/configuracoes/redes?network_code=${code}`);
      await fetchNetworks();
      setFeedback({ code, ok: true, msg: 'Rede desconectada.' });
    } catch (err: any) {
      setFeedback({ code, ok: false, msg: 'Erro ao desconectar.' });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpiring = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
    return days < 30;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Redes de Anúncios</h1>
        <p className="text-gray-500 text-sm mt-1">
          Conecte as redes onde suas campanhas serão veiculadas. Cada rede tem seu próprio token de acesso.
        </p>
      </div>

      <div className="space-y-4">
        {networks.map(net => (
          <div
            key={net.code}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: net.color }}
                >
                  {NETWORK_ICONS[net.code] || net.code.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{net.name}</div>
                  {net.connected && net.account_id ? (
                    <div className="text-xs text-gray-500">Conta: {net.account_id}</div>
                  ) : !net.capabilities.supported ? (
                    <div className="text-xs text-gray-400">Em breve</div>
                  ) : (
                    <div className="text-xs text-gray-400">Não conectado</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {net.connected ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Conectado
                    </span>
                    {net.expires_at && isExpiring(net.expires_at) && (
                      <span className="text-xs text-amber-600 font-medium">
                        ⚠ Expira {formatDate(net.expires_at)}
                      </span>
                    )}
                    <button
                      onClick={() => handleValidate(net.code)}
                      disabled={validating === net.code}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                    >
                      {validating === net.code ? 'Testando...' : 'Testar'}
                    </button>
                    <button
                      onClick={() => setExpanded(expandedCode === net.code ? null : net.code)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Reconectar
                    </button>
                    <button
                      onClick={() => handleDisconnect(net.code)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Desativar
                    </button>
                  </>
                ) : net.capabilities.supported !== false ? (
                  <button
                    onClick={() => setExpanded(expandedCode === net.code ? null : net.code)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    Conectar
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
                    Em breve
                  </span>
                )}
              </div>
            </div>

            {/* Feedback */}
            {feedback?.code === net.code && (
              <div className={`mx-4 mb-3 px-3 py-2 rounded-lg text-sm ${feedback.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {feedback.msg}
              </div>
            )}

            {/* Last validated info */}
            {net.connected && net.last_validated && (
              <div className="px-4 pb-3 text-xs text-gray-400">
                Última validação: {formatDate(net.last_validated)}
              </div>
            )}

            {/* Connection form (expandable) */}
            {expandedCode === net.code && net.code === 'meta' && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                <p className="text-sm text-gray-600 font-medium">Credenciais Meta Business</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Access Token *</label>
                  <input
                    type="password"
                    value={metaForm.access_token}
                    onChange={e => setMetaForm(f => ({ ...f, access_token: e.target.value }))}
                    placeholder="EAA..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ID da Conta de Anúncios *</label>
                  <input
                    type="text"
                    value={metaForm.ad_account_id}
                    onChange={e => setMetaForm(f => ({ ...f, ad_account_id: e.target.value }))}
                    placeholder="123456789"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">App ID (opcional)</label>
                    <input
                      type="text"
                      value={metaForm.app_id}
                      onChange={e => setMetaForm(f => ({ ...f, app_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">App Secret (opcional)</label>
                    <input
                      type="password"
                      value={metaForm.app_secret}
                      onChange={e => setMetaForm(f => ({ ...f, app_secret: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleConnectMeta}
                    disabled={connecting === 'meta'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {connecting === 'meta' ? 'Salvando...' : 'Salvar Credenciais'}
                  </button>
                  <button
                    onClick={() => setExpanded(null)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <strong>Dica:</strong> Cada campanha está vinculada a uma única rede. O budget de cada
        campanha é independente — não há rateio automático entre redes.
      </div>
    </div>
  );
}
