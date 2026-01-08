/* eslint-disable */
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSection from '@/components/HeroSection'
import PropertyCard from '@/components/PropertyCard'
import SearchForm from '@/components/SearchForm'

export default function Home() {
  const featuredProperties = [
    {
      id: 1,
      title: 'Apartamento de Luxo no Jardins',
      price: 'R$ 2.500.000',
      location: 'Jardins, SÃ£o Paulo',
      bedrooms: 3,
      bathrooms: 2,
      area: '120mÂ²',
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 2,
      title: 'Casa Moderna em Pinheiros',
      price: 'R$ 1.800.000',
      location: 'Pinheiros, SÃ£o Paulo',
      bedrooms: 4,
      bathrooms: 3,
      area: '180mÂ²',
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
      type: 'Venda'
    },
    {
      id: 3,
      title: 'Cobertura Duplex na Vila Madalena',
      price: 'R$ 3.200.000',
      location: 'Vila Madalena, SÃ£o Paulo',
      bedrooms: 3,
      bathrooms: 2,
      area: '150mÂ²',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      type: 'Venda'
    }
  ]

  return (
    <div className="min-h-screen">
      <Header />
      
      <HeroSection />
      
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ImÃ³veis em Destaque
          </h2>
          <p className="text-lg text-gray-600">
            Descubra as melhores oportunidades do mercado imobiliÃ¡rio
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
      
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Encontre seu ImÃ³vel Ideal
            </h2>
            <p className="text-lg text-gray-600">
              Use nossa busca avanÃ§ada para encontrar exatamente o que procura
            </p>
          </div>
          <SearchForm />
        </div>
      </section>
      
      <Footer />
    </div>
  )
}


