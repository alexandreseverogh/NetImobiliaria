'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, SparklesIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline'
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
                                            disabled={isGenerating || !dadosBasicos || loading.basico}
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
                                    </div>

                                    {/* Preview Area Central */}
                                    <div className="w-full md:w-2/3 bg-slate-200/50 rounded-xl overflow-auto flex items-center justify-center p-4 md:p-8 border border-slate-300 relative min-h-[600px] custom-scrollbar">
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
                                                    {formato === 'feed' && <CriativoFeed basico={dadosBasicos} />}
                                                    {formato === 'stories' && <CriativoStories basico={dadosBasicos} />}
                                                    {formato === 'carrossel' && (
                                                        <div className="flex space-x-12">
                                                            <CriativoFeed basico={dadosBasicos} />
                                                            <CriativoCarrossel2 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} />
                                                            <CriativoCarrossel3 basico={dadosBasicos} detalhado={dadosDetalhados} completo={dadosCompletos} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <SparklesIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                                <h3 className="text-xl font-bold text-slate-700">Preview do Estúdio</h3>
                                                <p className="text-slate-500">O esqueleto do design arquitetural será processado aqui.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* HIDDEN CONTAINER FOR RENDERING */}
                                <div style={{ position: 'absolute', top: '-10000px', left: '-10000px', pointerEvents: 'none' }}>
                                    {dadosBasicos && (
                                        <div ref={containerRef}>
                                            <div id="imv-feed"><CriativoFeed basico={dadosBasicos} /></div>
                                            <div id="imv-stories"><CriativoStories basico={dadosBasicos} /></div>
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
