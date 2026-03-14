'use client'

import { useState, useEffect } from 'react'
import {
    ArrowTrendingUpIcon,
    CheckBadgeIcon,
    HomeModernIcon,
    UserGroupIcon,
    LightBulbIcon,
    PhoneIcon,
    HomeIcon,
    BuildingOfficeIcon,
    BuildingOffice2Icon,
    MapIcon,
    BriefcaseIcon,
    Square2StackIcon,
    ShoppingBagIcon,
    TruckIcon,
    PlusCircleIcon
} from '@heroicons/react/24/outline'
import VenderPopup from '@/components/VenderPopup'
import AuthModal from '@/components/public/auth/AuthModal'
import MeuPerfilModal from '@/components/public/MeuPerfilModal'
import UserSuccessModal from '@/components/public/auth/UserSuccessModal'

export default function AnunciarImovelPage() {
    const [venderPopupOpen, setVenderPopupOpen] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register')
    const [authUserType, setAuthUserType] = useState<'cliente' | 'proprietario' | null>(null)
    const [meuPerfilModalOpen, setMeuPerfilModalOpen] = useState(false)
    const [meuPerfilInitialMode, setMeuPerfilInitialMode] = useState<'details' | 'imoveis'>('details')
    const [userSuccessModalOpen, setUserSuccessModalOpen] = useState(false)
    const [userSuccessData, setUserSuccessData] = useState<any>(null)

    const handleAnunciarClick = () => {
        // Verificar se já existe sessão ativa (mesma lógica da landing page)
        if (typeof window !== 'undefined') {
            try {
                const publicToken = localStorage.getItem('public-auth-token')
                const publicUserRaw = localStorage.getItem('public-user-data')
                const adminToken = localStorage.getItem('admin-auth-token')
                const adminUserRaw = localStorage.getItem('admin-user-data')

                let isProprietario = false
                if (publicToken && publicUserRaw) {
                    const publicUser = JSON.parse(publicUserRaw)
                    if (publicUser.userType === 'proprietario') isProprietario = true
                }

                if (!isProprietario && adminToken && adminUserRaw) {
                    const adminUser = JSON.parse(adminUserRaw)
                    const role = String(adminUser.role_name || adminUser.cargo || '').toLowerCase()
                    if (role.includes('proprietario')) isProprietario = true
                }

                if (isProprietario) {
                    setMeuPerfilInitialMode('details')
                    setMeuPerfilModalOpen(true)
                    return
                }

                // Se for corretor/admin, mostrar popup de qualquer forma para orientar
                const token = localStorage.getItem('auth-token') || localStorage.getItem('admin-auth-token')
                const userRaw = localStorage.getItem('user-data') || localStorage.getItem('admin-user-data')
                if (token && userRaw) {
                    const u = JSON.parse(userRaw)
                    const r = String(u.role_name || u.cargo || '').toLowerCase()
                    if (r.includes('corretor') || r.includes('admin')) {
                        setVenderPopupOpen(true)
                        return
                    }
                }
            } catch (e) {
                console.error('Erro ao verificar sessão:', e)
            }
        }
        setVenderPopupOpen(true)
    }

    const handleCadastrarProprietario = (finalidade: number) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('finalidadeEscolhida', String(finalidade))
        }
        setVenderPopupOpen(false)
        setAuthUserType('proprietario')
        setAuthModalMode('register')
        setAuthModalOpen(true)
    }

    const handleLoginProprietario = (finalidade: number) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('finalidadeEscolhida', String(finalidade))
        }
        setVenderPopupOpen(false)
        setAuthUserType('proprietario')
        setAuthModalMode('login')
        setAuthModalOpen(true)
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
                        Anunciar imóvel para venda ou aluguel
                    </h1>
                    <div className="max-w-3xl mx-auto space-y-6">
                        <p className="text-xl md:text-2xl text-gray-300 font-medium">
                            Quer anunciar seu imóvel para vender ou alugar com mais visibilidade?
                        </p>
                        <p className="text-lg text-gray-400">
                            Na Imovitec, proprietários podem cadastrar casas, apartamentos, terrenos e imóveis comerciais de forma simples e rápida.
                        </p>
                    </div>

                    <div className="mt-12">
                        <button
                            onClick={handleAnunciarClick}
                            className="px-12 py-5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl rounded-2xl shadow-2xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            Cadastrar meu imóvel
                        </button>
                    </div>
                </div>
            </section>

            {/* Introdução e Vantagens */}
            <section className="max-w-7xl mx-auto px-4 -mt-12">
                <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <p className="text-lg text-gray-700 leading-relaxed">
                                Nossa plataforma conecta proprietários, compradores, interessados em aluguel e corretores, facilitando o processo de negociação e ampliando as oportunidades de venda ou locação.
                            </p>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                Se você deseja vender um imóvel mais rápido ou alugar sua propriedade com mais alcance, anunciar na Imovitec pode ajudar você a encontrar interessados de forma eficiente.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <CheckBadgeIcon className="w-8 h-8 text-blue-600" />
                                Por que anunciar na Imovitec
                            </h2>
                            <ul className="space-y-4">
                                {[
                                    'Cadastro rápido e simples do seu imóvel',
                                    'Mais visibilidade online para venda ou locação',
                                    'Conexão direta com compradores e interessados',
                                    'Contato rápido com potenciais interessados',
                                    'Divulgação em plataforma digital moderna'
                                ].map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                        </div>
                                        <span className="text-gray-700 font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tipos de Imóveis */}
            <section className="max-w-7xl mx-auto px-4 mt-20">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Tipos de imóveis que você pode anunciar</h2>
                    <p className="text-lg text-gray-600">Aceitamos diversos tipos de propriedades para venda ou locação.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { name: 'Casas', icon: HomeIcon },
                        { name: 'Apartamentos', icon: BuildingOffice2Icon },
                        { name: 'Terrenos', icon: MapIcon },
                        { name: 'Comerciais', icon: BuildingOfficeIcon },
                        { name: 'Salas', icon: Square2StackIcon },
                        { name: 'Lojas', icon: ShoppingBagIcon },
                        { name: 'Galp\u00F5es', icon: TruckIcon },
                        { name: 'E muito mais', icon: PlusCircleIcon }
                    ].map((type, idx) => (
                        <div
                            key={idx}
                            className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-2xl hover:scale-110 hover:border-blue-300 transition-all duration-500 cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-500">
                                <type.icon className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-500" />
                            </div>
                            <span className="relative z-10 font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors duration-300">{type.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Como Anunciar - Steps */}
            <section className="bg-white mt-24 py-20 px-4 border-y border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-900 mb-16 text-center">Como anunciar seu imóvel</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            {
                                step: '1',
                                title: 'Crie sua conta',
                                desc: 'Cadastre-se gratuitamente na plataforma para gerenciar seus anúncios.',
                                icon: <UserGroupIcon className="w-8 h-8 text-white" />
                            },
                            {
                                step: '2',
                                title: 'Cadastre seu imóvel',
                                desc: 'Informe localização, tipo, preço, características e fotos da sua propriedade.',
                                icon: <ArrowTrendingUpIcon className="w-8 h-8 text-white" />
                            },
                            {
                                step: '3',
                                title: 'Receba contatos',
                                desc: 'Seu imóvel será publicado e interessados entrarão em contato direto.',
                                icon: <PhoneIcon className="w-8 h-8 text-white" />
                            }
                        ].map((s, idx) => (
                            <div key={idx} className="relative group">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                        {s.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">{s.step}. {s.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{s.desc}</p>
                                </div>
                                {idx < 2 && (
                                    <div className="hidden md:block absolute top-8 left-[calc(50%+4rem)] w-[calc(100%-8rem)] h-0.5 bg-gray-100"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Dicas e SEO Keywords */}
            <section className="max-w-7xl mx-auto px-4 mt-24">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Dicas */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-white shadow-2xl">
                        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                            <LightBulbIcon className="w-10 h-10 text-yellow-300" />
                            Dicas para vender mais rápido
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold">Fotos de qualidade</h4>
                                <p className="text-blue-100">Imagens claras e bem iluminadas ajudam a destacar o imóvel e atrair cliques.</p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold">Descrição detalhada</h4>
                                <p className="text-blue-100">Informe metragem, número de quartos, vagas e diferenciais da vizinhança.</p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold">Preço competitivo</h4>
                                <p className="text-blue-100">Definir um valor de mercado correto aumenta drasticamente o interesse.</p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-bold">Taxas e Encargos</h4>
                                <p className="text-blue-100">Seja transparente sobre condomínio, IPTU e taxas extras.</p>
                            </div>
                        </div>
                    </div>

                    {/* Quem pode anunciar */}
                    <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quem pode anunciar</h2>
                        <div className="space-y-4">
                            {[
                                'Proprietários direto',
                                'Corretores autônomos',
                                'Imobiliárias locais',
                                'Incorporadoras'
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    <span className="font-semibold text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-sm text-gray-500 text-center">
                            Nosso objetivo é facilitar a conexão entre quem anuncia e quem procura.
                        </p>
                    </div>
                </div>
            </section>

            {/* SEO Section */}
            <section className="max-w-7xl mx-auto px-4 mt-20 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-8">Encontre compradores e interessados em aluguel</h2>
                <div className="flex flex-wrap justify-center gap-3">
                    {[
                        'comprar apartamento', 'comprar casa', 'alugar imóvel', 'alugar casa',
                        'investir em imóveis', 'venda de terrenos', 'galpão comercial', 'sala para alugar'
                    ].map((tag, idx) => (
                        <span key={idx} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="max-w-5xl mx-auto px-4 mt-32">
                <div className="bg-[#020817] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold mb-6">Comece agora</h2>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Se você quer vender ou alugar seu imóvel, o primeiro passo é fazer o cadastro na plataforma.
                        </p>
                        <button
                            onClick={handleAnunciarClick}
                            className="px-12 py-5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-orange-500/30"
                        >
                            Cadastrar meu imóvel
                        </button>
                    </div>
                </div>
            </section>

            {/* Modais Necessários */}
            <VenderPopup
                isOpen={venderPopupOpen}
                onClose={() => setVenderPopupOpen(false)}
                onCadastrarClick={handleCadastrarProprietario}
                onLoginClick={handleLoginProprietario}
            />

            {authModalOpen && (
                <AuthModal
                    mode={authModalMode}
                    onChangeMode={setAuthModalMode}
                    onClose={() => {
                        setAuthModalOpen(false)
                        setAuthUserType(null)
                    }}
                    initialUserType={authUserType}
                    redirectTo={undefined}
                />
            )}

            {meuPerfilModalOpen && (
                <MeuPerfilModal
                    isOpen={meuPerfilModalOpen}
                    onClose={() => setMeuPerfilModalOpen(false)}
                    initialMode={meuPerfilInitialMode}
                />
            )}

            {userSuccessModalOpen && userSuccessData && (
                <UserSuccessModal
                    isOpen={userSuccessModalOpen}
                    onClose={() => setUserSuccessModalOpen(false)}
                    userData={userSuccessData}
                    redirectTo="/admin/imoveis/novo?noSidebar=true"
                />
            )}
        </div>
    )
}
