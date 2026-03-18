'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFichaCompleta } from '@/hooks/useFichaCompleta'
import { MapPinIcon, HomeIcon, PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Bed, Bath, BedDouble, Car, Square } from 'lucide-react'

const formatMoney = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return 'Sob Consulta'
    const num = Number(value)
    if (isNaN(num)) return 'Sob Consulta'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

export default function ImovelPDFPage() {
    const params = useParams()
    const { dadosBasicos, dadosDetalhados, dadosCompletos, loading, carregarDetalhados, carregarCompletos } = useFichaCompleta(params.id?.toString() || '')
    const [isReadyForPrint, setIsReadyForPrint] = useState(false)

    useEffect(() => {
        if (dadosBasicos && !dadosDetalhados && !loading.detalhado) {
            carregarDetalhados()
        }
        if (dadosBasicos && !dadosCompletos && !loading.completo) {
            carregarCompletos()
        }
    }, [dadosBasicos, dadosDetalhados, dadosCompletos, loading, carregarDetalhados, carregarCompletos])

    useEffect(() => {
        if (dadosBasicos && dadosDetalhados && dadosCompletos) {
            let isCancelled = false;
            let timer: any;

            const waitForImages = async () => {
                const images = Array.from(document.querySelectorAll('img'));

                await Promise.all(images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                }));

                if (isCancelled) return;

                // Allow browser to physically paint the decoded pixels
                timer = setTimeout(() => {
                    if (isCancelled) return;
                    setIsReadyForPrint(true);
                    window.onafterprint = () => { window.close(); };
                    window.print();
                }, 800);
            };

            // Allow React to mount the <img> elements to the DOM first
            setTimeout(() => {
                if (!isCancelled) waitForImages();
            }, 200);

            return () => {
                isCancelled = true;
                clearTimeout(timer);
            };
        }
    }, [dadosBasicos, dadosDetalhados, dadosCompletos])

    if (!dadosBasicos || !dadosDetalhados || !dadosCompletos) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                <h2 className="text-2xl font-bold text-slate-800">Preparando Ficha Premium...</h2>
                <p className="text-slate-500">Coletando fotos e detalhes para impressão ({params.id})</p>
            </div>
        )
    }

    const imagensExtras = dadosCompletos?.imagens?.filter((img: any) => img.url !== dadosBasicos.imagem_principal?.url) || []
    const amenidadesArray = dadosDetalhados?.amenidades?.lista || []
    const proximidadesArray = dadosDetalhados?.proximidades?.lista || []

    return (
        <div className="bg-white min-h-screen text-slate-900 font-sans print:p-0 p-8 max-w-5xl mx-auto">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; }
                    body { padding: 15mm; }
                }
            `}} />
            <table className="w-full">
                <thead className="print:table-header-group block">
                    <tr>
                        <td>
                            {/* Header branding repeated on all pages during print */}
                            <div className="flex justify-between items-center mb-8 border-b-2 border-slate-200 pb-4 print:mt-4 print:mb-8 pt-4">
                                <h1 className="text-sm uppercase tracking-widest text-slate-500 font-bold">Ficha Técnica Oficial</h1>
                                <span className="text-sm font-black text-blue-600 tracking-wider">www.imovtec.com.br</span>
                            </div>
                        </td>
                    </tr>
                </thead>
                <tbody className="print:table-row-group block">
                    <tr>
                        <td>
                            {/* SEÇÃO 1: Informações do Imóvel */}
                            <section className="mb-10 page-break-inside-avoid">
                                <div className="flex items-center mb-4 border-b border-slate-200 pb-2">
                                    <HomeIcon className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Informações do Imóvel</h2>
                                </div>

                                <div className="flex flex-row gap-8">
                                    {/* Imagem Principal */}
                                    <div className="w-1/2">
                                        {dadosBasicos.imagem_principal?.url ? (
                                            <img
                                                src={dadosBasicos.imagem_principal.url}
                                                alt="Imagem Principal"
                                                className="w-full h-80 object-cover rounded-2xl shadow-lg border border-slate-200"
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <div className="w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                                                <span className="text-slate-400">Sem Imagem</span>
                                            </div>
                                        )}
                                        <div className="mt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <div className="flex flex-col mb-2">
                                                <span className="inline-block bg-slate-900 text-white text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded self-start mb-2">
                                                    REF: {dadosBasicos.codigo || dadosBasicos.id}
                                                </span>
                                                <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">Localização</p>
                                            </div>
                                            <p className="text-slate-900 font-bold text-lg">{dadosBasicos.bairro}, {dadosBasicos.cidade_fk}</p>
                                            <p className="text-slate-700">{dadosBasicos.endereco}{dadosBasicos.numero && `, ${dadosBasicos.numero}`} • CEP {dadosBasicos.cep}</p>
                                        </div>
                                    </div>

                                    {/* Detalhes Técnicos */}
                                    <div className="w-1/2 flex flex-col justify-start">
                                        <div className="mb-4">
                                            <h3 className="text-3xl font-black leading-tight text-slate-900 mb-2">{dadosBasicos.titulo}</h3>
                                            <div className="text-sm bg-blue-600 text-white inline-block px-3 py-1 rounded-full font-bold mb-2">
                                                {dadosBasicos.tipo_nome} - {dadosBasicos.finalidade_nome}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Preço</span>
                                                <span className="block text-[13px] font-black text-blue-700 leading-tight">{formatMoney(dadosBasicos.preco)}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Condomínio</span>
                                                <span className="block text-[13px] font-bold text-slate-700 leading-tight">{formatMoney(dadosBasicos.preco_condominio ?? 0)}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">IPTU</span>
                                                <span className="block text-[13px] font-bold text-slate-700 leading-tight">{formatMoney(dadosBasicos.preco_iptu ?? 0)}</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Taxas Extras</span>
                                                <span className="block text-[13px] font-bold text-slate-700 leading-tight">{formatMoney(dadosBasicos.taxa_extra ?? 0)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                                            <div className="p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                                                <Bed className="h-5 w-5 text-blue-500 mb-1" />
                                                <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.quartos || '0'}</span>
                                                <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Quartos</span>
                                            </div>
                                            <div className="p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                                                <Bath className="h-5 w-5 text-cyan-500 mb-1" />
                                                <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.banheiros || '0'}</span>
                                                <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Banh.</span>
                                            </div>
                                            <div className="p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                                                <BedDouble className="h-5 w-5 text-purple-500 mb-1" />
                                                <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.suites || '0'}</span>
                                                <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Suítes</span>
                                            </div>
                                            <div className="p-2 border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                                                <Car className="h-5 w-5 text-amber-500 mb-1" />
                                                <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.vagas_garagem || '0'}</span>
                                                <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">Garagem</span>
                                            </div>
                                            <div className="p-2 border border-slate-200 rounded-lg col-span-2 flex items-center justify-center space-x-2">
                                                <Square className="h-5 w-5 text-emerald-500" />
                                                <div>
                                                    <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.area_total || '0'}</span>
                                                    <span className="block text-[10px] uppercase font-bold text-slate-500">Área (m²)</span>
                                                </div>
                                            </div>
                                            <div className="p-2 border border-slate-200 rounded-lg col-span-2 flex items-center justify-center space-x-2">
                                                <Square className="h-5 w-5 text-teal-600" />
                                                <div>
                                                    <span className="block text-lg font-black text-slate-800 leading-none">{dadosBasicos.area_construida || '0'}</span>
                                                    <span className="block text-[10px] uppercase font-bold text-slate-500">Área Const. (m²)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Descrição em Largura Total */}
                                {dadosBasicos.descricao && (
                                    <div className="mt-8 pt-6 border-t border-slate-200">
                                        <p className="font-bold text-slate-800 mb-2">Sobre o Imóvel:</p>
                                        <p className="text-[13px] text-slate-600 leading-relaxed text-justify">
                                            {dadosBasicos.descricao}
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* SEÇÃO 2: Atrativos (Amenidades) */}
                            <section className="mb-10 break-inside-avoid">
                                <div className="flex items-center mb-4 border-b border-slate-200 pb-2">
                                    <CheckCircleIcon className="h-6 w-6 text-emerald-500 mr-2" />
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Atrativos</h2>
                                </div>
                                {amenidadesArray.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {amenidadesArray.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                                <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-700">{item.nome}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Sem atrativos registrados.</p>
                                )}
                            </section>

                            {/* SEÇÃO 3: Proximidades */}
                            <section className="mb-10 break-inside-avoid">
                                <div className="flex items-center mb-4 border-b border-slate-200 pb-2">
                                    <MapPinIcon className="h-6 w-6 text-rose-500 mr-2" />
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Proximidades</h2>
                                </div>
                                {proximidadesArray.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {proximidadesArray.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                                <MapPinIcon className="h-5 w-5 text-rose-400 mr-2 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-700">{item.nome}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Sem proximidades registradas.</p>
                                )}
                            </section>

                            {/* SEÇÃO 4: Galeria de Imagens */}
                            <section className="mb-10">
                                <div className="flex items-center mb-4 border-b border-slate-200 pb-2">
                                    <PhotoIcon className="h-6 w-6 text-indigo-500 mr-2" />
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Galeria de Imagens</h2>
                                </div>
                                {imagensExtras.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                        {imagensExtras.slice(0, 18).map((img: any, idx: number) => (
                                            <div key={idx} className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 shadow-sm break-inside-avoid">
                                                <img
                                                    src={img.url}
                                                    alt={`Imagem ${idx}`}
                                                    className="w-full h-full object-cover"
                                                    crossOrigin="anonymous"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Nenhuma imagem adicional na galeria.</p>
                                )}
                                {imagensExtras.length > 18 && (
                                    <p className="text-xs text-slate-400 mt-4 text-center">Exibindo apenas as primeiras 18 fotos adicionais na impressão.</p>
                                )}
                            </section>

                            {/* Rodapé de Página de Impressão */}
                            <div className="text-center pt-8 border-t border-slate-200 mt-12 text-slate-400 text-xs hidden print:block break-inside-avoid">
                                Documento gerado oficialmente pela Imovtec. &copy; {new Date().getFullYear()} Todos os direitos reservados.
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {!isReadyForPrint && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center print:hidden">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="font-bold text-slate-700">Renderizando Arquivo PDF Original...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
