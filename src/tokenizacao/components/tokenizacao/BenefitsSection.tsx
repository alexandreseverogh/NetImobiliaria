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
    title: "Segurança e Compliance",
    description: "Plataforma regulamentada pela CVM com auditoria contínua",
    details: [
      "Regulamentação CVM 100%",
      "Auditoria externa trimestral",
      "Seguro de responsabilidade civil",
      "Conformidade com LGPD"
    ]
  },
  {
    icon: CurrencyDollarIcon,
    title: "Investimento Acessível",
    description: "Acesse imóveis premium com valores a partir de R$ 100",
    details: [
      "Investimento mínimo de R$ 100",
      "Diversificação automática",
      "Sem taxas de corretagem",
      "Sem custos de manutenção"
    ]
  },
  {
    icon: ChartBarIcon,
    title: "Rentabilidade Comprovada",
    description: "Histórico de retornos superiores ao mercado tradicional",
    details: [
      "ROI médio de 12-15% ao ano",
      "Dividendos mensais garantidos",
      "Apreciação do valor do imóvel",
      "Proteção contra inflação"
    ]
  },
  {
    icon: ClockIcon,
    title: "Liquidez Digital",
    description: "Compre e venda tokens 24/7 no mercado secundário",
    details: [
      "Negociação 24 horas por dia",
      "Liquidez garantida pela plataforma",
      "Transações instantâneas",
      "Sem burocracia tradicional"
    ]
  },
  {
    icon: GlobeAltIcon,
    title: "Transparência Total",
    description: "Todas as operações registradas na blockchain",
    details: [
      "Registro imutável na blockchain",
      "Relatórios em tempo real",
      "Auditoria pública disponível",
      "Histórico completo de transações"
    ]
  },
  {
    icon: DocumentTextIcon,
    title: "Relatórios Automáticos",
    description: "Receba relatórios detalhados para declaração de IR",
    details: [
      "Relatórios para declaração de IR",
      "Controle de ganhos de capital",
      "Histórico de dividendos",
      "Documentação fiscal completa"
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
              Tokenização de Imóveis?
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Democratizamos o acesso ao mercado imobiliário premium, oferecendo 
            segurança, transparência e rentabilidade superior.
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
              Pronto para Começar?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Junte-se a mais de 1.200 investidores que já descobriram o poder 
              da tokenização de imóveis. Cadastre-se gratuitamente e comece a investir hoje mesmo.
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
