'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CtaFormConfig, CtaFieldDef } from '@/lib/cta/service'

interface Props {
  slug: string
  name: string
  config: CtaFormConfig
  ctaType: string | null
}

export default function CtaFormClient({ slug, name, config }: Props) {
  const fields: CtaFieldDef[] = useMemo(
    () => (config?.fields?.length ? config.fields : DEFAULT_FIELDS),
    [config],
  )
  const accent = config?.accent || '#2563eb'

  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [thankYou, setThankYou] = useState<string>('')

  // Registra a visualização (base analítica) uma vez ao montar
  useEffect(() => {
    const qs = typeof window !== 'undefined' ? window.location.search : ''
    navigator.sendBeacon?.(`/api/public/cta/${slug}/view${qs}`) ||
      fetch(`/api/public/cta/${slug}/view${qs}`, { method: 'POST', keepalive: true }).catch(() => {})
  }, [slug])

  const update = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !(values[f.name] || '').trim()) e[f.name] = 'Campo obrigatório'
      if (f.type === 'email' && values[f.name] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[f.name]))
        e[f.name] = 'E-mail inválido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setServerError(null)
    if (!validate()) {
      const first = fields.find((f) => errors[f.name])
      if (first) document.getElementById(`f_${first.name}`)?.focus()
      return
    }
    setStatus('sending')
    try {
      const qs = typeof window !== 'undefined' ? window.location.search : ''
      const res = await fetch(`/api/public/cta/${slug}/submit${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: values }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setServerError(data?.error || 'Não foi possível enviar. Tente novamente.')
        setStatus('error')
        return
      }
      setThankYou(data.thankYouMessage || 'Recebemos seus dados. Em breve entraremos em contato!')
      setStatus('done')
      if (data.redirectUrl) setTimeout(() => (window.location.href = data.redirectUrl), 1800)
    } catch {
      setServerError('Falha de conexão. Tente novamente.')
      setStatus('error')
    }
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4 py-10 bg-slate-50"
      style={{ background: `radial-gradient(1200px 600px at 50% -10%, ${hexA(accent, 0.10)}, transparent), #f8fafc` }}
    >
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-slate-200/70 overflow-hidden">
          {/* Cabeçalho com faixa de acento (branding por cliente) */}
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${hexA(accent, 0.55)})` }} />

          <div className="p-7 sm:p-9">
            {status === 'done' ? (
              <div className="text-center py-6">
                <div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: hexA(accent, 0.12), color: accent }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Tudo certo!</h1>
                <p className="mt-2 text-slate-600 leading-relaxed">{thankYou}</p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {config?.title || name}
                </h1>
                {config?.description && (
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{config.description}</p>
                )}

                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  {fields.map((f) => (
                    <div key={f.name}>
                      <label htmlFor={`f_${f.name}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                        {f.label}
                        {f.required && <span className="text-rose-500"> *</span>}
                      </label>

                      {f.type === 'textarea' ? (
                        <textarea
                          id={`f_${f.name}`}
                          value={values[f.name] || ''}
                          onChange={(e) => update(f.name, e.target.value)}
                          rows={3}
                          aria-invalid={!!errors[f.name]}
                          className={fieldCls(!!errors[f.name])}
                          style={focusRing(accent)}
                        />
                      ) : f.type === 'select' ? (
                        <select
                          id={`f_${f.name}`}
                          value={values[f.name] || ''}
                          onChange={(e) => update(f.name, e.target.value)}
                          aria-invalid={!!errors[f.name]}
                          className={fieldCls(!!errors[f.name])}
                          style={focusRing(accent)}
                        >
                          <option value="">Selecione…</option>
                          {(f.options || []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`f_${f.name}`}
                          type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
                          inputMode={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : undefined}
                          autoComplete={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : undefined}
                          value={values[f.name] || ''}
                          onChange={(e) => update(f.name, e.target.value)}
                          aria-invalid={!!errors[f.name]}
                          className={fieldCls(!!errors[f.name])}
                          style={focusRing(accent)}
                        />
                      )}

                      {errors[f.name] && (
                        <p className="mt-1 text-xs text-rose-600" role="alert">{errors[f.name]}</p>
                      )}
                    </div>
                  ))}

                  {serverError && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert">
                      {serverError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full h-12 rounded-xl text-white font-semibold tracking-tight transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                    style={{ background: accent }}
                  >
                    {status === 'sending' ? 'Enviando…' : (config?.submitLabel || 'Enviar')}
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    Seus dados estão seguros e serão usados apenas para contato.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_FIELDS: CtaFieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
  { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', required: true },
  { name: 'mensagem', label: 'Mensagem (opcional)', type: 'textarea' },
]

function fieldCls(hasError: boolean) {
  return [
    'w-full h-11 px-3.5 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-shadow',
    'placeholder:text-slate-400',
    hasError ? 'border-rose-400' : 'border-slate-300 focus:border-transparent',
  ].join(' ')
}

function focusRing(accent: string): React.CSSProperties {
  // foco visível com a cor de acento do cliente
  return { boxShadow: 'none', ['--tw-ring-color' as any]: accent }
}

function hexA(hex: string, a: number) {
  const m = hex.replace('#', '')
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const r = parseInt(n.slice(0, 2), 16) || 0
  const g = parseInt(n.slice(2, 4), 16) || 0
  const b = parseInt(n.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
