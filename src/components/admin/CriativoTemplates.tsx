import React, { forwardRef } from 'react'
import { Bed, BedDouble, Bath, Car, Square, Sparkles, MapPin, ExternalLink } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

// Util function to format money
const formatMoney = (val: number | undefined) => {
    if (!val) return 'Preço sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

export const CriativoFeed = forwardRef<HTMLDivElement, any>(({ basico }, ref) => {
    const coverImage = basico?.imagem_principal?.url || '/Assets/logo.png';

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col justify-end" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src={coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            </div>

            {/* Gradient Overlay for Top (Badges) and Bottom (Info) */}
            <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/60 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />

            {/* Top Bar: Badge and Logo */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-20">
                {basico?.lancamento ? (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-2 rounded-full font-bold tracking-widest uppercase text-lg shadow-xl">
                        🚀 Lançamento
                    </div>
                ) : (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-2 rounded-full font-bold tracking-widest uppercase text-lg shadow-xl">
                        💎 Oportunidade
                    </div>
                )}
                {/* Logo */}
                <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl flex items-center">
                    <img src="/imovitec-logo-definitive.png" alt="Imovtec" className="h-8 w-auto object-contain" crossOrigin="anonymous" />
                </div>
            </div>

            {/* Top Info Panel (Split from bottom) */}
            <div className="absolute top-36 left-12 right-12 z-20 drop-shadow-2xl">
                <h1 className="text-white text-6xl font-black leading-tight drop-shadow-lg tracking-tight">
                    {basico?.bairro || 'Localização Não Info.'}, <span className="font-light">{basico?.cidade_fk || ''}</span>
                </h1>
                <div className="mt-4 inline-block bg-white/20 backdrop-blur-md px-6 py-2 rounded-lg border border-white/20">
                    <p className="text-white text-2xl font-medium tracking-wide">
                        {basico?.tipo_nome || 'Tipo'} • {basico?.finalidade_nome || 'Finalidade'}
                    </p>
                </div>
            </div>

            {/* Bottom Panel (Icons and Price only, no glass box) */}
            <div className="z-20 mx-12 mb-20 flex flex-col justify-end">
                <div className="flex items-end justify-between border-t-2 border-white/30 pt-8">
                    {/* Attributes */}
                    <div className="flex space-x-6">
                        {basico?.quartos > 0 && (
                            <div className="flex flex-col items-center justify-center text-center w-20">
                                <Bed className="w-10 h-10 text-white/90 mb-2" strokeWidth={1.5} />
                                <span className="text-white text-2xl font-bold leading-none">{basico.quartos}</span>
                                <span className="text-white/80 text-sm font-semibold mt-1">Quarto{basico.quartos > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {basico?.banheiros > 0 && (
                            <div className="flex flex-col items-center justify-center text-center w-20">
                                <Bath className="w-10 h-10 text-white/90 mb-2" strokeWidth={1.5} />
                                <span className="text-white text-2xl font-bold leading-none">{basico.banheiros}</span>
                                <span className="text-white/80 text-sm font-semibold mt-1">Banh.</span>
                            </div>
                        )}
                        {basico?.suites > 0 && (
                            <div className="flex flex-col items-center justify-center text-center w-20">
                                <BedDouble className="w-10 h-10 text-white/90 mb-2" strokeWidth={1.5} />
                                <span className="text-white text-2xl font-bold leading-none">{basico.suites}</span>
                                <span className="text-white/80 text-sm font-semibold mt-1">Suíte{basico.suites > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {basico?.vagas_garagem > 0 && (
                            <div className="flex flex-col items-center justify-center text-center w-20">
                                <Car className="w-10 h-10 text-white/90 mb-2" strokeWidth={1.5} />
                                <span className="text-white text-2xl font-bold leading-none">{basico.vagas_garagem}</span>
                                <span className="text-white/80 text-sm font-semibold mt-1">Vaga{basico.vagas_garagem > 1 ? 's' : ''}</span>
                            </div>
                        )}
                        {basico?.area_total > 0 && (
                            <div className="flex flex-col items-center justify-center text-center w-24">
                                <Square className="w-10 h-10 text-white/90 mb-2" strokeWidth={1.5} />
                                <span className="text-white text-2xl font-bold leading-none">{basico.area_total}</span>
                                <span className="text-white/80 text-sm font-semibold mt-1">m²</span>
                            </div>
                        )}
                    </div>
                    {/* Price */}
                    <div className="text-right">
                        <p className="text-white/80 text-lg uppercase tracking-widest font-bold mb-1">Investimento</p>
                        <p className="text-white text-5xl font-black drop-shadow-lg leading-none">
                            {formatMoney(basico?.preco)}
                        </p>
                    </div>
                </div>
            </div>
            {/* Footer */}
            <div className="absolute bottom-8 inset-x-12 flex justify-between items-end z-20">
                <div className="flex items-center space-x-4">
                    {/* QR Code na esquerda para não bater no preço */}
                    <div className="bg-white p-2 rounded-xl shadow-2xl border-2 border-white/20">
                        <QRCodeCanvas 
                            value={`https://www.imovtec.com.br/imoveis/${basico?.id}`} 
                            size={100}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <div className="text-left bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                        <p className="text-white/70 text-xs tracking-widest font-bold uppercase">
                            REF: {basico?.codigo || basico?.id}
                        </p>
                        <p className="text-white text-sm font-black tracking-tight">
                            imovtec.com.br/imoveis/{basico?.id}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
})

export const CriativoStories = forwardRef<HTMLDivElement, any>(({ basico }, ref) => {
    const coverImage = basico?.imagem_principal?.url || '/Assets/logo.png';

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col justify-end" style={{ width: '1080px', height: '1920px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img src={coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
            </div>

            {/* Top/Bottom Overlay for better readability */}
            <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-black/70 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-[800px] bg-gradient-to-t from-black via-black/60 to-transparent z-10" />

            {/* Top Bar */}
            <div className="absolute top-24 left-12 right-12 flex justify-between items-start z-20">
                {basico?.lancamento ? (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full font-bold tracking-widest uppercase text-xl shadow-xl">
                        🚀 Lançamento
                    </div>
                ) : (
                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full font-bold tracking-widest uppercase text-xl shadow-xl">
                        💎 Oportunidade
                    </div>
                )}
                {/* Logo Image */}
                <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl flex items-center">
                    <img src="/imovitec-logo-definitive.png" alt="Imovtec" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
                </div>
            </div>

            {/* Top Info Panel (Split from bottom) */}
            <div className="absolute top-48 left-12 right-12 z-20 drop-shadow-2xl">
                <h1 className="text-white text-8xl font-black leading-[1.1] tracking-tight">
                    {basico?.bairro}
                </h1>
                <h2 className="text-white/90 text-5xl font-light mt-3">{basico?.cidade_fk}</h2>
                <div className="mt-8 inline-block bg-white/20 backdrop-blur-md px-6 py-2 rounded-lg border border-white/20">
                    <p className="text-white text-3xl font-medium tracking-wide">
                        {basico?.tipo_nome} • {basico?.finalidade_nome}
                    </p>
                </div>
            </div>

            {/* Bottom Panel (Icons and Price only, no glass box) */}
            <div className="z-20 mx-12 mb-48 flex flex-col">
                <div className="grid grid-cols-3 gap-y-12 gap-x-6">
                    {basico?.quartos > 0 && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <Bed className="w-12 h-12 text-white/90 mb-3" strokeWidth={1.5} />
                            <span className="text-white text-3xl font-bold leading-none">{basico.quartos}</span>
                            <span className="text-white/80 text-lg font-medium mt-1">Quartos</span>
                        </div>
                    )}
                    {basico?.banheiros > 0 && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <Bath className="w-12 h-12 text-white/90 mb-3" strokeWidth={1.5} />
                            <span className="text-white text-3xl font-bold leading-none">{basico.banheiros}</span>
                            <span className="text-white/80 text-lg font-medium mt-1">Banheiros</span>
                        </div>
                    )}
                    {basico?.suites > 0 && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <BedDouble className="w-12 h-12 text-white/90 mb-3" strokeWidth={1.5} />
                            <span className="text-white text-3xl font-bold leading-none">{basico.suites}</span>
                            <span className="text-white/80 text-lg font-medium mt-1">Suítes</span>
                        </div>
                    )}
                    {basico?.vagas_garagem > 0 && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <Car className="w-12 h-12 text-white/90 mb-3" strokeWidth={1.5} />
                            <span className="text-white text-3xl font-bold leading-none">{basico.vagas_garagem}</span>
                            <span className="text-white/80 text-lg font-medium mt-1">Vagas</span>
                        </div>
                    )}
                    {basico?.area_total > 0 && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <Square className="w-12 h-12 text-white/90 mb-3" strokeWidth={1.5} />
                            <span className="text-white text-3xl font-bold leading-none">{basico.area_total}</span>
                            <span className="text-white/80 text-lg font-medium mt-1">m²</span>
                        </div>
                    )}
                </div>

                <div className="mt-14 pt-10 border-t-2 border-white/30 flex items-end justify-between">
                    <div>
                        <p className="text-white/80 text-2xl uppercase tracking-widest font-bold mb-2">Investimento</p>
                        <p className="text-white text-7xl font-black drop-shadow-lg leading-none">
                            {formatMoney(basico?.preco)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Instruction for Sticker / Link */}
            <div className="absolute bottom-16 inset-x-0 text-center z-20 flex flex-col items-center">
                <div className="animate-bounce w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-white">
                    <ExternalLink className="w-10 h-10 text-white" />
                </div>
                
                {/* Link Visível e QR Code Box - Movido para não sobrepor o preço */}
                <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border-2 border-white/20 flex items-center space-x-8 max-w-[90%] mx-auto">
                    <div className="bg-white p-2 rounded-xl shadow-inner border border-slate-100">
                        <QRCodeCanvas 
                            value={`https://www.imovtec.com.br/imoveis/${basico?.id}`} 
                            size={180}
                            level="H"
                        />
                    </div>
                    <div className="text-left">
                        <p className="text-blue-600 text-3xl font-black tracking-tight uppercase">
                            Acesse o Site
                        </p>
                        <p className="text-slate-900 text-2xl font-bold mt-1">
                            imovtec.com.br/imoveis/{basico?.id}
                        </p>
                        <p className="text-slate-500 text-xl mt-2 font-medium">Ref: {basico?.codigo}</p>
                    </div>
                </div>
            </div>
        </div>
    )
})

export const CriativoCarrossel2 = forwardRef<HTMLDivElement, any>(({ basico, detalhado, completo }, ref) => {
    // Amenidades (Secondary photo or standard hero image but darkened)
    const secondaryImage = completo?.imagens?.[1]?.url || basico?.imagem_principal?.url || '/Assets/logo.png';
    const amenidadesArray = detalhado?.amenidades?.lista || [];
    const mainAmenidades = amenidadesArray.slice(0, 8); // Top 8

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col items-center justify-center" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Illustration (Architectural Blueprint Style) */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-900 to-black"></div>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <Sparkles className="w-[800px] h-[800px] text-white" strokeWidth={0.5} />
                </div>
            </div>

            <div className="z-10 w-full px-20">
                <h2 className="text-blue-400 text-3xl font-bold tracking-widest uppercase mb-4 text-center">Um Novo Nível de Exclusividade</h2>
                <h1 className="text-white text-6xl font-black leading-tight tracking-tight text-center mb-16">Seu Novo Estilo de Vida</h1>

                {amenidadesArray.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {mainAmenidades.map((amenidade: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 bg-white/10 border border-white/20 px-6 py-4 rounded-full backdrop-blur-md shadow-lg">
                                <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0" />
                                <span className="text-white text-2xl font-medium tracking-wide">{amenidade.nome || amenidade}</span>
                            </div>
                        ))}
                        {amenidadesArray.length > 8 && (
                            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-6 py-4 rounded-full backdrop-blur-md">
                                <span className="text-white/70 text-2xl font-medium tracking-wide">+{amenidadesArray.length - 8}</span>
                            </div>
                        )}
                    </div>
                ) : detalhado ? (
                    <div className="text-center text-white/50 text-3xl font-light">
                        Descubra todos os detalhes exclusivos no nosso site.
                    </div>
                ) : null}
            </div>
            {/* Branding Final */}
            <div className="absolute top-12 left-12 bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl flex items-center">
                <img src="/imovitec-logo-definitive.png" alt="Imovtec" className="h-8 w-auto object-contain" crossOrigin="anonymous" />
            </div>
        </div>
    )
})

