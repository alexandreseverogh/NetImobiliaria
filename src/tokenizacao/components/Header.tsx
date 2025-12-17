'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Search, Phone, MapPin, TrendingUp } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: 'Início', href: '/' },
    { name: 'Tokenização', href: '/tokenizacao' },
    { name: 'Imóveis', href: '/imoveis' },
    { name: 'Investidor', href: '/investidor' },
    { name: 'Sobre', href: '/sobre' },
    { name: 'Contato', href: '/contato' },
  ]

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="NET IMOBILIÁRIA TOKENIZAÇÃO"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
              <span className="ml-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full font-medium">
                TOKENIZAÇÃO
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  item.name === 'Tokenização' 
                    ? 'text-blue-600 font-bold' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.name}
                {item.name === 'Tokenização' && (
                  <TrendingUp className="inline ml-1 h-3 w-3" />
                )}
              </Link>
            ))}
          </nav>

          {/* Contact Info */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2" />
              <span>(11) 99999-9999</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>São Paulo, SP</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2"
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
                className={`block px-3 py-2 text-base font-medium transition-colors ${
                  item.name === 'Tokenização' 
                    ? 'text-blue-600 font-bold' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
                {item.name === 'Tokenização' && (
                  <TrendingUp className="inline ml-1 h-3 w-3" />
                )}
              </Link>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4 mr-2" />
                <span>(11) 99999-9999</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>São Paulo, SP</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}