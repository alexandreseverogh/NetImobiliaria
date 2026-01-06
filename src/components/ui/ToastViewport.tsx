'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastEventDetail = {
  message: string
  type?: ToastType
  durationMs?: number
  position?: 'top-right' | 'center'
}

type Toast = {
  id: string
  message: string
  type: ToastType
  durationMs: number
  position: 'top-right' | 'center'
}

const DEFAULT_DURATION_MS = 4500

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        ring: 'ring-1 ring-emerald-200',
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      }
    case 'error':
      return {
        ring: 'ring-1 ring-red-200',
        bg: 'bg-red-50',
        text: 'text-red-900',
        icon: <XCircle className="h-5 w-5 text-red-600" />
      }
    case 'warning':
      return {
        ring: 'ring-1 ring-amber-200',
        bg: 'bg-amber-50',
        text: 'text-amber-950',
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />
      }
    default:
      return {
        ring: 'ring-1 ring-slate-200',
        bg: 'bg-white',
        text: 'text-slate-900',
        icon: <AlertTriangle className="h-5 w-5 text-slate-600" />
      }
  }
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ToastEventDetail>
      const detail = ce.detail
      if (!detail?.message) return

      const toast: Toast = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: String(detail.message),
        type: detail.type || 'info',
        durationMs: typeof detail.durationMs === 'number' ? detail.durationMs : DEFAULT_DURATION_MS,
        position: detail.position || 'top-right'
      }

      setToasts(prev => {
        // evita empilhar infinito; mantém os 3 mais recentes
        const next = [toast, ...prev]
        return next.slice(0, 3)
      })

      // Se durationMs === 0, o toast é persistente e só fecha via botão.
      if (toast.durationMs > 0) {
        window.setTimeout(() => removeToast(toast.id), toast.durationMs)
      }
    }

    window.addEventListener('ui-toast', handler as EventListener)
    return () => window.removeEventListener('ui-toast', handler as EventListener)
  }, [])

  const renderToast = useMemo(() => {
    return (t: Toast) => {
      const s = getToastStyles(t.type)
      return (
        <div
          key={t.id}
          className={[
            'pointer-events-auto w-full rounded-xl shadow-lg',
            'px-4 py-3',
            'backdrop-blur',
            t.position === 'center' ? 'max-w-lg' : 'max-w-sm',
            s.bg,
            s.ring
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{s.icon}</div>
            <div className={`flex-1 text-sm leading-snug ${s.text}`}>{t.message}</div>
            {t.position !== 'center' && (
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="rounded-md p-1 text-gray-500 hover:bg-black/5 hover:text-gray-700 transition-colors"
                aria-label="Fechar notificação"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {t.position === 'center' && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="px-5 py-2 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )
    }
  }, [])

  if (toasts.length === 0) return null

  const topRightToasts = toasts.filter(t => t.position === 'top-right')
  const centerToasts = toasts.filter(t => t.position === 'center')
  const hasCenter = centerToasts.length > 0

  return (
    <>
      {hasCenter && <div className="fixed inset-0 z-[79] bg-black/30 backdrop-blur-[1px]" />}

      {/* Top-right (toasts padrão) */}
      <div className="fixed right-4 top-4 z-[80] flex w-[min(100%,24rem)] flex-col gap-2 pointer-events-none">
        {topRightToasts.map(renderToast)}
      </div>

      {/* Center (popup central) */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
        <div className="flex w-full max-w-lg flex-col gap-2">
          {centerToasts.map(renderToast)}
        </div>
      </div>
    </>
  )
}


