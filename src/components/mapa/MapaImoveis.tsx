'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import 'leaflet/dist/leaflet.css'

interface ImovelMapa {
  id: number
  titulo: string
  preco: number
  latitude: number
  longitude: number
  quartos: number
  suites: number
  banheiros: number
  vagas_garagem: number
  andar: number | null
  total_andares: number | null
  preco_condominio: number | null
  preco_iptu: number | null
  taxa_extra: number | null
  tipo_nome: string
  finalidade_nome: string
}

interface MapaImoveisProps {
  imoveis: ImovelMapa[]
  onImovelClick?: (imovel: ImovelMapa) => void
}

export default function MapaImoveis({ imoveis, onImovelClick }: MapaImoveisProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const [popupImovel, setPopupImovel] = useState<ImovelMapa | null>(null)
  const [mounted, setMounted] = useState(false)

  // Calcular centro do mapa e zoom
  const mapCenter = useMemo(() => {
    if (imoveis.length === 0) {
      return [-14.235, -51.9253] as [number, number] // Centro do Brasil
    }

    const latSum = imoveis.reduce((sum, i) => sum + i.latitude, 0)
    const lngSum = imoveis.reduce((sum, i) => sum + i.longitude, 0)

    return [latSum / imoveis.length, lngSum / imoveis.length] as [number, number]
  }, [imoveis])

  // Calcular min/max de preço para normalizar tamanho dos círculos
  const { minPreco, maxPreco } = useMemo(() => {
    if (imoveis.length === 0) {
      return { minPreco: 0, maxPreco: 1000000 }
    }

    const precos = imoveis.map(i => i.preco).filter(p => p > 0)
    return {
      minPreco: Math.min(...precos),
      maxPreco: Math.max(...precos)
    }
  }, [imoveis])

  // Função para calcular raio do círculo baseado no preço (em pixels)
  const calcularRaio = (preco: number): number => {
    if (maxPreco === minPreco) return 15 // Raio padrão se todos têm o mesmo preço

    const normalizado = (preco - minPreco) / (maxPreco - minPreco)
    // Raio entre 10px e 30px (muito menor para não sobrepor)
    return 10 + (normalizado * 20)
  }

  // Formatar preço para exibição
  const formatarPreco = (preco: number): string => {
    if (!preco || preco <= 0) return 'Sob Consulta'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(preco)
  }

  // Função auxiliar para gerar linhas do popup com ícone, label e valor concatenados
  const criarLinhaInfo = (
    iconeSvg: string,
    label: string,
    valor: string,
    destaque?: boolean
  ) => {
    const background = destaque
      ? 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 100%)'
      : 'linear-gradient(to right, #eff6ff, #dbeafe)'

    return `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        white-space: nowrap;
        padding: 10px;
        margin-bottom: 8px;
        border-radius: 10px;
        border: 2px solid #bfdbfe;
        background: ${background};
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
        width: 100%;
      ">
        <span style="display: inline-flex; align-items: center; color: #2563eb; flex-shrink: 0;">
          ${iconeSvg}
        </span>
        <span style="color: #1e40af; font-weight: 600; display: inline-flex; align-items: center; white-space: nowrap;">${label}</span>
        <span style="font-weight: ${destaque ? '700' : '500'}; color: ${destaque ? '#2563eb' : '#111827'}; display: inline-flex; align-items: center; white-space: nowrap;">
          ${valor}
        </span>
      </div>
    `
  }

  const icones = {
    tipo: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
    quartos: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    suites: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
    banheiros: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg>`,
    garagem: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    andar: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v-4a2 2 0 012-2h12a2 2 0 012 2v4m-12 0h12m-12 0v2a2 2 0 002 2h8a2 2 0 002-2v-2m-12 0H4m16 0h4"/></svg>`,
    totalAndares: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
    preco: `<svg style="width:20px;height:20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    condominio: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    iptu: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    taxas: `<svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>`
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mapRef.current || imoveis.length === 0) {
      return
    }

    // Importar Leaflet dinamicamente apenas no cliente
    import('leaflet').then((L) => {
      // Configurar ícones padrão do Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      // Limpar mapa anterior se existir
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []
        mapInstanceRef.current = null
      }

      // Criar mapa
      const map = L.map(mapRef.current!, {
        center: mapCenter,
        zoom: imoveis.length === 1 ? 15 : 10, // Zoom inicial menor para múltiplos imóveis
        scrollWheelZoom: true
      })

      // Adicionar camada de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Detectar coordenadas duplicadas e aplicar offsets
      const coordenadasMap = new Map<string, number>()
      const imoveisComOffset = imoveis.map((imovel) => {
        const coordKey = `${imovel.latitude.toFixed(6)}_${imovel.longitude.toFixed(6)}`
        const count = coordenadasMap.get(coordKey) || 0
        coordenadasMap.set(coordKey, count + 1)

        // Aplicar pequeno offset aleatório se houver duplicatas (máximo 0.001 graus ≈ 111 metros)
        let latOffset = 0
        let lngOffset = 0
        if (count > 0) {
          const angle = (count * 60) * (Math.PI / 180) // Distribuir em círculo
          const radius = 0.0005 * count // Aumentar raio conforme mais duplicatas
          latOffset = Math.cos(angle) * radius
          lngOffset = Math.sin(angle) * radius
        }

        return {
          ...imovel,
          latitude: imovel.latitude + latOffset,
          longitude: imovel.longitude + lngOffset
        }
      })

      // Adicionar marcadores para cada imóvel
      imoveisComOffset.forEach((imovel) => {
        // Criar ícone customizado com formato de Pin tradicional e valor dentro
        const customIcon = L.divIcon({
          className: 'custom-price-marker',
          html: `
            <div style="position: relative; width: 44px; height: 56px; display: flex; flex-direction: column; align-items: center;">
              <svg viewBox="0 0 24 24" style="width: 44px; height: 56px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" fill="#DC2626" stroke="white" stroke-width="1.5">
                <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z"/>
              </svg>
              <div style="
                position: absolute;
                top: 8px;
                width: 32px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: ${imovel.preco > 0 ? '9px' : '7px'};
                font-weight: 800;
                line-height: 1;
                text-align: center;
                pointer-events: none;
                word-wrap: break-word;
                padding: 0 2px;
              ">
                ${formatarPreco(imovel.preco).replace('R$', '').trim()}
              </div>
            </div>
          `,
          iconSize: [44, 56],
          iconAnchor: [22, 56] // Ponta do Pin no centro inferior
        })

        // Criar marcador
        const marker = L.marker([imovel.latitude, imovel.longitude], {
          icon: customIcon
        }).addTo(map)

        const linhasPopup = [
          criarLinhaInfo(icones.tipo, 'Tipo:', imovel.tipo_nome ?? 'N/D'),
          criarLinhaInfo(icones.quartos, 'Quartos:', String(imovel.quartos ?? 0)),
          imovel.suites && imovel.suites > 0
            ? criarLinhaInfo(icones.suites, 'Suítes:', String(imovel.suites))
            : '',
          criarLinhaInfo(icones.banheiros, 'Banheiros:', String(imovel.banheiros ?? 0)),
          criarLinhaInfo(icones.garagem, 'Garagem:', String(imovel.vagas_garagem ?? 0)),
          imovel.andar !== null
            ? criarLinhaInfo(icones.andar, 'Andar:', String(imovel.andar))
            : '',
          imovel.total_andares !== null
            ? criarLinhaInfo(icones.totalAndares, 'Total de Andares:', String(imovel.total_andares))
            : '',
          criarLinhaInfo(icones.preco, 'Preço:', formatarPreco(imovel.preco), true),
          imovel.preco_condominio !== null
            ? criarLinhaInfo(icones.condominio, 'Condomínio:', formatarPreco(imovel.preco_condominio))
            : '',
          imovel.preco_iptu !== null
            ? criarLinhaInfo(icones.iptu, 'IPTU:', formatarPreco(imovel.preco_iptu))
            : '',
          imovel.taxa_extra !== null
            ? criarLinhaInfo(icones.taxas, 'Taxas Extras:', formatarPreco(imovel.taxa_extra))
            : ''
        ].filter(Boolean).join('')

        const popupContent = `
          <div style="padding: 20px; min-width: 320px; border-radius: 16px; border: 2px solid #93c5fd; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); background: white;">
            <div style="font-size: 14px; display: flex; flex-direction: column;">
              ${linhasPopup}
            </div>
          </div>
        `

        // Não usar popup do Leaflet - usar modal customizado
        // Não exibir tooltip no hover - apenas popup no clique

        marker.on('click', (e) => {
          e.originalEvent?.stopPropagation()
          // Fechar qualquer popup do Leaflet que possa estar aberto
          if (marker.getPopup()) {
            marker.closePopup()
          }
          // Chamar callback do componente pai
          if (onImovelClick) {
            onImovelClick(imovel)
          } else {
            setPopupImovel(imovel)
          }
        })

        // Garantir que nenhum popup do Leaflet seja aberto
        marker.off('popupopen')
        marker.off('popupclose')

        markersRef.current.push(marker)
      })

      // Ajustar o mapa para mostrar todas as bolhas com padding
      if (imoveisComOffset.length > 0) {
        const bounds = L.latLngBounds(
          imoveisComOffset.map(i => [i.latitude, i.longitude] as [number, number])
        )

        // Ajustar bounds com padding de 10% nas bordas
        map.fitBounds(bounds, {
          padding: [50, 50], // Padding em pixels nas bordas
          maxZoom: 15, // Limitar zoom máximo para não ficar muito próximo
          animate: false // Sem animação para carregamento inicial mais rápido
        })
      }

      // Armazenar referência do mapa
      mapInstanceRef.current = map

      // Cleanup
      return () => {
        if (mapInstanceRef.current) {
          markersRef.current.forEach(marker => marker.remove())
          markersRef.current = []
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }
      }
    }).catch((error) => {
      console.error('Erro ao carregar Leaflet:', error)
    })
  }, [isClient, imoveis, mapCenter, minPreco, maxPreco])

  if (!isClient || imoveis.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  // Função helper para criar linhas do modal
  const criarLinhasModal = (imovel: ImovelMapa) => {
    return [
      criarLinhaInfo(icones.tipo, 'Tipo:', imovel.tipo_nome ?? 'N/D'),
      criarLinhaInfo(icones.quartos, 'Quartos:', String(imovel.quartos ?? 0)),
      imovel.suites && imovel.suites > 0
        ? criarLinhaInfo(icones.suites, 'Suítes:', String(imovel.suites))
        : '',
      criarLinhaInfo(icones.banheiros, 'Banheiros:', String(imovel.banheiros ?? 0)),
      criarLinhaInfo(icones.garagem, 'Garagem:', String(imovel.vagas_garagem ?? 0)),
      imovel.andar !== null
        ? criarLinhaInfo(icones.andar, 'Andar:', String(imovel.andar))
        : '',
      imovel.total_andares !== null
        ? criarLinhaInfo(icones.totalAndares, 'Total de Andares:', String(imovel.total_andares))
        : '',
      criarLinhaInfo(icones.preco, 'Preço:', formatarPreco(imovel.preco), true),
      imovel.preco_condominio !== null
        ? criarLinhaInfo(icones.condominio, 'Condomínio:', formatarPreco(imovel.preco_condominio))
        : '',
      imovel.preco_iptu !== null
        ? criarLinhaInfo(icones.iptu, 'IPTU:', formatarPreco(imovel.preco_iptu))
        : '',
      imovel.taxa_extra !== null
        ? criarLinhaInfo(icones.taxas, 'Taxas Extras:', formatarPreco(imovel.taxa_extra))
        : ''
    ].filter(Boolean).join('')
  }

  const modalContent = popupImovel && mounted ? (
    <div
      id="modal-overlay-custom"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: '999999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0',
        padding: '0',
        boxSizing: 'border-box',
        overflow: 'auto'
      }}
      onClick={() => setPopupImovel(null)}
    >
      <div
        id="modal-content-custom"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '2px solid #93c5fd',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '20px',
          minWidth: '320px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '0',
          position: 'relative',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={() => setPopupImovel(null)}
            style={{
              color: '#6b7280',
              fontSize: '24px',
              fontWeight: 'bold',
              lineHeight: 1,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div
          style={{ fontSize: '14px', display: 'flex', flexDirection: 'column' }}
          dangerouslySetInnerHTML={{ __html: criarLinhasModal(popupImovel) }}
        />
      </div>
    </div>
  ) : null

  return (
    <>
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{
          height: '100%',
          width: '100%',
          minHeight: '400px',
          position: 'relative',
          zIndex: 1
        }}
      />
      {mounted && typeof window !== 'undefined' && document.body && modalContent && createPortal(modalContent, document.body)}
    </>
  )
}
