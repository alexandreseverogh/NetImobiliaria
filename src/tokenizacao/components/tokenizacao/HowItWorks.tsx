/* eslint-disable */
'use client'

import React, { useState } from 'react'
import { 
  UserPlusIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  BanknotesIcon,
  ArrowRightIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

interface Step {
  id: number
  title: string
  description: string
  icon: any
  details: string[]
  color: string
}

const steps: Step[] = [
  {
    id: 1,
    title: "Cadastro e VerificaÃ§Ã£o",
    description: "Crie sua conta e complete o processo KYC",
    icon: UserPlusIcon,
    details: [
      "Cadastro gratuito em 2 minutos",
      "VerificaÃ§Ã£o de identidade digital",
      "AprovaÃ§Ã£o automÃ¡tica em 24h",
      "Perfil de investidor configurado"
    ],
    color: "from-blue-500 to-blue-600"
  },
  {
    id: 2,
    title: "Escolha seu ImÃ³vel",
    description: "Navegue pelo portfÃ³lio de imÃ³veis tokenizados",
    icon: ChartBarIcon,
    details: [
      "ImÃ³veis premium selecionados",
      "AnÃ¡lise detalhada de cada propriedade",
      "HistÃ³rico de rentabilidade",
      "ProjeÃ§Ãµes de ROI transparentes"
    ],
    color: "from-green-500 to-green-600"
  },
  {
    id: 3,
    title: "Investimento",
    description: "Adquira tokens com valores a partir de R$ 100",
    icon: CurrencyDollarIcon,
    details: [
      "Investimento mÃ­nimo de R$ 100",
      "Pagamento via PIX, cartÃ£o ou transferÃªncia",
      "Tokens na sua carteira instantaneamente",
      "Recebimento de comprovante digital"
    ],
    color: "from-purple-500 to-purple-600"
  },
  {
    id: 4,
    title: "Recebimento de Dividendos",
    description: "Receba rendimentos mensais automaticamente",
    icon: BanknotesIcon,
    details: [
      "Dividendos pagos mensalmente",
      "TransferÃªncia automÃ¡tica para sua conta",
      "RelatÃ³rios detalhados de rentabilidade",
      "Impostos calculados automaticamente"
    ],
    color: "from-orange-500 to-orange-600"
  }
]

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Como Funciona a
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              TokenizaÃ§Ã£o
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transformamos imÃ³veis de alto valor em tokens digitais, permitindo que vocÃª 
            invista em propriedades premium com apenas alguns cliques.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Step Selector */}
          <div className="space-y-6">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = activeStep === step.id
              
              return (
                <div
                  key={step.id}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    isActive ? 'transform scale-105' : 'hover:transform hover:scale-102'
                  }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  {/* Connection Line */}
                  {step.id < steps.length && (
                    <div className={`absolute left-8 top-16 w-0.5 h-16 ${
                      isActive ? 'bg-gradient-to-b from-blue-500 to-purple-500' : 'bg-gray-200'
                    }`}></div>
                  )}
                  
                  <div className={`flex items-start space-x-6 p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isActive 
                      ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}>
                    {/* Step Number & Icon */}
                    <div className={`relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? `bg-gradient-to-r ${step.color} text-white shadow-lg` 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isActive ? (
                        <Icon className="h-8 w-8" />
                      ) : (
                        <span className="text-xl font-bold">{step.id}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                        isActive ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-base mb-3 transition-colors duration-300 ${
                        isActive ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                      
                      {/* Details */}
                      {isActive && (
                        <div className="space-y-2 animate-fadeIn">
                          {step.details.map((detail, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className={`flex-shrink-0 transition-transform duration-300 ${
                      isActive ? 'rotate-0' : 'rotate-0'
                    }`}>
                      <ArrowRightIcon className={`h-5 w-5 ${
                        isActive ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Side - Visual */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl">
              {/* Progress Indicator */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-600">Progresso</span>
                  <span className="text-sm font-bold text-gray-900">
                    Passo {activeStep} de {steps.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(activeStep / steps.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Step Visual */}
              <div className="text-center">
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-gradient-to-r ${steps[activeStep - 1].color} shadow-lg`}>
                  {React.createElement(steps[activeStep - 1].icon, { className: "h-12 w-12 text-white" })}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {steps[activeStep - 1].title}
                </h3>
                
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {steps[activeStep - 1].description}
                </p>

                {/* Timeline */}
                <div className="flex justify-center space-x-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index + 1 <= activeStep 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500' 
                          : 'bg-gray-300'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-400/20 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-400/20 rounded-full animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <a 
            href="/investidor"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <UserPlusIcon className="mr-2 h-5 w-5" />
            ComeÃ§ar Agora - Ã‰ Gratuito
          </a>
        </div>
      </div>
    </section>
  )
}

