/* eslint-disable */
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Mail, MapPin, Phone, TrendingUp, Shield } from 'lucide-react'

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
                alt="Imovtec Tokenização"
                width={180}
                height={60}
                className="h-16 w-auto"
              />
              <span className="ml-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full font-medium">
                TOKENIZAÃ‡ÃƒO
              </span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              A Net ImobiliÃ¡ria TokenizaÃ§Ã£o democratiza o acesso ao mercado imobiliÃ¡rio premium
              atravÃ©s de tokens digitais seguros e regulamentados pela CVM.
            </p>

            {/* Compliance Badge */}
            <div className="flex items-center mb-4 p-3 bg-blue-900/50 rounded-lg border border-blue-700">
              <Shield className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-sm text-blue-300">
                Plataforma regulamentada pela CVM
              </span>
            </div>

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

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Links RÃ¡pidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  InÃ­cio
                </Link>
              </li>
              <li>
                <Link href="/tokenizacao" className="text-gray-300 hover:text-white transition-colors flex items-center">
                  TokenizaÃ§Ã£o
                  <TrendingUp className="ml-1 h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="/imoveis" className="text-gray-300 hover:text-white transition-colors">
                  ImÃ³veis
                </Link>
              </li>
              <li>
                <Link href="/investidor" className="text-gray-300 hover:text-white transition-colors">
                  Portal do Investidor
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="text-gray-300 hover:text-white transition-colors">
                  Sobre NÃ³s
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-gray-300 hover:text-white transition-colors">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Phone className="w-4 h-4 mr-3 text-blue-400" />
                <span>(11) 99999-9999</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Mail className="w-4 h-4 mr-3 text-blue-400" />
                <span>contato@netimobiliaria-tokenizacao.com</span>
              </div>
              <div className="flex items-start text-gray-300">
                <MapPin className="w-4 h-4 mr-3 mt-1 text-blue-400 flex-shrink-0" />
                <span>Av. Paulista, 1000<br />Bela Vista, SÃ£o Paulo - SP<br />CEP: 01.310-100</span>
              </div>
            </div>

            {/* Tokenization Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">
                TokenizaÃ§Ã£o de ImÃ³veis
              </h4>
              <p className="text-xs text-gray-400">
                Investimento a partir de R$ 100<br />
                ROI mÃ©dio: 12-15% ao ano<br />
                Dividendos mensais automÃ¡ticos
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              Â© 2024 Net ImobiliÃ¡ria TokenizaÃ§Ã£o. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacidade" className="text-gray-400 hover:text-white text-sm transition-colors">
                PolÃ­tica de Privacidade
              </Link>
              <Link href="/termos" className="text-gray-400 hover:text-white text-sm transition-colors">
                Termos de Uso
              </Link>
              <Link href="/compliance" className="text-gray-400 hover:text-white text-sm transition-colors">
                Compliance CVM
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
