'use client'

import React from 'react'

export default function AdminLogoPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white">
                    <h1 className="text-3xl font-bold">Gerenciamento de Identidade</h1>
                    <p className="text-blue-100 mt-2">Visualize e gerencie as logos oficiais da plataforma Imovtec.</p>
                </div>

                <div className="p-8 space-y-12">
                    {/* Logo Definitiva */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                            Logo Oficial Definitiva
                        </h2>
                        <div className="bg-slate-50 rounded-xl p-12 flex items-center justify-center border-2 border-dashed border-gray-200">
                            <div className="bg-white p-6 rounded-lg shadow-sm">
                                <img
                                    src="/imovtec-logo-definitive.png"
                                    alt="Imovtec Definitive Logo"
                                    className="max-h-48 w-auto h-auto object-contain"
                                />
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                                <p className="font-semibold text-gray-700 mb-1">Caminho do Arquivo:</p>
                                <code>/public/imovtec-logo-definitive.png</code>
                            </div>
                            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                                <p className="font-semibold text-gray-700 mb-1">Uso Recomendado:</p>
                                Header principal, Footer e PDFs oficiais.
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Variações e Mascote */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                            Mascote Imovtec AI
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="bg-slate-50 rounded-xl p-8 flex items-center justify-center border border-gray-200 aspect-square">
                                    <img src="/imovtec-robot-android.png" alt="Mascote Android style" className="max-h-32 w-auto h-auto" />
                                </div>
                                <p className="text-center text-sm font-medium text-gray-700">Versão Android Minimalista</p>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-slate-50 rounded-xl p-8 flex items-center justify-center border border-gray-200 aspect-square">
                                    <img src="/imovtec-robot-house-key.png" alt="Mascote Casa e Chave" className="max-h-32 w-auto h-auto" />
                                </div>
                                <p className="text-center text-sm font-medium text-gray-700">Versão Conceitual Robô</p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="bg-gray-50 p-6 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                        &copy; {new Date().getFullYear()} Imovtec • Identidade Visual Consolidada
                    </p>
                </div>
            </div>
        </div>
    )
}
