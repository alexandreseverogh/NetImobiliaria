import PropertyCard from '@/components/PropertyCard'
import SearchForm from '@/components/SearchForm'
import { Filter, Grid, List } from 'lucide-react'

export default function ImoveisPage() {
  const allProperties = [
    {
      id: 1,
      title: 'Apartamento de Luxo no Jardins',
      price: 'R$ 2.500.000',
      location: 'Jardins, São Paulo',
      bedrooms: 3,
      bathrooms: 2,
      area: '120m²',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 2,
      title: 'Casa Moderna em Pinheiros',
      price: 'R$ 1.800.000',
      location: 'Pinheiros, São Paulo',
      bedrooms: 4,
      bathrooms: 3,
      area: '180m²',
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 3,
      title: 'Cobertura Duplex na Vila Madalena',
      price: 'R$ 3.200.000',
      location: 'Vila Madalena, São Paulo',
      bedrooms: 3,
      bathrooms: 2,
      area: '150m²',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 4,
      title: 'Apartamento 2 Quartos no Itaim Bibi',
      price: 'R$ 1.200.000',
      location: 'Itaim Bibi, São Paulo',
      bedrooms: 2,
      bathrooms: 2,
      area: '85m²',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 5,
      title: 'Casa com Piscina em Moema',
      price: 'R$ 4.500.000',
      location: 'Moema, São Paulo',
      bedrooms: 5,
      bathrooms: 4,
      area: '280m²',
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 6,
      title: 'Loft Industrial na Vila Madalena',
      price: 'R$ 2.800.000',
      location: 'Vila Madalena, São Paulo',
      bedrooms: 2,
      bathrooms: 2,
      area: '95m²',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      type: 'Venda'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Catálogo de Imóveis
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Descubra nossa seleção exclusiva de imóveis em São Paulo. 
            Encontre o lar perfeito para você e sua família.
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchForm />
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Results and View Options */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {allProperties.length} Imóveis Encontrados
              </h2>
              <p className="text-gray-600">
                Mostrando todos os imóveis disponíveis
              </p>
            </div>
            
            {/* View Options */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Visualizar:</span>
              <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                <button className="p-2 rounded-md bg-primary-100 text-primary-600">
                  <Grid className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-md text-gray-400 hover:text-gray-600">
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center mt-12">
            <button className="btn-secondary px-8 py-3 text-lg">
              Carregar Mais Imóveis
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

