'use client'

import { ReactNode } from 'react'

// Componente Hero da Landing Page
interface HeroSectionProps {
  filterPanel?: ReactNode
  venderButton?: ReactNode
  destaquesNacionalButton?: ReactNode
}

export default function HeroSection({ filterPanel, venderButton, destaquesNacionalButton }: HeroSectionProps) {

  return (
    <section className="relative bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Botões posicionados na lateral direita */}
      {(venderButton || destaquesNacionalButton) && (
        <div className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          {venderButton && (
            <div>
              {venderButton}
            </div>
          )}
          {destaquesNacionalButton && (
            <div>
              {destaquesNacionalButton}
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex-1 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Encontre seu Imóvel dos Sonhos
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-2">
              A Net Imobiliária oferece os melhores imóveis para você.
            </p>
            <p className="text-xl md:text-2xl text-primary-100">
              Comprar, Vender ou Alugar nunca foi tão fácil.
            </p>
          </div>
        </div>

        {filterPanel && (
          <div className="w-full">
            <div className="max-w-[48000px] px-4 ml-0 lg:ml-4 lg:mr-[280px]">{filterPanel}</div>
          </div>
        )}
      </div>
    </section>
  )
}
