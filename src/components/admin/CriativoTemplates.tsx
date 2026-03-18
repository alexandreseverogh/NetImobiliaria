import React, { forwardRef } from 'react'
import { Bed, BedDouble, Bath, Car, Square, Sparkles, MapPin } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// Util function to format money
const formatMoney = (val: number | undefined) => {
    if (!val) return 'Preço sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

export const CriativoFeed = forwardRef<HTMLDivElement, { basico: any; publicUrl?: string }>(({ basico, publicUrl }, ref) => {
    const coverImage = basico?.imagem_principal?.url || '/Assets/logo.png';

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col justify-end" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src={coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) brightness(0.95)' }} crossOrigin="anonymous" />
            </div>

            {/* Gradient Overlay for Top (Badges) and Bottom (Info) */}
            <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/70 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-[450px] bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

            {/* Top Bar: Badge and Logo */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-20">
                {basico?.lancamento ? (
                    <div className="bg-blue-600/90 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-2xl font-black tracking-widest uppercase text-2xl shadow-2xl">
                        🚀 Lançamento
                    </div>
                ) : (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-3 rounded-2xl font-black tracking-widest uppercase text-2xl shadow-2xl">
                        💎 Oportunidade
                    </div>
                )}
                {/* Logo */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center overflow-hidden border border-white/40 group" style={{ width: '150px', height: '150px' }}>
                    <img src="/imovitec-logo-definitive.png" alt="Imovitec" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} crossOrigin="anonymous" />
                </div>
            </div>

            {/* Top Info Panel (Split from bottom) */}
            <div className="absolute top-36 left-12 right-12 z-20 drop-shadow-2xl mt-4">
                <h1 className="text-white text-7xl font-black leading-[1.1] drop-shadow-2xl tracking-tight">
                    {basico?.bairro || 'Localização'}, <span className="font-light text-white/80 shrink-0">{basico?.cidade_fk || ''}</span>
                </h1>
                <div className="mt-6 inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-6 py-2 rounded-xl border border-white/20">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <p className="text-white text-2xl font-bold tracking-wide">
                        {basico?.tipo_nome || 'Tipo'} • {basico?.finalidade_nome || 'Finalidade'}
                    </p>
                </div>
            </div>

            {/* Bottom Panel (Icons and Price only, no glass box) */}
            <div className="z-20 mx-12 mb-20 flex flex-col justify-end">
                <div className="flex items-end justify-between border-t border-white/30 pt-10">
                    {/* Attributes */}
                    <div className="flex space-x-8">
                        {basico?.quartos > 0 && (
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="bg-white/10 p-4 rounded-2xl mb-3 border border-white/10">
                                    <Bed className="w-10 h-10 text-white" strokeWidth={1.5} />
                                </div>
                                <span className="text-white text-3xl font-black leading-none">{basico.quartos}</span>
                                <span className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2 px-1">Dorms</span>
                            </div>
                        )}
                        {basico?.suites > 0 && (
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="bg-white/10 p-4 rounded-2xl mb-3 border border-white/10">
                                    <BedDouble className="w-10 h-10 text-blue-400" strokeWidth={1.5} />
                                </div>
                                <span className="text-white text-3xl font-black leading-none">{basico.suites}</span>
                                <span className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2 px-1">Suítes</span>
                            </div>
                        )}
                        {basico?.vagas_garagem > 0 && (
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="bg-white/10 p-4 rounded-2xl mb-3 border border-white/10">
                                    <Car className="w-10 h-10 text-white" strokeWidth={1.5} />
                                </div>
                                <span className="text-white text-3xl font-black leading-none">{basico.vagas_garagem}</span>
                                <span className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2 px-1">Vagas</span>
                            </div>
                        )}
                        {basico?.area_total > 0 && (
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="bg-white/10 p-4 rounded-2xl mb-3 border border-white/10">
                                    <Square className="w-10 h-10 text-white" strokeWidth={1.5} />
                                </div>
                                <span className="text-white text-3xl font-black leading-none">{Math.round(basico.area_total)}</span>
                                <span className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2 px-1">m²</span>
                            </div>
                        )}
                    </div>

                    {/* QR Code & Price */}
                    <div className="flex items-end space-x-8">
                        {publicUrl && (
                            <div className="bg-white p-3 rounded-2xl shadow-2xl border border-white/20 mb-2">
                                <QRCodeSVG value={publicUrl} size={110} level="H" includeMargin={false} />
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-white/60 text-xl uppercase tracking-[0.4em] font-black mb-2 drop-shadow-md">Investimento</p>
                            <p className="text-white text-7xl font-black drop-shadow-2xl leading-none tracking-tighter">
                                {formatMoney(basico?.preco)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-10 inset-x-0 px-12 z-20 flex justify-between items-center opacity-80">
                <p className="text-white/90 text-sm tracking-[0.2em] font-black uppercase">
                   Ref: {basico?.codigo || basico?.id}
                </p>
                <div className="h-[1px] flex-grow mx-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <p className="text-white/90 text-sm tracking-[0.2em] font-black uppercase">
                    IMOVTEC.COM.BR
                </p>
            </div>
        </div>
    )
})

export const CriativoStories = forwardRef<HTMLDivElement, { basico: any; publicUrl?: string }>(({ basico, publicUrl }, ref) => {
    const coverImage = basico?.imagem_principal?.url || '/Assets/logo.png';

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col justify-end" style={{ width: '1080px', height: '1920px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Image */}
            <div className="absolute inset-0 z-0 text-white">
                <img src={coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) brightness(0.9)' }} crossOrigin="anonymous" />
            </div>

            {/* Top/Bottom Overlay for better readability */}
            <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-[900px] bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

            {/* Top Bar */}
            <div className="absolute top-24 left-12 right-12 flex justify-between items-start z-20">
                {basico?.lancamento ? (
                    <div className="bg-blue-600/90 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-3xl shadow-2xl">
                        🚀 Lançamento
                    </div>
                ) : (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-black tracking-widest uppercase text-3xl shadow-2xl">
                        💎 Oportunidade
                    </div>
                )}
                {/* Logo Image */}
                <div className="bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden border-2 border-white/50" style={{ width: '200px', height: '200px' }}>
                    <img src="/imovitec-logo-definitive.png" alt="Imovitec" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} crossOrigin="anonymous" />
                </div>
            </div>

            {/* Top Info Panel (Split from bottom) */}
            <div className="absolute top-72 left-12 right-12 z-20 drop-shadow-2xl mt-10">
                <h1 className="text-white text-[120px] font-black leading-[0.95] tracking-tighter">
                    {basico?.bairro}
                </h1>
                <h2 className="text-blue-400 text-6xl font-black mt-4 uppercase tracking-wider">{basico?.cidade_fk}</h2>
                <div className="mt-12 inline-flex items-center space-x-4 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                    <p className="text-white text-4xl font-bold tracking-wide">
                        {basico?.tipo_nome} • {basico?.finalidade_nome}
                    </p>
                </div>
            </div>

            {/* Bottom Panel (Icons and Price only, no glass box) */}
            <div className="z-20 mx-12 mb-40 flex flex-col">
                <div className="grid grid-cols-2 gap-y-12 gap-x-8">
                    {basico?.quartos > 0 && (
                        <div className="flex items-center space-x-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                            <Bed className="w-16 h-16 text-white" strokeWidth={1.5} />
                            <div>
                                <span className="block text-white text-5xl font-black leading-none">{basico.quartos}</span>
                                <span className="text-white/60 text-xl font-bold uppercase tracking-widest">Dormitórios</span>
                            </div>
                        </div>
                    )}
                    {basico?.suites > 0 && (
                        <div className="flex items-center space-x-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                            <BedDouble className="w-16 h-16 text-blue-400" strokeWidth={1.5} />
                            <div>
                                <span className="block text-white text-5xl font-black leading-none">{basico.suites}</span>
                                <span className="text-white/60 text-xl font-bold uppercase tracking-widest">Suítes Master</span>
                            </div>
                        </div>
                    )}
                    {basico?.vagas_garagem > 0 && (
                        <div className="flex items-center space-x-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                            <Car className="w-16 h-16 text-white" strokeWidth={1.5} />
                            <div>
                                <span className="block text-white text-5xl font-black leading-none">{basico.vagas_garagem}</span>
                                <span className="text-white/60 text-xl font-bold uppercase tracking-widest">Vagas Cobertas</span>
                            </div>
                        </div>
                    )}
                    {basico?.area_total > 0 && (
                        <div className="flex items-center space-x-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                            <Square className="w-16 h-16 text-white" strokeWidth={1.5} />
                            <div>
                                <span className="block text-white text-5xl font-black leading-none">{Math.round(basico.area_total)}</span>
                                <span className="text-white/60 text-xl font-bold uppercase tracking-widest">m² Privativos</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-20 pt-16 border-t-2 border-white/20 flex flex-col items-center text-center">
                    <p className="text-white/60 text-3xl uppercase tracking-[0.5em] font-black mb-6 drop-shadow-md">Investimento</p>
                    <p className="text-white text-[130px] font-black drop-shadow-2xl leading-none tracking-tighter mb-12">
                        {formatMoney(basico?.preco)}
                    </p>
                    
                    {publicUrl && (
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-white/20 flex flex-col items-center">
                            <QRCodeSVG value={publicUrl} size={280} level="H" />
                            <p className="mt-4 text-slate-900 text-2xl font-black uppercase tracking-widest">Escaneie para detalhes</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Instruction (Clean) */}
            <div className="absolute bottom-12 inset-x-0 text-center z-20 flex flex-col items-center">
                <div className="w-32 h-1.5 bg-blue-500 rounded-full mb-6"></div>
                <p className="text-white text-4xl font-black tracking-[0.2em] uppercase drop-shadow-md">
                    imovtec.com.br
                </p>
                <p className="text-white/50 text-2xl mt-3 font-bold tracking-widest">REF: {basico?.codigo}</p>
            </div>
        </div>
    )
})

export const CriativoCarrossel2 = forwardRef<HTMLDivElement, { customItems?: any[]; basico?: any }>(({ customItems, basico }, ref) => {
    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Illustration */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-black"></div>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
            </div>

            {/* Top Bar Branding */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-center z-20">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center border border-white/50">
                    <img src="/imovitec-logo-definitive.png" alt="Imovitec" className="h-[120px] w-auto object-contain" crossOrigin="anonymous" />
                </div>
                <div className="text-right">
                    <h2 className="text-blue-400 text-3xl font-black tracking-[0.2em] uppercase">UM NOVO NÍVEL</h2>
                    <p className="text-white/60 text-xl font-bold tracking-widest uppercase">DE EXCLUSIVIDADE</p>
                </div>
            </div>

            <div className="z-10 w-full px-20 mt-44">
                <h1 className="text-white text-5xl font-black leading-tight tracking-tight mb-8">Seu Novo Estilo de Vida</h1>

                {customItems && customItems.length > 0 ? (
                    <div className="grid grid-cols-3 gap-y-6 gap-x-4">
                        {customItems.map((item: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 bg-white/10 border border-white/20 px-5 py-3.5 rounded-2xl backdrop-blur-md shadow-lg">
                                <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0" />
                                <span className="text-white text-xl font-medium tracking-wide truncate">{item.nome || item}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-white/50 text-3xl font-light py-20">
                        Descubra todos os detalhes exclusivos no nosso site.
                    </div>
                )}
            </div>

            {/* Footer Branding Slogan */}
            <div className="absolute bottom-10 inset-x-0 text-center z-20 flex flex-col items-center opacity-70">
                <p className="text-white/80 text-xl uppercase tracking-[0.4em] font-black">
                    IMOVTEC • Inteligência em Soluções Imobiliárias
                </p>
            </div>
        </div>
    )
})

export const CriativoCarrossel3 = forwardRef<HTMLDivElement, { customItems?: any[]; basico?: any }>(({ customItems, basico }, ref) => {
    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Illustration */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-900 to-black"></div>
                 <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, white 2px, transparent 2px)', backgroundSize: '36px 36px' }}></div>
            </div>

            {/* Top Bar Branding */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-center z-20">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl flex items-center border border-white/50">
                    <img src="/imovitec-logo-definitive.png" alt="Imovitec" className="h-[120px] w-auto object-contain" crossOrigin="anonymous" />
                </div>
                <div className="text-right">
                    <h2 className="text-blue-400 text-3xl font-black tracking-[0.2em] uppercase">CONVENIÊNCIA</h2>
                    <p className="text-white/60 text-xl font-bold tracking-widest uppercase">MÁXIMA</p>
                </div>
            </div>

            <div className="z-10 w-full px-20 mt-44">
                <h1 className="text-white text-5xl font-black leading-tight tracking-tight mb-6">Tudo a Poucos<br/>Passos de Você</h1>

                {customItems && customItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                        {customItems.map((item: any, index: number) => (
                            <div key={index} className="flex items-center space-x-4 bg-blue-600/20 border border-blue-500/30 px-6 py-3.5 rounded-[2rem] backdrop-blur-md">
                                <MapPin className="w-7 h-7 text-blue-400" strokeWidth={2.5} />
                                <span className="text-white text-2xl font-semibold truncate">{item.nome || item}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-white/40 text-3xl font-light py-20">
                        Localização privilegiada no coração da cidade.
                    </div>
                )}
            </div>

            {/* Bottom Call to Action (Design Clean) - Bottom Sticky */}
            <div className="absolute bottom-0 inset-x-0 z-20 bg-blue-600/95 backdrop-blur-md p-8 flex items-center justify-center shadow-2xl border-t border-white/20">
                <div className="text-center">
                     <p className="text-white/80 text-lg uppercase tracking-[0.3em] font-bold mb-2">Imovtec Imobiliária Digital</p>
                     <p className="text-white text-3xl font-black">Consulte este imóvel em nosso site usando a REF: {basico?.codigo || basico?.id}</p>
                </div>
            </div>
        </div>
    )
})