export const CriativoCarrossel3 = forwardRef<HTMLDivElement, any>(({ basico, detalhado, completo }, ref) => {
    // Proximidades (Third photo or texture)
    const thirdImage = completo?.imagens?.[2]?.url || basico?.imagem_principal?.url || '/Assets/logo.png';
    const proximidadesArray = detalhado?.proximidades?.lista || [];
    const mainProximidades = proximidadesArray.slice(0, 6); // Top 6

    return (
        <div ref={ref} className="bg-slate-900 relative flex flex-col justify-between" style={{ width: '1080px', height: '1080px', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            {/* Background Illustration (Topographic/Map Style) */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-900 to-black"></div>
                 <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, white 2px, transparent 2px)', backgroundSize: '36px 36px' }}></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] opacity-5 pointer-events-none">
                    <MapPin className="w-[800px] h-[800px] text-white" strokeWidth={0.5} />
                </div>
            </div>

            <div className="z-10 pt-32 px-20">
                <h2 className="text-blue-400 text-3xl font-bold tracking-widest uppercase mb-4">Conveniência Máxima</h2>
                <h1 className="text-white text-7xl font-black leading-tight tracking-tight mb-16">Tudo a Poucos<br/>Passos de Você</h1>

                {proximidadesArray.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-4">
                        {mainProximidades.map((prox: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 bg-blue-600/20 border border-blue-500/30 px-6 py-4 rounded-3xl backdrop-blur-md">
                                <MapPin className="w-6 h-6 text-blue-400" strokeWidth={2} />
                                <span className="text-white text-2xl font-medium">{prox.nome || prox}</span>
                            </div>
                        ))}
                        {proximidadesArray.length > 6 && (
                            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-6 py-4 rounded-3xl backdrop-blur-md">
                                <span className="text-white/70 text-2xl font-medium tracking-wide">e mais +{proximidadesArray.length - 6}</span>
                            </div>
                        )}
                    </div>
                ) : detalhado ? (
                    <div className="text-white/60 text-3xl font-light max-w-2xl">
                        Localização privilegiada no coração da cidade. Onde o melhor se encontra com o seu novo lar.
                    </div>
                ) : null}
            </div>

            {/* Bottom Call to Action */}
            <div className="z-10 w-full bg-blue-600/95 backdrop-blur-md p-12 flex items-center justify-between shadow-2xl border-t border-white/20">
                <div className="flex items-center space-x-8">
                    <div className="bg-white p-3 rounded-2xl shadow-xl">
                        <QRCodeCanvas 
                            value={`https://www.imovtec.com.br/imoveis/${basico?.id}`} 
                            size={120}
                            level="H"
                        />
                    </div>
                    <div>
                         <p className="text-white/90 text-2xl uppercase tracking-widest font-bold mb-1">Ref: {basico?.codigo}</p>
                         <p className="text-white text-4xl font-black">Escaneie ou acesse pelo link:</p>
                         <p className="text-blue-100 text-2xl font-medium mt-1">imovtec.com.br/imoveis/{basico?.id}</p>
                    </div>
                </div>
            </div>
        </div>
    )
})
