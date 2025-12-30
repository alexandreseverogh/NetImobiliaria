'use client'

import { User, Building2, Briefcase } from 'lucide-react'

interface ProfileBannersProps {
  onProprietarioClick: () => void
  onClienteClick: () => void
  onCorretorClick: () => void
}

export default function ProfileBanners({
  onProprietarioClick,
  onClienteClick,
  onCorretorClick
}: ProfileBannersProps) {
  return (
    <section className="px-4 sm:px-6 mt-6">
      <div className="w-full mx-auto">
        <div className="bg-white/70 backdrop-blur rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Crie sua conta</h2>
              <p className="text-sm text-gray-600 mt-1">Escolha seu perfil para começar.</p>
            </div>
          </div>

          {/* Mobile: carrossel horizontal (snap) | Desktop: grid */}
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
            {/* Proprietário */}
            <div className="min-w-[280px] snap-start md:min-w-0">
              <div className="h-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200 flex-shrink-0">
                    <Building2 className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-emerald-800">Sou proprietário</div>
                    <div className="text-lg font-bold text-gray-900 leading-tight mt-1">
                      Anuncie seu imóvel
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Venda ou alugue com mais alcance e encontre interessados.
                    </p>
                    <ul className="text-xs text-gray-600 mt-3 space-y-1">
                      <li>• Cadastro rápido</li>
                      <li>• Mais visibilidade</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onProprietarioClick}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
                  >
                    Quero anunciar
                  </button>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="min-w-[280px] snap-start md:min-w-0">
              <div className="h-full rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 flex-shrink-0">
                    <User className="w-6 h-6 text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-blue-800">Quero comprar</div>
                    <div className="text-lg font-bold text-gray-900 leading-tight mt-1">
                      Encontre o imóvel ideal
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Cadastre-se e receba oportunidades compatíveis com seu perfil.
                    </p>
                    <ul className="text-xs text-gray-600 mt-3 space-y-1">
                      <li>• Alertas de novidades</li>
                      <li>• Atendimento agilizado</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onClienteClick}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
                  >
                    Criar conta
                  </button>
                </div>
              </div>
            </div>

            {/* Corretor */}
            <div className="min-w-[280px] snap-start md:min-w-0">
              <div className="h-full rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center border border-purple-200 flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-purple-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-purple-800">Sou corretor</div>
                    <div className="text-lg font-bold text-gray-900 leading-tight mt-1">
                      Seja corretor parceiro
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Acesse o painel e trabalhe com proprietários e clientes da plataforma.
                    </p>
                    <ul className="text-xs text-gray-600 mt-3 space-y-1">
                      <li>• Leads e oportunidades</li>
                      <li>• Visibilidade e gestão</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onCorretorClick}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors"
                  >
                    Sou Corretor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


