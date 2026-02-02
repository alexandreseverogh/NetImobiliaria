'use client'

import Link from 'next/link'

export default function AdminDashboard() {
  // Home do Admin: vitrine visual (4 cards grandes com fotos de imóveis).

  const cards = [
    {
      tag: 'Alto padrão',
      title: 'Apartamento com vista e varanda gourmet',
      location: 'Recife • Boa Viagem',
      href: '/admin/imoveis',
      img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1800&q=80'
    },
    {
      tag: 'Oportunidade',
      title: 'Casa moderna com área externa',
      location: 'Recife • Imbiribeira',
      href: '/admin/imoveis',
      img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1800&q=80'
    },
    {
      tag: 'Investimento',
      title: 'Studio compacto em localização estratégica',
      location: 'Recife • Pina',
      href: '/admin/imoveis',
      img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=80'
    },
    {
      tag: 'Família',
      title: 'Casa ampla com 4 quartos e garagem',
      location: 'Recife • Zona Sul',
      href: '/admin/imoveis',
      img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1800&q=80'
    }
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.18),transparent_55%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 ring-1 ring-white/20 backdrop-blur">
              <img src="/imovtec-logo-definitive.png" alt="Logo" className="h-4 w-auto brightness-0 invert" />
              <span className="text-sm font-semibold">Painel Administrativo</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              Central Administrativa
            </h1>
            <p className="max-w-3xl text-lg sm:text-xl text-blue-100">
              Gerencie imóveis, cadastros e configurações da sua imobiliária digital em um só lugar.
            </p>

            {/* CTAs removidos por solicitação — manter visual limpo */}
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <svg className="block w-full h-12 text-slate-50" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16 relative z-10">
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="group relative overflow-hidden rounded-3xl border border-white/40 bg-white shadow-xl shadow-black/5"
              >
                <div className="relative h-[320px] sm:h-[360px]">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />

                  {/* overlay leve só para dar acabamento (sem texto) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-black/0" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}






