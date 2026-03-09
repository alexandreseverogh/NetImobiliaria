'use client'

import { useRouter } from 'next/navigation'
import {
    MagnifyingGlassIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    SparklesIcon,
    BellIcon,
    ShieldCheckIcon,
    HomeIcon,
    BuildingOfficeIcon,
    MapIcon,
    BriefcaseIcon,
    Square2StackIcon,
    ShoppingBagIcon,
    TruckIcon,
    PlusCircleIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function ProcurarImovelPage() {
    const router = useRouter()

    const handleIrParaBusca = () => {
        // Redireciona para a landing page na seção de filtros
        router.push('/landpaging#filtros-imoveis')
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section */}
            <section className="relative bg-[#020817] text-white py-24 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">
                        Encontre o imóvel ideal para morar ou investir
                    </h1>
                    <div className="max-w-3xl mx-auto space-y-6">
                        <p className="text-xl md:text-2xl text-gray-300 font-medium">
                            Descubra as melhores oportunidades do mercado imobiliário com a Imovtec.
                        </p>
                        <p className="text-lg text-gray-400">
                            Conectamos você a uma vasta seleção de casas, apartamentos e terrenos, garantindo uma experiência de busca moderna, rápida e segura.
                        </p>
                    </div>

                    <div className="mt-12">
                        <button
                            onClick={handleIrParaBusca}
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-2xl shadow-2xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                        >
                            <MagnifyingGlassIcon className="w-6 h-6" />
                            Começar minha busca
                        </button>
                    </div>
                </div>
            </section>

            {/* Vantagens da Busca Imovtec */}
            <section className="max-w-7xl mx-auto px-4 -mt-12">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Por que buscar seu imóvel na Imovtec</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Nossa plataforma foi desenhada para facilitar cada etapa da sua jornada de compra ou aluguel.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                title: 'Busca Inteligente',
                                desc: 'Filtros avançados por localidade, preço e características específicas.',
                                icon: MapPinIcon,
                                color: 'text-blue-600',
                                bg: 'bg-blue-50'
                            },
                            {
                                title: 'Oportunidades Reais',
                                desc: 'Anúncios verificados e atualizados diariamente para evitar frustrações.',
                                icon: SparklesIcon,
                                color: 'text-purple-600',
                                bg: 'bg-purple-50'
                            },
                            {
                                title: 'Alertas no Perfil',
                                desc: 'Receba avisos instantâneos quando um imóvel do seu interesse entrar no mercado.',
                                icon: BellIcon,
                                color: 'text-orange-600',
                                bg: 'bg-orange-50'
                            },
                            {
                                title: 'Segurança Total',
                                desc: 'Sua privacidade e dados estão protegidos em nossa plataforma moderna.',
                                icon: ShieldCheckIcon,
                                color: 'text-green-600',
                                bg: 'bg-green-50'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className={`w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-6`}>
                                    <item.icon className={`w-8 h-8 ${item.color}`} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tipos de Imóveis - Reutilizando Estilo Premium */}
            <section className="max-w-7xl mx-auto px-4 mt-24">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore as categorias disponíveis</h2>
                    <p className="text-lg text-gray-600">Seja qual for o seu perfil, temos o imóvel certo para você.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { name: 'Casas', icon: HomeIcon },
                        { name: 'Apartamentos', icon: BuildingOfficeIcon },
                        { name: 'Terrenos', icon: MapIcon },
                        { name: 'Comerciais', icon: BriefcaseIcon },
                        { name: 'Salas', icon: Square2StackIcon },
                        { name: 'Lojas', icon: ShoppingBagIcon },
                        { name: 'Galpões', icon: TruckIcon },
                        { name: 'E muito mais', icon: PlusCircleIcon }
                    ].map((type, idx) => (
                        <div
                            key={idx}
                            className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-2xl hover:scale-105 hover:border-blue-200 transition-all duration-300 cursor-pointer"
                            onClick={handleIrParaBusca}
                        >
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:rotate-6 transition-all duration-300">
                                <type.icon className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <span className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{type.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Como Encontrar o Ideal */}
            <section className="bg-white mt-24 py-20 px-4 border-y border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">Como encontrar seu imóvel mais rápido</h2>
                            <div className="space-y-8">
                                {[
                                    {
                                        title: 'Defina suas prioridades',
                                        desc: 'Determine o número de quartos, vagas e a localidade essencial antes de começar.'
                                    },
                                    {
                                        title: 'Use os filtros de preço',
                                        desc: 'Economize tempo filtrando apenas imóveis que cabem no seu planejamento financeiro.'
                                    },
                                    {
                                        title: 'Salve seus favoritos',
                                        desc: 'Crie uma conta para salvar os imóveis que mais gostou e receber alertas.'
                                    },
                                    {
                                        title: 'Solicite uma visita',
                                        desc: 'Gostou? Entre em contato rápido pelo botão de interesse para agendar sua visita.'
                                    }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex gap-6">
                                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-1">{step.title}</h4>
                                            <p className="text-gray-600">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#020817] to-blue-900 rounded-[2rem] p-10 text-white relative overflow-hidden flex flex-col justify-center shadow-2xl">
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                            <CurrencyDollarIcon className="w-20 h-20 text-blue-400 mb-6 opacity-50" />
                            <h3 className="text-2xl font-bold mb-6">Pronto para fechar o melhor negócio?</h3>
                            <p className="text-blue-200 mb-8 leading-relaxed">
                                Nossa plataforma une transparência e tecnologia para que você tenha em mãos as melhores ofertas de Pernambuco e de todo o Brasil.
                            </p>
                            <button
                                onClick={handleIrParaBusca}
                                className="bg-white text-blue-900 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                Ver todos os imóveis
                                <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEO Section Tags */}
            <section className="max-w-7xl mx-auto px-4 mt-20 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-8">Procurando por oportunidades específicas?</h2>
                <div className="flex flex-wrap justify-center gap-3">
                    {[
                        'imóveis de luxo', 'apartamento pronto para morar', 'casas em condomínio',
                        'terrenos para investimento', 'salas comerciais centro', 'aluguel barato',
                        'financiamento imobiliário', 'lançamentos imobiliários'
                    ].map((tag, idx) => (
                        <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </section>

            {/* Side Banner CTA Reutilizado */}
            <section className="max-w-5xl mx-auto px-4 mt-32">
                <div className="bg-[#020817] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold mb-6">O seu novo lar está aqui</h2>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Milhares de pessoas utilizam a Imovtec todos os meses para realizar o sonho da casa própria ou encontrar o investimento perfeito.
                        </p>
                        <button
                            onClick={handleIrParaBusca}
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/30"
                        >
                            Começar minha busca agora
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
