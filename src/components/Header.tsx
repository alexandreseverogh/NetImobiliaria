'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Search, Phone, MapPin } from 'lucide-react'
import AuthButtons from '@/components/public/auth/AuthButtons'
import UserSuccessModal from '@/components/public/auth/UserSuccessModal'

interface HeaderProps {
  selectedCidade?: string
  selectedEstado?: string
}

export default function Header({ selectedCidade, selectedEstado }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [displayLocation, setDisplayLocation] = useState<string>('Recife, PE')
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showThankYouModal, setShowThankYouModal] = useState(false)
  const [contactForm, setContactForm] = useState({ nome: '', telefone: '', email: '', mensagem: '' })
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar localiza├º├úo do localStorage na inicializa├º├úo
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedCidade = localStorage.getItem('header-selected-cidade')
    const savedEstado = localStorage.getItem('header-selected-estado')

    if (savedCidade && savedEstado) {
      setDisplayLocation(`${savedCidade}, ${savedEstado}`)
    }
  }, [])

  // Atualizar localiza├º├úo exibida quando receber props
  useEffect(() => {
    if (selectedCidade && selectedEstado) {
      const location = `${selectedCidade}, ${selectedEstado}`
      setDisplayLocation(location)
      localStorage.setItem('header-selected-cidade', selectedCidade)
      localStorage.setItem('header-selected-estado', selectedEstado)
    }
  }, [selectedCidade, selectedEstado])

  // Escutar eventos de mudan├ºa de localiza├º├úo (do modal de geolocaliza├º├úo)
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

  // --- LOGICA GLOBAL DO MODAL DO CORRETOR (DASHBOARD) ---
  const [corretorHomeSuccessOpen, setCorretorHomeSuccessOpen] = useState(false)
  const [corretorHomeUser, setCorretorHomeUser] = useState<any>(null)

  useEffect(() => {
    // Verificar se há parâmetro na URL para abrir o dashboard do corretor
    const searchParams = new URLSearchParams(window.location.search)
    const shouldOpen = searchParams.get('corretor_home') === 'true'
    if (!shouldOpen) return

    // Tentar recuperar do sessionStorage (onde CorretorLoginModal salva na landpaging padrão)
    const raw = sessionStorage.getItem('corretor_success_user')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.nome && parsed?.email) {
          // Delay de 2s (requisito UX original para o usuário ver o grid primeiro se for na landpaging)
          const timer = setTimeout(() => {
            setCorretorHomeUser(parsed)
            setCorretorHomeSuccessOpen(true)

            // Limpar o parâmetro da URL imediatamente
            const url = new URL(window.location.href)
            url.searchParams.delete('corretor_home')
            window.history.replaceState({}, '', url.pathname + url.search)
          }, 2000)
          return () => clearTimeout(timer)
        }
      } catch { }
    }
  }, [])

  const navigation = [
    { name: 'Início', action: 'scroll-top' },
    { name: 'Imóveis', action: 'scroll-imoveis' },
    { name: 'Quem Somos', action: 'modal-about' },
    { name: 'Contato', action: 'modal-contact' },
  ]

  const handleNavigation = (action: string) => {
    switch (action) {
      case 'scroll-top':
        window.scrollTo({ top: 0, behavior: 'smooth' })
        break
      case 'scroll-imoveis':
        const filtrosElement = document.getElementById('filtros-imoveis')
        if (filtrosElement) {
          filtrosElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        break
      case 'modal-about':
        setShowAboutModal(true)
        break
      case 'modal-contact':
        setShowContactModal(true)
        setContactForm({ nome: '', telefone: '', email: '', mensagem: '' })
        setContactErrors({})
        break
    }
    setIsMenuOpen(false)
  }

  const validateContactForm = () => {
    const errors: Record<string, string> = {}
    if (!contactForm.nome.trim()) errors.nome = 'Nome é obrigatório'
    if (!contactForm.telefone.trim()) {
      errors.telefone = 'Telefone é obrigatório'
    } else if (!/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(contactForm.telefone)) {
      errors.telefone = 'Telefone inválido'
    }
    if (!contactForm.email.trim()) {
      errors.email = 'E-mail é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = 'E-mail inválido'
    }
    if (!contactForm.mensagem.trim()) errors.mensagem = 'Mensagem é obrigatória'
    return errors
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateContactForm()
    if (Object.keys(errors).length > 0) {
      setContactErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/public/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      })

      if (!response.ok) throw new Error('Erro ao enviar mensagem')

      setShowContactModal(false)
      setShowThankYouModal(true)
      setContactForm({ nome: '', telefone: '', email: '', mensagem: '' })
    } catch (error) {
      setContactErrors({ submit: 'Erro ao enviar mensagem. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="w-full">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/imovtec-logo-definitive.png"
                  alt="Imovtec Logo"
                  width={180}
                  height={60}
                  className="h-16 w-auto"
                  priority
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 flex-1 justify-center px-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.action)}
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105"
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* ├ürea Direita: Contact Info e Bot├úo de Autentica├º├úo */}
            <div className="hidden md:flex items-center gap-4 flex-shrink-0 pr-4 sm:pr-6 lg:pr-8">
              {/* Contact Info */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>(81) 98866-6600</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{displayLocation}</span>
                </div>
              </div>
              {/* Bot├úo de Autentica├º├úo - Separado e ├á direita */}
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
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.action)}
                  className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium w-full text-left"
                >
                  {item.name}
                </button>
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
                {/* Bot├úo de Autentica├º├úo Mobile */}
                <div className="pt-2 border-t">
                  <AuthButtons />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Quem Somos */}
        {showAboutModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={() => setShowAboutModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="text-center space-y-6">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <Image
                    src="/imovtec-logo-definitive.png"
                    alt="Imovtec"
                    width={180}
                    height={60}
                    className="h-16 w-auto"
                  />
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Quem Somos</h2>

                {/* Company Info */}
                <div className="space-y-4 text-left bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 font-semibold">IMOVTEC LTDA-ME</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700">CRECI 10540-J</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      Av. General Mac Arthur n° 1852 sala 02 1° andar<br />
                      Imbiribeira, Recife-PE<br />
                      CEP: 51160-280
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <div className="text-gray-700">
                      <p className="font-semibold">Fone / WhatsApp:</p>
                      <p>(81) 3126.6600 / 98866.6600</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                    <a href="https://www.netimobiliaria.com.br" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                      www.netimobiliaria.com.br
                    </a>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="mt-6 px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Contato */}
        {showContactModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowContactModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Entre em Contato</h2>

              <p className="text-gray-600 mb-6">Preencha o formulário abaixo e entraremos em contato em breve.</p>

              {contactErrors.submit && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {contactErrors.submit}
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={contactForm.nome}
                    onChange={(e) => setContactForm({ ...contactForm, nome: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${contactErrors.nome ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Seu nome completo"
                  />
                  {contactErrors.nome && <p className="mt-1 text-sm text-red-600">{contactErrors.nome}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone *</label>
                  <input
                    type="tel"
                    value={contactForm.telefone}
                    onChange={(e) => setContactForm({ ...contactForm, telefone: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${contactErrors.telefone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="(81) 99999-9999"
                  />
                  {contactErrors.telefone && <p className="mt-1 text-sm text-red-600">{contactErrors.telefone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail *</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${contactErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="seu@email.com"
                  />
                  {contactErrors.email && <p className="mt-1 text-sm text-red-600">{contactErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Como podemos ajudar? *</label>
                  <textarea
                    rows={4}
                    value={contactForm.mensagem}
                    onChange={(e) => setContactForm({ ...contactForm, mensagem: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${contactErrors.mensagem ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Descreva sua necessidade..."
                  />
                  {contactErrors.mensagem && <p className="mt-1 text-sm text-red-600">{contactErrors.mensagem}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Agradecimento */}
        {showThankYouModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowThankYouModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Mensagem Enviada!</h2>
              <p className="text-gray-600 mb-6">
                Obrigado pelo contato! Recebemos sua mensagem e entraremos em contato em breve.
              </p>
              <button
                onClick={() => setShowThankYouModal(false)}
                className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </header>
      {/* Modal Dashboard do Corretor (Global) */}
      {
        corretorHomeSuccessOpen && corretorHomeUser && (
          <UserSuccessModal
            isOpen={corretorHomeSuccessOpen}
            onClose={() => setCorretorHomeSuccessOpen(false)}
            userData={corretorHomeUser}
          />
        )
      }
    </>
  )
}

