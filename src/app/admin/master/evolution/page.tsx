'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';

type Server = {
  id: string; name: string; api_url: string; has_key: boolean;
  is_default: boolean; is_active: boolean; tenant_count: number; instance_count: number;
  disconnected_count: number; last_reachable: boolean | null; last_checked_at: string | null;
};

const EMPTY = { id: '', name: '', apiUrl: '', apiKey: '', isDefault: false, isActive: true };

type TenantRow = { id: string; name: string; connected: boolean };

export default function MasterEvolutionPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Server | null>(null);
  const [viewTenants, setViewTenants] = useState<TenantRow[] | null>(null);

  const openTenants = async (s: Server) => {
    setViewing(s);
    setViewTenants(null);
    const res = await adminFetch(`/api/admin/master/evolution-servers?tenantsOf=${s.id}`);
    const body = await res.json().catch(() => ({}));
    setViewTenants(res.ok ? body.tenants : []);
  };

  const load = async () => {
    const res = await adminFetch('/api/admin/master/evolution-servers');
    const body = await res.json().catch(() => ({}));
    if (res.ok) setServers(body.servers || []);
    else setError(body.error || 'Erro ao carregar');
  };

  useEffect(() => { load(); }, []);

  const [alertNumber, setAlertNumber] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/master/evolution-alert')
      .then(r => r.json())
      .then(d => setAlertNumber(d.whatsappAlerta ?? ''))
      .catch(() => {});
  }, []);

  const saveAlert = async () => {
    setAlertError(''); setAlertSaved(false);
    const res = await adminFetch('/api/admin/master/evolution-alert', {
      method: 'PUT',
      body: JSON.stringify({ whatsappAlerta: alertNumber }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setAlertError(body.error || 'Erro ao salvar'); return; }
    setAlertNumber(body.whatsappAlerta ?? '');
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 2500);
  };

  const save = async () => {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/master/evolution-servers', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Erro ao salvar');
      setForm(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Server) => {
    if (!confirm(`Excluir o servidor "${s.name}"?`)) return;
    const res = await adminFetch(`/api/admin/master/evolution-servers?id=${s.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Erro ao excluir');
    else await load();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-gold-premium uppercase tracking-[0.3em] mb-2">Master</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Servidores WhatsApp (Evolution)</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Cada empresa cria a própria instância neste servidor. A chave de administração fica aqui e nunca é exibida às empresas.
            </p>
          </div>
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl"
          >
            Novo servidor
          </button>
        </div>

        <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alertas de conexão</p>
          <p className="text-xs text-gray-500 mb-3">
            Número do Master que recebe o aviso quando um servidor ou uma conexão cai. Use DDD + número, sem espaços (ex.: 5581999999999).
          </p>
          <div className="flex items-end gap-3 max-w-md">
            <input
              value={alertNumber}
              onChange={e => setAlertNumber(e.target.value)}
              placeholder="5581999999999"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button onClick={saveAlert} className="px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl">
              Salvar
            </button>
          </div>
          {alertSaved && <p className="mt-2 text-xs font-semibold text-emerald-600">Salvo</p>}
          {alertError && <p className="mt-2 text-xs font-semibold text-red-600">{alertError}</p>}
        </div>

        {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">URL</th>
                <th className="text-left px-5 py-3">Empresas</th>
                <th className="text-left px-5 py-3">Instâncias</th>
                <th className="text-left px-5 py-3">Situação</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-5 py-3 font-bold text-gray-900">
                    {s.name} {s.is_default && <span className="ml-2 text-[10px] font-black text-gold-premium uppercase">padrão</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.api_url}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => openTenants(s)} className="font-bold text-blue-700 hover:underline">{s.tenant_count}</button>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.instance_count}</td>
                  <td className="px-5 py-3">
                    {s.last_reachable === false ? (
                      <span className="text-xs font-black text-red-600">Servidor fora do ar</span>
                    ) : s.disconnected_count > 0 ? (
                      <span className="text-xs font-black text-amber-600">{s.disconnected_count} desconectada(s)</span>
                    ) : s.last_checked_at ? (
                      <span className="text-xs font-black text-emerald-600">Tudo conectado</span>
                    ) : (
                      <span className="text-xs text-gray-400">Aguardando verificação</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{s.is_active ? 'Ativo' : 'Inativo'}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => setForm({ id: s.id, name: s.name, apiUrl: s.api_url, apiKey: '', isDefault: s.is_default, isActive: s.is_active })}
                      className="text-xs font-bold text-gray-600 hover:text-gray-900">Editar</button>
                    <button onClick={() => remove(s)} className="text-xs font-bold text-red-600 hover:text-red-800">Excluir</button>
                  </td>
                </tr>
              ))}
              {servers.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhum servidor cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewing(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-black text-gray-900">Empresas em {viewing.name}</h2>
              {viewTenants === null && <p className="text-sm text-gray-400">Carregando…</p>}
              {viewTenants && viewTenants.length === 0 && <p className="text-sm text-gray-400">Nenhuma empresa neste servidor ainda.</p>}
              {viewTenants && viewTenants.length > 0 && (
                <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {viewTenants.map(t => (
                    <li key={t.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-800">{t.name}</span>
                      <span className={t.connected ? 'text-xs font-bold text-emerald-600' : 'text-xs font-bold text-gray-400'}>
                        {t.connected ? 'Conectada' : 'Sem WhatsApp conectado'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm font-bold text-gray-500">Fechar</button>
              </div>
            </div>
          </div>
        )}

        {form && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
              <h2 className="text-lg font-black text-gray-900">{form.id ? 'Editar servidor' : 'Novo servidor'}</h2>
              <Field label="Nome" value={form.name} onChange={v => setForm({ ...form, name: v })} />
              <Field label="URL" value={form.apiUrl} placeholder="https://evolution.seudominio.com" onChange={v => setForm({ ...form, apiUrl: v })} />
              <Field label={form.id ? 'Trocar a chave de administração (deixe em branco para manter a atual)' : 'Chave de administração do servidor'}
                value={form.apiKey} type="password" onChange={v => setForm({ ...form, apiKey: v })} />
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                Servidor padrão para novas empresas
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                Ativo
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancelar</button>
                <button onClick={save} disabled={busy}
                  className="px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                  {busy ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600" />
    </div>
  );
}
