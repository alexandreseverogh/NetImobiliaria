'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'

/**
 * Aba "Central de Mensagens" do cliente. Só é exibida quando a empresa tem a Mensageria contratada
 * e "Gerar mensagens no WhatsApp" ligado (a página decide a exibição pela própria API).
 */
export default function ClientCentralMensagensSection({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true)
  const [ttl, setTtl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/api/admin/clientes/${clientId}/central-mensagens`)
      .then(r => r.json())
      .then(d => setTtl(d.avatarTtlDays != null ? String(d.avatarTtlDays) : ''))
      .catch(() => setError('Não foi possível carregar a Central de Mensagens'))
      .finally(() => setLoading(false))
  }, [clientId])

  const save = async () => {
    setBusy(true); setError(''); setSaved(false)
    try {
      const res = await adminFetch(`/api/admin/clientes/${clientId}/central-mensagens`, {
        method: 'PUT',
        body: JSON.stringify({ avatarTtlDays: ttl === '' ? null : ttl }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Erro ao salvar')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando…</p>

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-sm font-black text-gray-900">Foto dos contatos deste cliente</h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl">
          A foto é buscada quando um contato deste cliente é usado e renovada depois do prazo abaixo.
          Vazio herda o padrão da empresa (Dados da Empresa) ou o do segmento.
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
          placeholder="Herda da empresa / segmento"
          value={ttl}
          onChange={e => setTtl(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <button
          onClick={save}
          disabled={busy}
          className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-600">Salvo</span>}
      </div>
    </div>
  )
}
