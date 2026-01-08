/* eslint-disable */
'use client'

import { useState } from 'react'
import { Search, MapPin, Home, Building, DollarSign, Bed, Bath, Square } from 'lucide-react'

export default function SearchForm() {
  const [searchType, setSearchType] = useState('buy')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [area, setArea] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implementar lÃ³gica de busca avanÃ§ada
    console.log('Busca AvanÃ§ada:', {
      searchType,
      location,
      propertyType,
      priceRange,
      bedrooms,
      bathrooms,
      area
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <form onSubmit={handleSearch} className="space-y-6">
        {/* Search Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de OperaÃ§Ã£o
          </label>
          <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setSearchType('buy')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                searchType === 'buy'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-5 h-5 inline mr-2" />
              Comprar
            </button>
            <button
              type="button"
              onClick={() => setSearchType('rent')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                searchType === 'rent'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building className="w-5 h-5 inline mr-2" />
              Alugar
            </button>
          </div>
        </div>

        {/* Main Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LocalizaÃ§Ã£o
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Bairro, cidade..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de ImÃ³vel
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="">Todos os tipos</option>
              <option value="apartment">Apartamento</option>
              <option value="house">Casa</option>
              <option value="commercial">Comercial</option>
              <option value="land">Terreno</option>
              <option value="office">EscritÃ³rio</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Faixa de PreÃ§o
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              >
                <option value="">Qualquer preÃ§o</option>
                <option value="0-200000">AtÃ© R$ 200.000</option>
                <option value="200000-500000">R$ 200.000 - R$ 500.000</option>
                <option value="500000-1000000">R$ 500.000 - R$ 1.000.000</option>
                <option value="1000000-2000000">R$ 1.000.000 - R$ 2.000.000</option>
                <option value="2000000+">Acima de R$ 2.000.000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quartos
            </label>
            <div className="relative">
              <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              >
                <option value="">Qualquer quantidade</option>
                <option value="1">1 quarto</option>
                <option value="2">2 quartos</option>
                <option value="3">3 quartos</option>
                <option value="4">4 quartos</option>
                <option value="5+">5+ quartos</option>
              </select>
            </div>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banheiros
            </label>
            <div className="relative">
              <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              >
                <option value="">Qualquer quantidade</option>
                <option value="1">1 banheiro</option>
                <option value="2">2 banheiros</option>
                <option value="3">3 banheiros</option>
                <option value="4">4 banheiros</option>
                <option value="5+">5+ banheiros</option>
              </select>
            </div>
          </div>

          {/* Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ãrea MÃ­nima
            </label>
            <div className="relative">
              <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              >
                <option value="">Qualquer Ã¡rea</option>
                <option value="50">50mÂ²</option>
                <option value="80">80mÂ²</option>
                <option value="120">120mÂ²</option>
                <option value="150">150mÂ²</option>
                <option value="200">200mÂ²</option>
                <option value="300">300mÂ²</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="text-center">
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-12 rounded-lg transition-colors duration-200 flex items-center justify-center mx-auto text-lg"
          >
            <Search className="w-6 h-6 mr-3" />
            Buscar ImÃ³veis
          </button>
        </div>
      </form>
    </div>
  )
}


