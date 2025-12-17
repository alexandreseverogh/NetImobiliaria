'use client'

import { useEffect, useState, useRef } from 'react'

interface MapaWrapperProps {
  latitude: number
  longitude: number
  titulo: string
  endereco: string
}

export default function MapaWrapper({ latitude, longitude, titulo, endereco }: MapaWrapperProps) {
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  // Verificar se as coordenadas são válidas
  const hasValidCoordinates = typeof latitude === 'number' && typeof longitude === 'number' && latitude !== 0 && longitude !== 0

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !hasValidCoordinates || !mapRef.current || mapInstanceRef.current) {
      return
    }

    // Importar Leaflet dinamicamente apenas no cliente
    import('leaflet').then((L) => {
      // Configurar ícones padrão do Leaflet
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Criar mapa
      const map = L.map(mapRef.current!, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: true
      })

      // Adicionar camada de tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Adicionar marcador
      const marker = L.marker([latitude, longitude]).addTo(map)

      // Adicionar popup
      const popupContent = `
        <div style="text-align: center;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${titulo}</div>
          ${endereco ? `<div style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">${endereco}</div>` : ''}
          <div style="font-size: 12px; color: #6b7280;">
            Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}
          </div>
        </div>
      `
      
      marker.bindPopup(popupContent)

      // Armazenar referência do mapa
      mapInstanceRef.current = map

      // Cleanup
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }
      }
    }).catch((error) => {
      console.error('Erro ao carregar Leaflet:', error)
    })
  }, [isClient, hasValidCoordinates, latitude, longitude, titulo, endereco])

  if (!isClient) {
    return (
      <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  if (!hasValidCoordinates) {
    return (
      <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-lg text-gray-600">Coordenadas inválidas</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapRef}
      className="h-full w-full rounded-lg overflow-hidden border border-gray-200"
    />
  )
}
