'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Heart, Square } from 'lucide-react'
import { useState } from 'react'
import TenhoInteressePopup from './TenhoInteressePopup'

interface Property {
  id: number
  title: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: string
  garages: number
  image: string
  type: string
  lancamento?: boolean
}

interface LandingPropertyCardProps {
  property: Property
  onTenhoInteresseClick?: (imovelId: number, imovelTitulo?: string) => void
}

export default function LandingPropertyCard({ property, onTenhoInteresseClick }: LandingPropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [showTenhoInteresseModal, setShowTenhoInteresseModal] = useState(false)

  return (
    <div className="card overflow-hidden group w-full relative" style={{ position: 'relative' }}>
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden bg-gray-100" style={{ position: 'relative' }}>
        {property.image && (property.image.startsWith('data:') || property.image.startsWith('http') || property.image.startsWith('/')) ? (
          <Image
            src={property.image}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
            <svg className="w-24 h-24 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-semibold text-sm mb-1">Imagem Principal</p>
            <p className="text-gray-400 text-xs">Não disponível</p>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <Heart
            className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
          />
        </button>

        {/* Property Type Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            {property.type}
          </span>
        </div>

        {/* Lançamento Badge (Top Center) - Same structure as Property Type */}
        {property.lancamento && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap">
              Lançamento
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4" style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* Price */}
        <div className="mb-3">
          <span className="text-2xl font-bold text-primary-600">
            {property.price}
          </span>
        </div>

        {/* Title - Altura fixa de 2 linhas para padronizar todos os cards */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 h-[3.5rem] overflow-hidden break-words leading-tight">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm">{property.location}</span>
        </div>

        {/* Property Details */}
        <div className="flex gap-1 w-full">
          <div className="text-center bg-gray-50 rounded p-1 flex-none" style={{ width: '95px', minWidth: '95px' }}>
            <div className="flex items-center justify-center mb-0.5">
              <Square className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </div>
            <div className="text-[9px] text-gray-500">Área</div>
            <div className="text-xs font-semibold text-gray-900 break-words leading-tight whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{property.area}</div>
          </div>
          <div className="text-center bg-gray-50 rounded p-1 flex-1 min-w-0">
            <div className="flex items-center justify-center mb-0.5">
              <Image src="/Assets/quarto.png" alt="Quarto" width={14} height={14} className="w-3.5 h-3.5 flex-shrink-0" />
            </div>
            <div className="text-[9px] text-gray-500">Quartos</div>
            <div className="text-xs font-semibold text-gray-900 break-words">{property.bedrooms}</div>
          </div>
          <div className="text-center bg-gray-50 rounded p-1 flex-1 min-w-0">
            <div className="flex items-center justify-center mb-0.5">
              <Image src="/Assets/banheiro-publico.png" alt="Banheiro" width={14} height={14} className="w-3.5 h-3.5 flex-shrink-0" />
            </div>
            <div className="text-[9px] text-gray-500">Banheiros</div>
            <div className="text-xs font-semibold text-gray-900 break-words">{property.bathrooms}</div>
          </div>
          <div className="text-center bg-gray-50 rounded p-1 flex-1 min-w-0">
            <div className="flex items-center justify-center mb-0.5">
              <Image src="/Assets/garagem.png" alt="Garagem" width={14} height={14} className="w-3.5 h-3.5 flex-shrink-0" />
            </div>
            <div className="text-[9px] text-gray-500">Garagem</div>
            <div className="text-xs font-semibold text-gray-900 break-words">{property.garages}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-2">
          <Link
            href={`/imoveis/${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors duration-200 whitespace-nowrap text-sm"
          >
            Ver Detalhes
          </Link>
          <button
            onClick={() => {
              console.log('🔍 [LANDING PROPERTY CARD] Botão Tenho Interesse clicado, delegando para handler:', property.id)
              if (onTenhoInteresseClick) {
                onTenhoInteresseClick(property.id, property.title)
              }
            }}
            className="flex-1 bg-white hover:bg-gray-50 text-primary-600 font-semibold py-2.5 px-3 rounded-lg border border-primary-600 transition-colors duration-200 whitespace-nowrap text-sm text-center"
          >
            Tenho Interesse
          </button>
        </div>
      </div>

      {/* Modal Tenho Interesse (cadastro/login) */}
      <TenhoInteressePopup
        isOpen={showTenhoInteresseModal}
        onClose={() => setShowTenhoInteresseModal(false)}
        onCadastrarClick={() => {
          console.log('🔍 [LANDING PROPERTY CARD] Cadastrar clicado no modal Tenho Interesse')
          setShowTenhoInteresseModal(false)
          // Armazenar imovelId e título temporariamente para usar após cadastro
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pendingImovelId', property.id.toString())
            sessionStorage.setItem('pendingImovelTitulo', property.title)
          }
          // Chamar handler se disponível
          if (onTenhoInteresseClick) {
            onTenhoInteresseClick(property.id, property.title)
          }
        }}
        onLoginClick={() => {
          console.log('🔍 [LANDING PROPERTY CARD] Login clicado no modal Tenho Interesse')
          setShowTenhoInteresseModal(false)
          // Armazenar imovelId e título temporariamente para usar após login
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pendingImovelId', property.id.toString())
            sessionStorage.setItem('pendingImovelTitulo', property.title)
            // Disparar evento para abrir modal de login (não cadastro)
            window.dispatchEvent(new CustomEvent('open-auth-modal', {
              detail: { mode: 'login', userType: 'cliente', imovelId: property.id }
            }))
          }
        }}
        imovelId={property.id}
        imovelTitulo={property.title}
      />
    </div>
  )
}

