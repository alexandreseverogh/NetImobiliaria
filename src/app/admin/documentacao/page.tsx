'use client';

import React from 'react';
import { BookOpen, ExternalLink, RefreshCw, FileText } from 'lucide-react';

export default function DocumentacaoPage() {
  const docsUrl = 'http://localhost:3012/#/';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 bg-slate-50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Documentação Viva & Manual Operacional
            </h1>
            <p className="text-sm text-slate-500">
              Consulte a arquitetura técnica, os motores cross-segmento, o módulo imobiliário e os manuais de usuário.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const iframe = document.getElementById('docs-iframe') as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <span>Abrir em Nova Aba</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Frame Visualizador Docsify */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        <iframe
          id="docs-iframe"
          src={docsUrl}
          className="w-full h-full border-0"
          title="Documentação Viva NetImobiliária"
        />
      </div>
    </div>
  );
}
