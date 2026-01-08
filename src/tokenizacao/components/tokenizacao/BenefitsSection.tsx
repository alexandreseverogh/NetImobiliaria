/* eslint-disable */
'use client'

import { 
  ShieldCheckIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  ClockIcon,
  GlobeAltIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline'

interface Benefit {
  icon: any
  title: string
  description: string
  details: string[]
}

const benefits: Benefit[] = [
  {
    icon: ShieldCheckIcon,
    title: "SeguranÃ§a e Compliance",
    description: "Plataforma regulamentada pela CVM com auditoria contÃ­nua",
    details: [
      "RegulamentaÃ§Ã£o CVM 100%",
      "Auditoria externa trimestral",
      "Seguro de responsabilidade civil",
      "Conformidade com LGPD"
    ]
  },
  {
    icon: CurrencyDollarIcon,
    title: "Investimento AcessÃ­vel",
    description: "Acesse imÃ³veis premium com valores a partir de R$ 100",
    details: [
      "Investimento mÃ­nimo de R$ 100",
      "DiversificaÃ§Ã£o automÃ¡tica",
      "Sem taxas de corretagem",
      "Sem custos de manutenÃ§Ã£o"
    ]
  },
  {
    icon: ChartBarIcon,
    title: "Rentabilidade Comprovada",
    description: "HistÃ³rico de retornos superiores ao mercado tradicional",
    details: [
      "ROI mÃ©dio de 12-15% ao ano",
      "Dividendos mensais garantidos",
      "ApreciaÃ§Ã£o do valor do imÃ³vel",
      "ProteÃ§Ã£o contra inflaÃ§Ã£o"
    ]
  },
  {
    icon: ClockIcon,
    title: "Liquidez Digital",
    description: "Compre e venda tokens 24/7 no mercado secundÃ¡rio",
    details: [
      "NegociaÃ§Ã£o 24 horas por dia",
      "Liquidez garantida pela plataforma",
      "TransaÃ§Ãµes instantÃ¢neas",
      "Sem burocracia tradicional"
    ]
  },
  {
    icon: GlobeAltIcon,
    title: "TransparÃªncia Total",
    description: "Todas as operaÃ§Ãµes registradas na blockchain",
    details: [
      "Registro imutÃ¡vel na blockchain",
      "RelatÃ³rios em tempo real",
      "Auditoria pÃºblica disponÃ­vel",
      "HistÃ³rico completo de transaÃ§Ãµes"
    ]
  },
  {
    icon: DocumentTextIcon,
    title: "RelatÃ³rios AutomÃ¡ticos",
    description: "Receba relatÃ³rios detalhados para declaraÃ§Ã£o de IR",
    details: [
      "RelatÃ³rios para declaraÃ§Ã£o de IR",
      "Controle de ganhos de capital",
      "HistÃ³rico de dividendos",
      "DocumentaÃ§Ã£o fiscal completa"
    ]
  }
]

export default function BenefitsSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Por Que Escolher a
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              TokenizaÃ§Ã£o de ImÃ³veis?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Democratizamos o acesso ao mercado imobiliÃ¡rio premium, oferecendo 
            seguranÃ§a, transparÃªncia e rentabilidade superior.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            
            return (
              <div 
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                {/* Background Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-16 h-16 mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-3">
                    {benefit.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                        <span className="text-sm text-gray-600">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover Border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-200 transition-colors duration-300"></div>
              </div>
            )
          })}
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Pronto para ComeÃ§ar?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Junte-se a mais de 1.200 investidores que jÃ¡ descobriram o poder 
              da tokenizaÃ§Ã£o de imÃ³veis. Cadastre-se gratuitamente e comece a investir hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/investidor"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Cadastrar-se Gratuitamente
              </a>
              <a 
                href="/contato"
                className="inline-flex items-center px-8 py-4 border-2 border-blue-600 text-blue-600 font-semibold text-lg rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                Falar com Especialista
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

