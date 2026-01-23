'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { QRCodeSVG } from 'qrcode.react'
import {
  QrCode,
  Download,
  Copy,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Share2,
  Wallet,
  Building2,
  User,
  Calendar,
  DollarSign,
  Info
} from 'lucide-react'

export default function GerarQRCodePage() {
  const { get } = useAuthenticatedFetch()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [params, setParams] = useState({
    valor_corretor: 0,
    chave_pix_corretor: '',
    cidade_beneficiario_recebimento_corretor: ''
  })
  const [corretorNome, setCorretorNome] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  // Carregar dados e parâmetros
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // 1. Carregar Parâmetros
        const resp = await get('/api/public/corretor/parametros')
        const data = await resp.json()
        if (resp.ok && data.success) {
          setParams(data.data)
        } else {
          throw new Error(data.error || 'Erro ao carregar parâmetros')
        }

        // 2. Carregar Nome do Corretor do localStorage
        const raw = localStorage.getItem('user-data')
        if (raw) {
          const u = JSON.parse(raw)
          setCorretorNome(u.nome || '')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [get])

  // Função para calcular o CRC16-CCITT (necessário para PIX válido)
  const calculateCRC16 = (str: string) => {
    let crc = 0xFFFF
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021
        } else {
          crc <<= 1
        }
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  }

  // Lógica de Geração do Código PIX Real (BRCode)
  const pixPayload = useMemo(() => {
    if (!params.chave_pix_corretor) return ''

    const parts = []

    // 00: Payload Format Indicator
    parts.push('000201')

    // 26: Merchant Account Information
    const gui = '0014br.gov.bcb.pix'
    const key = `01${params.chave_pix_corretor.length.toString().padStart(2, '0')}${params.chave_pix_corretor}`
    const merchantInfo = gui + key
    parts.push(`26${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`)

    // 52: Merchant Category Code
    parts.push('52040000')

    // 53: Transaction Currency (986 = BRL)
    parts.push('5303986')

    // 54: Transaction Amount
    const amountStr = params.valor_corretor.toFixed(2)
    parts.push(`54${amountStr.length.toString().padStart(2, '0')}${amountStr}`)

    // 58: Country Code
    parts.push('5802BR')

    // 59: Merchant Name (Net Imobiliaria)
    const name = 'Imovtec'
    parts.push(`59${name.length.toString().padStart(2, '0')}${name}`)

    // 60: Merchant City
    const city = params.cidade_beneficiario_recebimento_corretor || 'BRASILIA'
    parts.push(`60${city.length.toString().padStart(2, '0')}${city}`)

    // 62: Additional Data Field Template (TXID)
    const txid = '0503***'
    parts.push(`62${txid.length.toString().padStart(2, '0')}${txid}`)

    // 63: CRC16
    const payloadWithoutCRC = parts.join('') + '6304'
    const crc = calculateCRC16(payloadWithoutCRC)

    return payloadWithoutCRC + crc
  }, [params])

  const handleCopy = () => {
    navigator.clipboard.writeText(pixPayload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 40
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 20, 20)
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `qrcode-pix-imovtec.png`
        link.href = url
        link.click()
      }
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handleVoltar = () => {
    // Ao retornar para a landpaging, não abrir modal de geolocalização novamente nesta visita
    try {
      sessionStorage.setItem('suppress-geolocation-modal-once', 'true')
    } catch { }
    const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
    const url = new URL(returnUrl, window.location.origin)
    url.searchParams.set('corretor_home', 'true')
    window.location.href = url.pathname + url.search
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Preparando seu código de pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gerar Pagamento</h1>
              <p className="text-slate-500 text-sm font-medium">QR Code para sinal de reserva e taxas</p>
            </div>
          </div>

          <button
            onClick={handleVoltar}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Voltar ao Painel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Informações (5 colunas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Dados do Pagamento
              </h2>

              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Valor Mensal Corretor</label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-medium text-slate-500">R$</span>
                    <span className="text-4xl font-black text-slate-900">
                      {params.valor_corretor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Destinatário (PIX)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <QrCode className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{params.chave_pix_corretor || 'Não configurada'}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Chave PIX Oficial</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 mb-1">Como funciona?</h3>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Este QR Code é gerado com base nos parâmetros oficiais da Imovtec.
                    Apresente-o ao cliente para realização do sinal de reserva ou taxas administrativas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" />
                Baixar QR Code
              </button>
            </div>
          </div>

          {/* Coluna Direita: Preview Recibo Digital (7 colunas) */}
          <div className="lg:col-span-7">
            <div className="relative">
              {/* Efeito de papel decorativo atrás */}
              <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] rotate-2 scale-[1.02] opacity-10" />

              <div className="relative bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* Topo do Recibo */}
                <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
                  <div>
                    <img src="/imovtec-logo.png" alt="Imovtec" className="h-12 w-auto mx-auto" />
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-3">Comprovante de Intenção</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-60">ID DA TRANSAÇÃO</p>
                    <p className="text-sm font-mono">#{Math.random().toString(36).substring(7).toUpperCase()}</p>
                  </div>
                </div>

                {/* Conteúdo do Recibo */}
                <div className="p-10 text-center">
                  {pixPayload ? (
                    <div className="mb-8 inline-block p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200" ref={qrRef}>
                      <QRCodeSVG
                        value={pixPayload}
                        size={240}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/imovtec-logo.png",
                          x: undefined,
                          y: undefined,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="mb-8 inline-flex flex-col items-center justify-center w-[280px] h-[280px] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      <QrCode className="w-12 h-12 mb-2 opacity-20" />
                      <p className="text-xs font-medium">Aguardando configuração PIX</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">
                        R$ {params.valor_corretor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h3>
                      <p className="text-slate-500 font-medium mt-1">Valor da Mensalidade de Corretor</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 text-left">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Corretor Responsável</p>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700">{corretorNome}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Geração</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-4 px-6 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs font-bold">Aponte a câmera para pagar via PIX</span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Recibo */}
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Building2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Imovtec - Inteligência Imobiliária</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

