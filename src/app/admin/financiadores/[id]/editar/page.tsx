'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface FormState {
  nome: string
  headline: string
  valor_mensal: string
  ativo: boolean
  logo_base64: string
  logo_tipo_mime: string
}

export default function EditarFinanciadorPage() {
  const { get, put } = useAuthenticatedFetch()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState<FormState>({
    nome: '',
    headline: '',
    valor_mensal: '',
    ativo: true,
    logo_base64: '',
    logo_tipo_mime: ''
  })
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatMoneyBRInput = (raw: string, finalize: boolean): string => {
    const s = String(raw || '').replace(/[^\d,]/g, '')
    if (!s) return ''

    const parts = s.split(',')
    const intPart = parts[0] || ''
    const decPart = parts[1] ? parts[1].slice(0, 2) : ''

    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    if (finalize) {
      return `${intFormatted || '0'},${decPart.padEnd(2, '0')}`
    }

    return parts.length > 1 ? `${intFormatted},${decPart}` : intFormatted
  }

  const parseMoneyBR = (value: string): number => {
    const v = String(value || '').trim()
    if (!v) return NaN
    const noThousands = v.replace(/\./g, '')
    if (!noThousands.includes(',')) return Number(`${noThousands}.00`)
    const [i, dRaw] = noThousands.split(',')
    const d = (dRaw || '').replace(/\D/g, '').slice(0, 2)
    const dFixed = d.length === 0 ? '00' : d.length === 1 ? `${d}0` : d
    return Number(`${i || '0'}.${dFixed}`)
  }

  // Função para formatar valores monetários com máscara de moeda brasileira (copiada de GeneralDataStep)
  const formatCurrencyValue = (value: string) => {
    const digits = value.replace(/\D/g, '')

    if (!digits) {
      return ''
    }

    const numericValue = Number(digits) / 100

    return numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const parseCurrencyToNumber = (value: string): number | undefined => {
    const digits = value.replace(/\D/g, '')

    if (!digits) {
      return undefined
    }

    const numericValue = Number(digits) / 100
    return Number.isNaN(numericValue) ? undefined : numericValue
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await get(`/api/admin/financiadores/${id}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao carregar financiador')
      }
      const data = await res.json()
      const fin = data?.data
      const valorFormatado = fin?.valor_mensal !== undefined
        ? (Number(fin.valor_mensal) * 100).toFixed(0).replace(/\D/g, '')
        : ''

      setForm({
        nome: fin?.nome || '',
        headline: fin?.headline || '',
        valor_mensal: formatCurrencyValue(valorFormatado),
        ativo: fin?.ativo !== undefined ? !!fin.ativo : true,
        logo_base64: fin?.logo_base64 || '',
        logo_tipo_mime: fin?.logo_tipo_mime || ''
      })
      if (fin?.logo_base64 && fin?.logo_tipo_mime) {
        setPreview(`data:${fin.logo_tipo_mime};base64,${fin.logo_base64}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financiador')
    } finally {
      setLoading(false)
    }
  }, [id, get])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('O arquivo da logo deve ser uma imagem (PNG/JPG/SVG/WebP).')
      return
    }
    setError(null)
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    setForm((p) => ({ ...p, logo_base64: base64, logo_tipo_mime: file.type }))
    setPreview(`data:${file.type};base64,${base64}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.nome.trim()) return setError('Nome é obrigatório.')
    if (!form.headline.trim()) return setError('Texto chamativo (headline) é obrigatório.')

    const valor = parseCurrencyToNumber(form.valor_mensal)
    if (valor === undefined || valor < 0) return setError('Valor mensal inválido.')

    setSaving(true)
    try {
      const res = await put(`/api/admin/financiadores/${id}`, {
        nome: form.nome.trim(),
        headline: form.headline.trim(),
        valor_mensal: valor,
        ativo: form.ativo,
        // sempre enviar logo atual (ou a nova se trocou)
        logo_base64: form.logo_base64,
        logo_tipo_mime: form.logo_tipo_mime
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao atualizar financiador')
      }
      router.push('/admin/financiadores')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar financiador')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => router.push('/admin/financiadores')} className="p-2 text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Financiador</h1>
          <p className="mt-1 text-sm text-gray-700">Edite os dados do patrocinador.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
              <input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor mensal (R$) *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">R$</span>
                </div>
                <input
                  type="text"
                  value={form.valor_mensal}
                  onChange={(e) => {
                    const formatted = formatCurrencyValue(e.target.value)
                    setForm((p) => ({ ...p, valor_mensal: formatted }))
                  }}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Texto chamativo (headline) *</label>
            <textarea
              value={form.headline}
              onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo (alta definição)</label>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-700" />
              <p className="mt-1 text-xs text-gray-500">Se você não trocar, a logo atual será mantida.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prévia</label>
              <div className="w-full h-28 border border-gray-200 rounded-md bg-white flex items-center justify-center overflow-hidden">
                {preview ? <img src={preview} alt="Prévia da logo" className="max-w-full max-h-full" /> : <span className="text-xs text-gray-400">Sem logo</span>}
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Financiador ativo</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin/financiadores')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


