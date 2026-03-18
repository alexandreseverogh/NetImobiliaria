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
    const [formato, setFormato] = useState<'copy' | 'feed' | 'stories' | 'carrossel'>('copy')
    const [isGenerating, setIsGenerating] = useState(false)
    const [socialCaption, setSocialCaption] = useState('')
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

    const publicUrl = dadosBasicos ? `https://www.imovitec.com.br/imoveis/${dadosBasicos.id}` : ''

    // Função para gerar a legenda social (Copywriting)
    useEffect(() => {
        if (dadosBasicos && dadosDetalhados) {
            const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dadosBasicos.preco || 0);
            const finalidade = dadosBasicos.finalidade_nome?.toLowerCase() === 'aluguel' ? 'Locação' : 'Venda';
            const titulo = dadosBasicos.titulo || `${dadosBasicos.tipo_nome} em ${dadosBasicos.bairro}`;
            
            // Lógica para suítes: Exibir apenas se > 0
            const suitesCount = Number(dadosBasicos.suites || 0);
            const suitesText = suitesCount > 0 ? ` (${suitesCount} ${suitesCount > 1 ? 'Suítes' : 'Suíte'})` : '';

            // Lógica para supressão de campos zerados/nulos
            const q = Number(dadosBasicos.quartos || 0);
            const b = Number(dadosBasicos.banheiros || 0);
            const v = Number(dadosBasicos.vagas_garagem || 0);
            const a = Math.round(dadosBasicos.area_total || 0);

            const configText = [
                q > 0 ? `🛌 ${q} Dormitório${q > 1 ? 's' : ''}${suitesText}` : '',
                b > 0 ? `🚿 ${b} Banheiro${b > 1 ? 's' : ''}` : '',
                v > 0 ? `🚗 ${v} Vaga${v > 1 ? 's' : ''} de Garagem` : '',
                a > 0 ? `📐 ${a}m² de Área Útil` : ''
            ].filter(Boolean).join('\n');

            const text = `🏠 *${titulo.toUpperCase()}*\n` +
                `💎 *Oportunidade Exclusiva | IMOVITEC*\n\n` +
                `Sua busca pelo lar dos sonhos acaba de encontrar uma resposta! Este incrível ${dadosBasicos.tipo_nome} combina design moderno, alto conforto e uma localização de destaque.\n\n` +
                `🏢 *IMOVITEC - Inteligência em Soluções Imobiliárias* 🏘️\n\n` +
                `📍 *Localização:* ${dadosBasicos.bairro}, ${dadosBasicos.cidade_fk} - ${dadosBasicos.estado_fk || 'SP'}\n\n` +
                (configText ? `*Configurações:*\n${configText}\n\n` : '') +
                `💰 *Investimento:* ${precoFormatado} (${finalidade})\n\n` +
                `✨ *Diferenciais de Destaque:* Ambientes integrados, acabamento premium e localização privilegiada.\n\n` +
                `🚀 Garanta sua exclusividade! Imóveis com este perfil são raros e de alta liquidez.\n\n` +
                `🔗 *Acesse agora todos os detalhes e fotos em HD:* \n${publicUrl}\n\n` +
                `---\n` +
                `🏢 *Imovitec - Inteligência em Soluções Imobiliárias*\n` +
                `🌐 imovitec.com.br\n\n` +
                `#Imovitec #SolucoesImobiliarias #MercadoImobiliario #Oportunidade #${dadosBasicos.cidade_fk?.replace(/\s/g, '')} #${dadosBasicos.bairro?.replace(/\s/g, '')}`;

            setSocialCaption(text);
        }
    }, [dadosBasicos, dadosDetalhados, publicUrl])

    const handleDownload = async () => {
        if (!containerRef.current || !dadosBasicos) return
        try {
            setIsGenerating(true)
            
            const getOptions = (width: number, height: number) => ({
                width, height, pixelRatio: 1, backgroundColor: '#0f172a',
                style: { transform: 'scale(1)', transformOrigin: 'top left' }
            })

            const prefix = `imovitec-${dadosBasicos.codigo || dadosBasicos.id}`

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
                const zip = new JSZip()
                
                // 1. Gerar Capa
                const nodeFeed = document.getElementById('imv-feed')
                if (nodeFeed) {
                    const data = await toPng(nodeFeed, getOptions(1080, 1080))
                    zip.file(`01-capa.png`, data.split(',')[1], {base64: true})
                }

                // 2. Gerar Amenidades (Pode ter múltiplos)
                const amenidadesNodes = document.querySelectorAll('[id^="imv-carro2-"]')
                for (let i = 0; i < amenidadesNodes.length; i++) {
                    const data = await toPng(amenidadesNodes[i] as HTMLElement, getOptions(1080, 1080))
                    zip.file(`02-amenidades-${i+1}.png`, data.split(',')[1], {base64: true})
                }

                // 3. Gerar Proximidades (Pode ter múltiplos)
                const proximidadesNodes = document.querySelectorAll('[id^="imv-carro3-"]')
                for (let i = 0; i < proximidadesNodes.length; i++) {
                    const data = await toPng(proximidadesNodes[i] as HTMLElement, getOptions(1080, 1080))
                    zip.file(`03-proximidades-${i+1}.png`, data.split(',')[1], {base64: true})
                }

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



    const handleCopyLink = () => {
        if (!publicUrl) return
        navigator.clipboard.writeText(publicUrl)
        alert('Link copiado para a área de transferência!')
    }

    const handleShareWhatsApp = () => {
        if (!socialCaption) return
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(socialCaption)}`, '_blank')
    }

    const handleCopyCaption = () => {
        if (!socialCaption) return
        navigator.clipboard.writeText(socialCaption)
        alert('Legenda profissional copiada com sucesso!')
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
                                            <h4 className="font-bold text-slate-800 mb-4">Escolha a Opção</h4>
                                            <div className="space-y-3">
                                                <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${formato === 'copy' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                                    <input type="radio" className="mt-1" name="formato" checked={formato === 'copy'} onChange={() => setFormato('copy')} />
                                                    <div className="ml-3">
                                                        <span className="block font-bold text-slate-900 text-sm">Legenda Social (Copywriting)</span>
                                                        <span className="block text-slate-500 text-xs mt-0.5">Texto persuasivo com emojis e link pronto para Bio/Post</span>
                                                    </div>
                                                </label>

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
                                                        <span className="block text-slate-500 text-xs mt-0.5">Capa, Amenidades e Proximidades (Múltiplos Cards)</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Botão Principal de Exportação */}
                                        {formato === 'copy' ? (
                                            <button
                                                onClick={handleCopyCaption}
                                                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all hover:-translate-y-1 hover:shadow-xl flex items-center justify-center space-x-2"
                                            >
                                                <ClipboardDocumentIcon className="w-6 h-6" />
                                                <span>Copiar Legenda Estratégica</span>
                                            </button>
                                        ) : (
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
                                                ) }
                                            </button>
                                        )}

                                        {/* Opções de Compartilhamento de Link */}
                                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 space-y-4">
                                            <h4 className="text-indigo-900 font-bold text-sm flex items-center">
                                                <ShareIcon className="w-4 h-4 mr-2" />
                                                Link Clicável (Importante)
                                            </h4>
                                            <p className="text-indigo-800 text-[11px] leading-relaxed">
                                                🚨 <b>Atenção:</b> Arquivos de imagem (PNG) não permitem cliques. 
                                                Para que o cliente possa clicar e abrir o site, use a <b>Legenda Social</b> acima ou o botão abaixo:
                                            </p>
                                            
                                            <div className="space-y-2">
                                                <button
                                                    onClick={handleShareWhatsApp}
                                                    className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white hover:bg-green-600 px-4 py-3 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95"
                                                >
                                                    <span>Enviar no WhatsApp</span>
                                                </button>
                                            </div>
                                            <p className="text-slate-500 text-[10px] italic">
                                                * O envio pelo WhatsApp já inclui a legenda profissional com o seu link clicável.
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
                                                            transform: `scale(${formato === 'carrossel' ? 0.22 : 0.35})`, 
                                                            transformOrigin: 'top left',
                                                            width: formato === 'stories' ? 1080 : formato === 'carrossel' ? (1080 * 10) : 1080,
                                                            height: formato === 'stories' ? 1920 : 1080,
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0
                                                        }}
                                                    >
                                                        {formato === 'copy' && (
                                                            <div className="bg-white p-8 rounded-2xl shadow-xl w-[1080px] h-full overflow-y-auto text-left" style={{ fontFamily: 'monospace' }}>
                                                                <h3 className="text-2xl font-black text-slate-900 mb-6 border-b pb-4">Visualização da Legenda (IMOVITEC)</h3>
                                                                <pre className="whitespace-pre-wrap text-2xl text-slate-800 leading-relaxed font-sans">
                                                                    {socialCaption || 'Buscando informações do imóvel...'}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {formato === 'feed' && <CriativoFeed basico={dadosBasicos} publicUrl={publicUrl} />}
                                                        {formato === 'stories' && <CriativoStories basico={dadosBasicos} publicUrl={publicUrl} />}
                                                        {formato === 'carrossel' && (
                                                            <div className="flex space-x-12">
                                                                <CriativoFeed basico={dadosBasicos} publicUrl={publicUrl} />
                                                                {/* Renderização dinâmica de múltiplos cards conforme Proposal C */}
                                                                {(() => {
                                                                    const amens = dadosDetalhados?.amenidades?.lista || [];
                                                                    const chunks = [];
                                                                    for (let i = 0; i < amens.length; i += 16) {
                                                                        chunks.push(amens.slice(i, i + 16));
                                                                    }
                                                                    return chunks.map((chunk, idx) => (
                                                                        <CriativoCarrossel2 key={`amen-${idx}`} customItems={chunk} basico={dadosBasicos} />
                                                                    ));
                                                                })()}
                                                                {(() => {
                                                                    const proxs = dadosDetalhados?.proximidades?.lista || [];
                                                                    const chunks = [];
                                                                    for (let i = 0; i < proxs.length; i += 12) {
                                                                        chunks.push(proxs.slice(i, i + 12));
                                                                    }
                                                                    return chunks.map((chunk, idx) => (
                                                                        <CriativoCarrossel3 key={`prox-${idx}`} customItems={chunk} basico={dadosBasicos} />
                                                                    ));
                                                                })()}
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
                                            {/* Containers ocultos para renderização de múltiplos cards */}
                                            {(() => {
                                                const amens = dadosDetalhados?.amenidades?.lista || [];
                                                const chunks = [];
                                                for (let i = 0; i < amens.length; i += 16) {
                                                    chunks.push(amens.slice(i, i + 16));
                                                }
                                                return chunks.map((chunk, idx) => (
                                                    <div id={`imv-carro2-${idx+1}`} key={`render-amen-${idx}`}>
                                                        <CriativoCarrossel2 customItems={chunk} basico={dadosBasicos} />
                                                    </div>
                                                ));
                                            })()}
                                            {(() => {
                                                const proxs = dadosDetalhados?.proximidades?.lista || [];
                                                const chunks = [];
                                                for (let i = 0; i < proxs.length; i += 12) {
                                                    chunks.push(proxs.slice(i, i + 12));
                                                }
                                                return chunks.map((chunk, idx) => (
                                                    <div id={`imv-carro3-${idx+1}`} key={`render-prox-${idx}`}>
                                                        <CriativoCarrossel3 customItems={chunk} basico={dadosBasicos} />
                                                    </div>
                                                ));
                                            })()}
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
