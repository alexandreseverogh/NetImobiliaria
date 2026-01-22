'use client'

import Image from 'next/image'
import { Bed, Bath, Square, MapPin, Heart } from 'lucide-react'
import { useState } from 'react'

interface Property {
  id: number
  title: string
  price: string
  location: string
  bedrooms: number
  bathrooms: number
  area: string
  image: string
  type: string
}

interface PropertyCardProps {
  property: Property
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <div className="card overflow-hidden group">
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={property.image}
          alt={property.title}
          fill
          className="object-contain group-hover:scale-105 transition-transform duration-300"
        />

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
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Price */}
        <div className="mb-3">
          <span className="text-2xl font-bold text-primary-600">
            {property.price}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm">{property.location}</span>
        </div>

        {/* Property Details */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <Bed className="w-4 h-4 mr-1 text-gray-400" />
            <span>{property.bedrooms} quartos</span>
          </div>
          <div className="flex items-center">
            <Bath className="w-4 h-4 mr-1 text-gray-400" />
            <span>{property.bathrooms} banheiros</span>
          </div>
          <div className="flex items-center">
            <Square className="w-4 h-4 mr-1 text-gray-400" />
            <span>{property.area}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <button className="btn-primary flex-1">
            Ver Detalhes
          </button>
          <button className="btn-secondary flex-1">
            Agendar Visita
          </button>
        </div>
      </div>
    </div>
  )
}

