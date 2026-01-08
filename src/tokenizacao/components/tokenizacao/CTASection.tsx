/* eslint-disable */
'use client'

import { useState } from 'react'
import { 
  ArrowRightIcon, 
  CheckCircleIcon, 
  UserPlusIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

export default function CTASection() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simular envio
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setEmail('')
    }, 3000)
  }

  const benefits = [
    {
      icon: CheckCircleIcon,
      text: "Cadastro gratuito e sem compromisso"
    },
    {
      icon: ShieldCheckIcon,
      text: "Plataforma 100% regulamentada pela CVM"
    },
    {
      icon: CurrencyDollarIcon,
      text: "Investimento a partir de R$ 100"
    },
    {
      icon: ChartBarIcon,
      text: "ROI mÃ©dio de 12-15% ao ano"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                Pronto para
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                  Revolucionar
                </span>
                seus Investimentos?
              </h2>
              
              <p className="text-xl lg:text-2xl text-blue-100 leading-relaxed mb-8">
                Junte-se a mais de 1.200 investidores que jÃ¡ descobriram o poder da 
                tokenizaÃ§Ã£o de imÃ³veis. Comece hoje mesmo com apenas R$ 100.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-blue-100 text-lg">{benefit.text}</span>
                  </div>
                )
              })}
            </div>

            {/* Contact Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-4">Precisa de Ajuda?</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-5 w-5 text-blue-300" />
                  <span className="text-blue-100">(11) 99999-9999</span>
                </div>
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-blue-300" />
                  <span className="text-blue-100">contato@netimobiliaria-tokenizacao.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - CTA Form */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-white mb-2">
                  Comece Agora
                </h3>
                <p className="text-blue-100">
                  Cadastre-se gratuitamente e receba acesso exclusivo
                </p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-2">
                      Seu melhor e-mail
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-4 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-4">
                    <button 
                      type="submit"
                      className="w-full group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <UserPlusIcon className="mr-2 h-5 w-5" />
                      <span>Cadastrar-se Gratuitamente</span>
                      <ArrowRightIcon className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </button>
                    
                    <button 
                      type="button"
                      className="w-full inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold text-lg rounded-lg hover:bg-white hover:text-blue-900 transition-all duration-300"
                    >
                      <PhoneIcon className="mr-2 h-5 w-5" />
                      Falar com Especialista
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Cadastro Realizado!
                  </h3>
                  <p className="text-blue-100">
                    Verifique seu e-mail para ativar sua conta
                  </p>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center justify-center space-x-6 text-blue-200 text-sm">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-4 w-4" />
                    <span>100% Seguro</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>Regulamentado CVM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400/20 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-green-400/20 rounded-full animate-pulse delay-1000"></div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">1.247+</div>
            <div className="text-blue-200">Investidores Ativos</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">R$ 50M+</div>
            <div className="text-blue-200">Volume Tokenizado</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">98.7%</div>
            <div className="text-blue-200">Taxa de SatisfaÃ§Ã£o</div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-16">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="white"></path>
        </svg>
      </div>
    </section>
  )
}


