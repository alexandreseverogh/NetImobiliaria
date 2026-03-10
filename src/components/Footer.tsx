'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <Image
                src="/imovtec-logo-definitive.png"
                alt="Imovtec"
                width={180}
                height={60}
                className="h-16 w-auto"
              />
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              A Imovtec é referência no mercado imobiliário de Recife,
              oferecendo os melhores imóveis com atendimento personalizado e profissional.
            </p>

            {/* Social Media */}
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>

            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Links R\u00E1pidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/landpaging" className="text-gray-300 hover:text-white transition-colors">
                  In\u00EDcio
                </Link>
              </li>
              <li>
                <Link href="/anunciar-imovel" className="text-gray-300 hover:text-white transition-colors">
                  Anunciar Im\u00F3veis
                </Link>
              </li>
              <li>
                <Link href="/procurar-imovel" className="text-gray-300 hover:text-white transition-colors">
                  Procurar Im\u00F3veis
                </Link>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/landpaging?openModal=about'}
                  className="text-gray-300 hover:text-white transition-colors text-left"
                >
                  Quem Somos
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/landpaging?openModal=contact'}
                  className="text-gray-300 hover:text-white transition-colors text-left"
                >
                  Contato
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-primary-400" />
                <span>(81) 98866.6600</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-primary-400" />
                <span>contato@netimobiliaria.com.br</span>
              </div>
              <div className="flex items-start text-gray-300">
                <MapPin className="w-4 h-4 mr-3 mt-1 text-primary-400 flex-shrink-0" />
                <span>Rua General Mac Arthur, 1852<br />Imbiribeira, Recife - PE<br />CEP: 51.160-070</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2026 Imovtec. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacidade" className="text-gray-400 hover:text-white text-sm transition-colors">
                Política de Privacidade
              </Link>
              <Link href="/termos" className="text-gray-400 hover:text-white text-sm transition-colors">
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

