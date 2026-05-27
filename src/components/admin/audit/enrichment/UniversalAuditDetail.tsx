'use client';

import React from 'react';
import { 
  TableCellsIcon, 
  ArrowPathIcon, 
  TagIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  HashtagIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface UniversalAuditDetailProps {
  data: any;
  action: string;
  tableName: string;
}

/**
 * ============================================================
 * UNIVERSAL AUDIT DETAIL - O "Cérebro" de Enriquecimento Automático
 * ============================================================
 * Este componente renderiza qualquer payload de auditoria de forma
 * elegante e organizada, tratando tipos de dados automaticamente.
 * ============================================================
 */
export default function UniversalAuditDetail({ data, action, tableName }: UniversalAuditDetailProps) {
  if (!data) return null;

  // Função auxiliar para formatar valores dinamicamente
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400 italic">Nulo</span>;
    
    if (typeof value === 'boolean') {
      return value ? (
        <span className="inline-flex items-center text-green-600 font-medium">
          <CheckCircleIcon className="w-4 h-4 mr-1" /> Sim
        </span>
      ) : (
        <span className="inline-flex items-center text-red-600 font-medium">
          <XCircleIcon className="w-4 h-4 mr-1" /> Não
        </span>
      );
    }

    if (typeof value === 'number') {
      // Heurística para Moeda: campos que contêm 'valor', 'preco', 'custo', 'price'
      if (key.toLowerCase().match(/valor|preco|custo|price|total|reserva/)) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      }
      return value.toLocaleString('pt-BR');
    }

    // Heurística para Datas
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) { /* ignore */ }
    }

    return String(value);
  };

  // Ícone baseado no nome do campo (Heurística)
  const getIconForKey = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('data') || k.includes('created') || k.includes('updated')) return CalendarDaysIcon;
    if (k.includes('valor') || k.includes('preco') || k.includes('money')) return CurrencyDollarIcon;
    if (k.includes('id') || k.includes('codigo') || k.includes('num')) return HashtagIcon;
    if (k.includes('status') || k.includes('ativo') || k.includes('active')) return TagIcon;
    return InformationCircleIcon;
  };

  const entries = Object.entries(data).filter(([key]) => !['id', 'created_at', 'updated_at', 'tenant_id'].includes(key));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <TableCellsIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Detalhes da Entidade: <span className="text-blue-600">{tableName}</span>
            </h4>
            <p className="text-[10px] text-gray-500 font-medium">Visualização Automática Inteligente</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
          action === 'CREATE' ? 'bg-green-100 text-green-700' :
          action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`}>
          Ação: {action}
        </div>
      </div>

      <div className="p-4">
        {entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map(([key, value]) => {
              const Icon = getIconForKey(key);
              return (
                <div key={key} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors shadow-sm group">
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight truncate">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 break-words pl-6">
                    {formatValue(key, value)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <ArrowPathIcon className="w-10 h-10 text-gray-300 mx-auto mb-2 animate-spin-slow" />
            <p className="text-sm text-gray-500">Processando dados brutos...</p>
          </div>
        )}
      </div>
      
      <div className="bg-gray-100 px-4 py-2 border-t border-gray-200">
        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest text-center">
          &copy; NetImobiliária - Governança Master de Auditoria
        </p>
      </div>
    </div>
  );
}
