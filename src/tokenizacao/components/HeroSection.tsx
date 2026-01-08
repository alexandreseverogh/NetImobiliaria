/* eslint-disable */
'use client'

import { useState } from 'react'
import { Search, MapPin, Home, Building } from 'lucide-react'

export default function HeroSection() {
  const [searchType, setSearchType] = useState('buy')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implementar lÃ³gica de busca
    console.log('Busca:', { searchType, location, propertyType })
  }

  return (
    <section className="relative bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Encontre seu ImÃ³vel dos Sonhos
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto">
            A Net ImobiliÃ¡ria oferece os melhores imÃ³veis em SÃ£o Paulo. 
            Comprar, vender ou alugar nunca foi tÃ£o fÃ¡cil.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Type */}
              <div className="md:col-span-1">
                <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSearchType('buy')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      searchType === 'buy'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Home className="w-4 h-4 inline mr-2" />
                    Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('rent')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      searchType === 'rent'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-4 h-4 inline mr-2" />
                    Alugar
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="md:col-span-1">
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
              <div className="md:col-span-1">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                >
                  <option value="">Tipo de ImÃ³vel</option>
                  <option value="apartment">Apartamento</option>
                  <option value="house">Casa</option>
                  <option value="commercial">Comercial</option>
                  <option value="land">Terreno</option>
                </select>
              </div>

              {/* Search Button */}
              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Buscar
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold mb-2">500+</div>
            <div className="text-primary-100">ImÃ³veis DisponÃ­veis</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold mb-2">1000+</div>
            <div className="text-primary-100">Clientes Satisfeitos</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold mb-2">15+</div>
            <div className="text-primary-100">Anos de ExperiÃªncia</div>
          </div>
        </div>
      </div>
    </section>
  )
}


