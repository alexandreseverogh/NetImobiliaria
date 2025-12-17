'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Search, Phone, MapPin } from 'lucide-react'
import AuthButtons from '@/components/public/auth/AuthButtons'

interface HeaderProps {
  selectedCidade?: string
  selectedEstado?: string
}

export default function Header({ selectedCidade, selectedEstado }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [displayLocation, setDisplayLocation] = useState<string>('Recife, PE')

  // Carregar localização do localStorage na inicialização
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const savedCidade = localStorage.getItem('header-selected-cidade')
    const savedEstado = localStorage.getItem('header-selected-estado')
    
    if (savedCidade && savedEstado) {
      setDisplayLocation(`${savedCidade}, ${savedEstado}`)
    }
  }, [])

  // Atualizar localização exibida quando receber props
  useEffect(() => {
    if (selectedCidade && selectedEstado) {
      const location = `${selectedCidade}, ${selectedEstado}`
      setDisplayLocation(location)
      localStorage.setItem('header-selected-cidade', selectedCidade)
      localStorage.setItem('header-selected-estado', selectedEstado)
    }
  }, [selectedCidade, selectedEstado])

  // Escutar eventos de mudança de localização (do modal de geolocalização)
  useEffect(() => {
    const handleLocationChange = (event: CustomEvent) => {
      const { cidade, estado } = event.detail || {}
      if (cidade && estado) {
        const location = `${cidade}, ${estado}`
        setDisplayLocation(location)
        localStorage.setItem('header-selected-cidade', cidade)
        localStorage.setItem('header-selected-estado', estado)
      }
    }

    window.addEventListener('geolocation-confirmed', handleLocationChange as EventListener)
    return () => {
      window.removeEventListener('geolocation-confirmed', handleLocationChange as EventListener)
    }
  }, [])

  const navigation = [
    { name: 'Início', href: '/' },
    { name: 'Tokenização', href: '/tokenizacao', highlight: true },
    { name: 'Imóveis', href: '/imoveis' },
    { name: 'Investidor', href: '/investidor' },
    { name: 'Sobre', href: '/sobre' },
    { name: 'Contato', href: '/contato' },
  ]

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="w-full">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="NET IMOBILIÁRIA"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 flex-1 justify-center px-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Área Direita: Contact Info e Botão de Autenticação */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0 pr-4 sm:pr-6 lg:pr-8">
            {/* Contact Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                <span>(81) 99901-2600</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{displayLocation}</span>
              </div>
            </div>
            {/* Botão de Autenticação - Separado e à direita */}
            <div className="pl-4 border-l border-gray-300">
              <AuthButtons />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600 p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4 mr-2" />
                <span>(81) 99901-2600</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{displayLocation}</span>
              </div>
              {/* Botão de Autenticação Mobile */}
              <div className="pt-2 border-t">
                <AuthButtons />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

