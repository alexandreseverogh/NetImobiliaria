/* eslint-disable */
'use client'

import { useState } from 'react'
import { StarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import { ChevronLeftIcon as ChevronLeftOutline, ChevronRightIcon as ChevronRightOutline } from '@heroicons/react/24/outline'

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  avatar: string
  rating: number
  text: string
  investment: string
  roi: string
  period: string
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Maria Silva',
    role: 'EmpresÃ¡ria',
    company: 'Consultoria Financeira',
    avatar: '/api/placeholder/80/80',
    rating: 5,
    text: 'Investir atravÃ©s da tokenizaÃ§Ã£o foi uma experiÃªncia transformadora. Em apenas 8 meses, jÃ¡ recebi dividendos mensais consistentes e o valor dos meus tokens aumentou 23%. A transparÃªncia da plataforma Ã© impressionante.',
    investment: 'R$ 15.000',
    roi: '18.5%',
    period: '8 meses'
  },
  {
    id: '2',
    name: 'Carlos Mendes',
    role: 'Engenheiro',
    company: 'Construtora ABC',
    avatar: '/api/placeholder/80/80',
    rating: 5,
    text: 'Como engenheiro, sempre quis investir em imÃ³veis mas nÃ£o tinha capital suficiente. A tokenizaÃ§Ã£o me permitiu investir em propriedades premium de R$ 2 milhÃµes com apenas R$ 5.000. Ã‰ revolucionÃ¡rio!',
    investment: 'R$ 5.000',
    roi: '15.2%',
    period: '6 meses'
  },
  {
    id: '3',
    name: 'Ana Costa',
    role: 'Advogada',
    company: 'EscritÃ³rio Costa & Associados',
    avatar: '/api/placeholder/80/80',
    rating: 5,
    text: 'A seguranÃ§a jurÃ­dica e o compliance total da plataforma me convenceram a investir. Todos os documentos sÃ£o transparentes e a regulamentaÃ§Ã£o CVM me dÃ¡ total confianÃ§a. Recomendo para todos os meus clientes.',
    investment: 'R$ 25.000',
    roi: '16.8%',
    period: '1 ano'
  },
  {
    id: '4',
    name: 'Roberto Santos',
    role: 'Aposentado',
    company: 'Ex-Executivo BancÃ¡rio',
    avatar: '/api/placeholder/80/80',
    rating: 5,
    text: 'ApÃ³s 30 anos no mercado financeiro, nunca vi uma oportunidade tÃ£o democratizada. Meus tokens de imÃ³veis em Copacabana renderam mais que a poupanÃ§a e sÃ£o muito mais seguros que aÃ§Ãµes volÃ¡teis.',
    investment: 'R$ 50.000',
    roi: '14.7%',
    period: '1 ano e 3 meses'
  }
]

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            O Que Nossos
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Investidores Dizem
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Mais de 1.200 investidores jÃ¡ descobriram o poder da tokenizaÃ§Ã£o de imÃ³veis. 
            Veja os resultados reais de quem investiu conosco.
          </p>
        </div>

        {/* Main Testimonial */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 group"
          >
            <ChevronLeftOutline className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
          </button>
          
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 group"
          >
            <ChevronRightOutline className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
          </button>

          {/* Testimonial Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 mx-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Avatar and Info */}
              <div className="text-center lg:text-left">
                <div className="w-24 h-24 mx-auto lg:mx-0 mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {currentTestimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {currentTestimonial.name}
                </h3>
                
                <p className="text-blue-600 font-semibold mb-2">
                  {currentTestimonial.role}
                </p>
                
                <p className="text-gray-600 text-sm mb-4">
                  {currentTestimonial.company}
                </p>

                {/* Rating */}
                <div className="flex justify-center lg:justify-start space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon 
                      key={i} 
                      className={`h-5 w-5 ${i < currentTestimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Testimonial Text */}
              <div className="lg:col-span-2">
                <blockquote className="text-xl lg:text-2xl text-gray-700 leading-relaxed mb-8 italic">
                  "{currentTestimonial.text}"
                </blockquote>

                {/* Investment Stats */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {currentTestimonial.investment}
                    </div>
                    <div className="text-sm text-gray-600">Investimento Inicial</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {currentTestimonial.roi}
                    </div>
                    <div className="text-sm text-gray-600">ROI Acumulado</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {currentTestimonial.period}
                    </div>
                    <div className="text-sm text-gray-600">PerÃ­odo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Indicators */}
        <div className="flex justify-center mt-8 space-x-3">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToTestimonial(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-blue-600 scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* All Testimonials Grid */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Mais Depoimentos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={testimonial.id}
                className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 ${
                  index === currentIndex ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon 
                      key={i} 
                      className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>

                {/* Text */}
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  "{testimonial.text.substring(0, 120)}..."
                </p>

                {/* Stats */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Investiu: {testimonial.investment}</span>
                  <span>ROI: {testimonial.roi}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            Quero Investir TambÃ©m
          </button>
        </div>
      </div>
    </section>
  )
}


