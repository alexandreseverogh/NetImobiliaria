'use client'

import { useState, useEffect } from 'react'

interface StatItem {
  number: string
  label: string
  suffix?: string
  description: string
}

const stats: StatItem[] = [
  {
    number: "R$ 50",
    label: "Milhões",
    suffix: "+",
    description: "Volume total tokenizado"
  },
  {
    number: "1.247",
    label: "Investidores",
    suffix: "+",
    description: "Ativos na plataforma"
  },
  {
    number: "15",
    label: "Imóveis",
    suffix: "+",
    description: "Tokenizados com sucesso"
  },
  {
    number: "98.7%",
    label: "Satisfação",
    description: "Taxa de satisfação dos investidores"
  }
]

export default function StatsSection() {
  const [counters, setCounters] = useState<number[]>([0, 0, 0, 0])

  useEffect(() => {
    const animateCounters = () => {
      stats.forEach((stat, index) => {
        const target = parseFloat(stat.number.replace(/[^\d.]/g, ''))
        const duration = 2000
        const increment = target / (duration / 16)
        
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= target) {
            current = target
            clearInterval(timer)
          }
          
          setCounters(prev => {
            const newCounters = [...prev]
            newCounters[index] = current
            return newCounters
          })
        }, 16)
      })
    }

    const timeout = setTimeout(animateCounters, 500)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Resultados que Falam por Si
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Nossa plataforma já democratizou o acesso ao mercado imobiliário premium 
            para milhares de investidores em todo o Brasil.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 text-center">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {index === 0 ? '₮' : index === 1 ? '👥' : index === 2 ? '🏠' : '⭐'}
                  </span>
                </div>

                {/* Number */}
                <div className="mb-2">
                  <span className="text-4xl lg:text-5xl font-bold text-gray-900">
                    {index === 0 ? (
                      `R$ ${Math.floor(counters[0]).toLocaleString()}`
                    ) : index === 1 ? (
                      Math.floor(counters[1]).toLocaleString()
                    ) : index === 2 ? (
                      Math.floor(counters[2])
                    ) : (
                      `${counters[3].toFixed(1)}%`
                    )}
                  </span>
                  {stat.suffix && (
                    <span className="text-2xl font-bold text-blue-600 ml-1">
                      {stat.suffix}
                    </span>
                  )}
                </div>

                {/* Label */}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {stat.label}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  {stat.description}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Plataforma 100% operacional e regulamentada
          </div>
        </div>
      </div>
    </section>
  )
}

