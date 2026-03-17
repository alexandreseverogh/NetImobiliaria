'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, SparklesIcon, ArrowDownTrayIcon, ShareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { Bed, BedDouble, Bath, Car, Square } from 'lucide-react'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import SafeImage from '@/components/common/SafeImage'
import useFichaCompleta from '@/hooks/useFichaCompleta'
import { CriativoFeed, CriativoStories, CriativoCarrossel2, CriativoCarrossel3 } from './CriativoTemplates'

interface CriativosModalProps {
    isOpen: boolean
    onClose: () => void
    imovelId: number | null
}

export default function CriativosModal({ isOpen, onClose, imovelId }: CriativosModalProps) {
    const [formato, setFormato] = useState<'feed' | 'stories' | 'carrossel'>('feed')
    const [isGenerating, setIsGenerating] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Usar o hook já existente para buscar TUDO do imóvel (fotos, amenidades, etc)
    const {
        dadosBasicos,
        dadosDetalhados,
        dadosCompletos,
        loading,
        carregarDetalhados,
        carregarCompletos
    } = useFichaCompleta(imovelId?.toString() || '')

    useEffect(() => {
        if (isOpen && dadosBasicos && !dadosCompletos && !loading.completo) {
            carregarDetalhados()
            carregarCompletos()
        }
    }, [isOpen, dadosBasicos, dadosCompletos, loading.completo, carregarDetalhados, carregarCompletos])

    const handleDownload = async () => {
        if (!containerRef.current || !dadosBasicos) return
        try {
            setIsGenerating(true)
            
            const getOptions = (width: number, height: number) => ({
                width, height, pixelRatio: 1, backgroundColor: '#0f172a',
                style: { transform: 'scale(1)', transformOrigin: 'top left' }
            })

            const prefix = `imovtec-${dadosBasicos.codigo || dadosBasicos.id}`

            if (formato === 'feed') {
                const node = document.getElementById('imv-feed')
                if (!node) throw new Error("Template não encontrado")
                const dataUrl = await toPng(node, getOptions(1080, 1080))
                saveAs(dataUrl, `${prefix}-feed.png`)
            } else if (formato === 'stories') {
                const node = document.getElementById('imv-stories')
                if (!node) throw new Error("Template não encontrado")
                const dataUrl = await toPng(node, getOptions(1080, 1920))
                saveAs(dataUrl, `${prefix}-stories.png`)
            } else if (formato === 'carrossel') {
                const n1 = document.getElementById('imv-feed')
                const n2 = document.getElementById('imv-carro2')
                const n3 = document.getElementById('imv-carro3')
                if (!n1 || !n2 || !n3) throw new Error("Templates não encontrados")

                const d1 = await toPng(n1, getOptions(1080, 1080))
                const d2 = await toPng(n2, getOptions(1080, 1080))
                const d3 = await toPng(n3, getOptions(1080, 1080))

                const zip = new JSZip()
                zip.file(`01-capa.png`, d1.split(',')[1], {base64: true})
                zip.file(`02-amenidades.png`, d2.split(',')[1], {base64: true})
                zip.file(`03-proximidades.png`, d3.split(',')[1], {base64: true})

                const blob = await zip.generateAsync({type: "blob"})
                saveAs(blob, `${prefix}-carrossel.zip`)
            }

            setIsGenerating(false)
        } catch (error) {
            console.error("Erro ao gerar criativo:", error)
            alert("Ocorreu um erro ao gerar a imagem. Verifique se sua conexão está estável.")
            setIsGenerating(false)
        }
    }

    const publicUrl = dadosBasicos ? `https://www.imovtec.com.br/imoveis/${dadosBasicos.id}` : ''

    const handleCopyLink = () => {
        if (!publicUrl) return
        navigator.clipboard.writeText(publicUrl)
        alert('Link copiado para a área de transferência!')
    }

    const handleShareWhatsApp = () => {
        if (!publicUrl || !dadosBasicos) return
        
        const message = encodeURIComponent(
            `🏠 *Confira este imóvel exclusivo na Imovtec!*\n\n` +
            `📍 ${dadosBasicos.bairro}, ${dadosBasicos.cidade_fk}\n` +
            `💰 Investimento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosBasicos.preco || 0)}\n\n` +
            `🔗 *Acesse os detalhes completos aqui:* \n${publicUrl}\n\n` +
            `REF: ${dadosBasicos.codigo || dadosBasicos.id}`
        )
        
        window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank')
    }

    if (!isOpen) return null

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                                
                                {/* Header do Modal */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-gradient-to-tr from-pink-500 to-purple-500 p-2 rounded-lg">
                                            <SparklesIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-xl font-bold text-white">
                                                Estúdio de Criativos
                                            </Dialog.Title>
                                            <p className="text-slate-300 text-sm">
                                                {dadosBasicos ? `Gerando para: ${dadosBasicos.codigo} - ${dadosBasicos.bairro}, ${dadosBasicos.cidade_fk}` : 'Carregando imóvel...'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6 flex flex-col md:flex-row gap-6 bg-slate-50">
                                    
                                    {/* Sidebar de Configurações */}
                                    <div className="w-full md:w-1/3 space-y-6">
                                        
                                        {/* Status de Loading */}
                                        {loading.basico && (
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-3 text-blue-600">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                <span className="font-medium text-sm">Buscando inteligência...</span>
                                            </div>
                                        )}
                                        {loading.completo && (
                                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-3 text-purple-600">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                                                <span className="font-medium text-sm">Carregando fotos HD e amenidades...</span>
                                            </div>
                                        )}

                                        {/* Seleção de Formato */}
                                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                            <h4 className="font-bold text-slate-800 mb-4">Escolha o Formato</h4>
                                            <div className="space-y-3">
                                                <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${formato === 'feed' ? 'border-primary-500 bg-primary-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                                    <input type="radio" className="mt-1" name="formato" checked={formato === 'feed'} onChange={() => setFormato('feed')} />
                                                    <div className="ml-3">
                                                        <span className="block font-bold text-slate-900 text-sm">Post Quadrado (Feed)</span>
                                                        <span className="block text-slate-500 text-xs mt-0.5">Imagem única focada em impacto visceral (1080x1080)</span>
                                                    </div>
                                                </label>
                                                
                                                <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${formato === 'stories' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                                    <input type="radio" className="mt-1" name="formato" checked={formato === 'stories'} onChange={() => setFormato('stories')} />
                                                    <div className="ml-3">
                                                        <span className="block font-bold text-slate-900 text-sm">Stories / Reels</span>
                                                        <span className="block text-slate-500 text-xs mt-0.5">Vertical imersivo (1080x1920) pronto para Link na Tela</span>
                                                    </div>
                                                </label>

                                                <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${formato === 'carrossel' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                                    <input type="radio" className="mt-1" name="formato" checked={formato === 'carrossel'} onChange={() => setFormato('carrossel')} />
                                                    <div className="ml-3">
                                                        <span className="block font-bold text-slate-900 text-sm">Carrossel Completo (ZIP)</span>
                                                        <span className="block text-slate-500 text-xs mt-0.5">A jornada: Capa, Estilo de Vida e Conveniência (3 imagens)</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Botão Principal de Exportação */}
                                        <button
                                            onClick={handleDownload}
                                            disabled={isGenerating || !dadosBasicos || loading.basico || loading.detalhado || loading.completo || !dadosDetalhados || !dadosCompletos}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all hover:-translate-y-1 hover:shadow-xl flex items-center justify-center space-x-2"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    <span>Gerando Arte Final...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowDownTrayIcon className="w-6 h-6" />
                                                    <span>Exportar Mídia Premium</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Opções de Compartilhamento de Link */}
                                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 space-y-4">
                                            <h4 className="text-indigo-900 font-bold text-sm flex items-center">
                                                <ShareIcon className="w-4 h-4 mr-2" />
                                                Link Clicável (Importante)
                                            </h4>
                                            <p className="text-indigo-800 text-[11px] leading-relaxed">
                                                🚨 <b>Atenção:</b> Arquivos de imagem (PNG) não permitem cliques. 
                                                Para que o cliente possa clicar e abrir o site, você deve usar o botão abaixo:
                                            </p>
                                            
                                            <div className="space-y-2">
                                                <button
                                                    onClick={handleShareWhatsApp}
                                                    className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white hover:bg-green-600 px-4 py-3 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 animate-pulse"
                                                >
                                                    <span>Enviar como Link Clicável</span>
                                                </button>

                                                <button
                                                    onClick={handleCopyLink}
                                                    className="w-full flex items-center justify-center space-x-2 bg-slate-800 text-white hover:bg-slate-900 px-4 py-3 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
                                                >
                                                    <ClipboardDocumentIcon className="w-5 h-5" />
                                                    <span>Copiar Link para Legenda</span>
                                                </button>
                                            </div>
                                            <p className="text-slate-500 text-[10px] italic">
                                                * Ao enviar pelo WhatsApp como link, o aplicativo gera automaticamente um card com a foto que é clicável.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Preview Area Central */}
                                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                                        <div className="bg-slate-200/50 rounded-xl overflow-auto flex items-center justify-center p-4 md:p-8 border border-slate-300 relative min-h-[600px] custom-scrollbar">
                                            {dadosBasicos ? (
                                                <div 
                                                    style={{ 
                                                        width: (formato === 'stories' ? 1080 : formato === 'carrossel' ? (1080 * 3) + 96 : 1080) * (formato === 'carrossel' ? 0.25 : 0.35), 
                                                        height: (formato === 'stories' ? 1920 : 1080) * (formato === 'carrossel' ? 0.25 : 0.35), 
                                                        position: 'relative' 
                                                    }}
                                                    className="pointer-events-none mx-auto"
                                                >
                                                    <div 
                                                        style={{ 
                                                            transform: `scale(${formato === 'carrossel' ? 0.25 : 0.35})`, 
                                                            transformOrigin: 'top left',
                                                            width: formato === 'stories' ? 1080 : formato === 'carrossel' ? (1080 * 3) + 96 : 1080,
                                                            height: formato === 'stories' ? 1920 : 1080,
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0
                                                        }}
                                                    >
                                                        {formato === 'feed' && <CriativoFeed basico={dadosBasicos} publicUrl={publicUrl} />}
                                                        {formato === 'stories' && <CriativoStories basico={dadosBasicos} publicUrl={publicUrl} />}
                                                        {formato === 'carrossel' && (
                                                            <div className="flex space-x-12">
                                                                <CriativoFeed basico={dadosBasicos} publicUrl={publicUrl} />
                                                                <CriativoCarrossel2 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} />
                                                                <CriativoCarrossel3 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    {(loading.basico || loading.detalhado || loading.completo) ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                                                            <h3 className="text-xl font-bold text-slate-700">Carregando Estúdio...</h3>
                                                            <p className="text-slate-500">Montando os dados do imóvel...</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SparklesIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                                            <h3 className="text-xl font-bold text-slate-700">Preview do Estúdio</h3>
                                                            <p className="text-slate-500">O esqueleto do design arquitetural será processado aqui.</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Barra de Link Clicável (Proposta do Usuário) */}
                                        {dadosBasicos && (
                                            <div className="bg-white border-2 border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center space-x-3 overflow-hidden">
                                                    <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                                                        <ShareIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link Público do Imóvel</p>
                                                        <p className="text-sm font-medium text-blue-600 truncate">{publicUrl}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button 
                                                        onClick={() => window.open(publicUrl, '_blank')}
                                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 whitespace-nowrap"
                                                    >
                                                        Abrir Link
                                                    </button>
                                                    <button 
                                                        onClick={handleCopyLink}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                                                    >
                                                        Copiar Link
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* HIDDEN CONTAINER FOR RENDERING */}
                                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
                                    {dadosBasicos && (
                                        <div ref={containerRef}>
                                            <div id="imv-feed"><CriativoFeed basico={dadosBasicos} publicUrl={publicUrl} /></div>
                                            <div id="imv-stories"><CriativoStories basico={dadosBasicos} publicUrl={publicUrl} /></div>
                                            <div id="imv-carro2"><CriativoCarrossel2 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} /></div>
                                            <div id="imv-carro3"><CriativoCarrossel3 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} /></div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
