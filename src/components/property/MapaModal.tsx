'use client'

import { useState, useEffect } from 'react'
import MapaWrapper from './MapaWrapper'

interface MapaModalProps {
  isOpen: boolean
  onClose: () => void
  latitude?: number | string
  longitude?: number | string
  titulo?: string
  endereco?: string
}

export default function MapaModal({ 
  isOpen, 
  onClose, 
  latitude, 
  longitude, 
  titulo = 'Imóvel',
  endereco = ''
}: MapaModalProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Converter coordenadas para números se forem strings
  const latNumber = typeof latitude === 'string' ? parseFloat(latitude) : latitude
  const lonNumber = typeof longitude === 'string' ? parseFloat(longitude) : longitude

  console.log('🔍 MapaModal - Coordenadas recebidas:', { latitude, longitude, latNumber, lonNumber })

  // Verificar se as coordenadas estão disponíveis
  const hasCoordinates = typeof latNumber === 'number' && typeof lonNumber === 'number' && !isNaN(latNumber) && !isNaN(lonNumber) && latNumber !== 0 && lonNumber !== 0

  // Coordenadas padrão (Recife) se não houver coordenadas do imóvel
  const defaultLat = -8.047562
  const defaultLon = -34.877003
  const defaultZoom = 13

  const mapLat = hasCoordinates ? latNumber : defaultLat
  const mapLon = hasCoordinates ? lonNumber : defaultLon
  const mapZoom = hasCoordinates ? 16 : defaultZoom


  if (!isMounted) {
    return null
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-2">
            <div className="relative w-full max-w-7xl h-[90vh] transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Localização do Imóvel
                  </h3>
                  {titulo && (
                    <p className="text-sm text-gray-600">{titulo}</p>
                  )}
                  {endereco && (
                    <p className="text-sm text-gray-500">{endereco}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col h-[calc(90vh-120px)]">
                <div className="flex-shrink-0 p-6 pb-4">
                  {hasCoordinates ? (
                    <div className="space-y-4">
                      {/* Informações das coordenadas */}
                      <div className="flex items-center justify-between text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                        <div className="text-base">
                          <span className="font-medium">Latitude:</span> {typeof latNumber === 'number' ? latNumber.toFixed(6) : 'N/A'}
                        </div>
                        <div className="text-base">
                          <span className="font-medium">Longitude:</span> {typeof lonNumber === 'number' ? lonNumber.toFixed(6) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Mapa - Ocupa o espaço restante */}
                <div className="flex-1 p-6 pt-0" style={{ minHeight: '0' }}>
                  {hasCoordinates ? (
                    <MapaWrapper
                      latitude={mapLat}
                      longitude={mapLon}
                      titulo={titulo}
                      endereco={endereco}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center py-12">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
                          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-3">
                          Coordenadas não disponíveis
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          As coordenadas geográficas deste imóvel não estão disponíveis.
                          Isso pode acontecer se o endereço não foi encontrado ou se as coordenadas não foram calculadas.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {hasCoordinates && (
                  <div className="flex-shrink-0 p-6 pt-2 pb-2 border-t border-gray-200 bg-white">
                    {/* Links úteis */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <a
                        href={`https://www.google.com/maps/@${latNumber},${lonNumber},18z`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Google Maps
                      </a>
                      <a
                        href={`https://earth.google.com/web/@${latNumber},${lonNumber},100a,35y,0h,0t,0r`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                        </svg>
                        Google Earth
                      </a>
                      <a
                        href={`https://www.waze.com/ul?ll=${latNumber},${lonNumber}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Waze
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${latNumber}&mlon=${lonNumber}&zoom=16&layers=T`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path fillRule="evenodd" d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                        Transporte Público
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
