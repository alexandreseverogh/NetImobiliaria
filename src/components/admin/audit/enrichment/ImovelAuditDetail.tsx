'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Square, Car, Bed, BedDouble, Bath, Home, Building, Layers } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';

interface ImovelAuditDetailProps {
  resourceId: string | null;
  details: any;
  action: string;
}

export default function ImovelAuditDetail({ resourceId, details, action }: ImovelAuditDetailProps) {
  const { get } = useApi();
  const [imovel, setImovel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchImovel() {
      if (!resourceId) return;
      
      try {
        setLoading(true);
        const response = await get(`/api/admin/imoveis/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setImovel(data.data);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do imóvel para auditoria:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (action !== 'DELETE') {
      fetchImovel();
    } else {
      setError(true);
    }
  }, [resourceId, action, get]);

  const renderOriginalDetails = () => {
    if (!details) return <span>-</span>;
    if (typeof details === 'object') {
      return (
        <pre className="overflow-auto text-xs bg-gray-50 border border-gray-200 p-3 rounded-lg mt-2 font-mono shadow-inner">
          {JSON.stringify(details, null, 2)}
        </pre>
      );
    }
    return <span className="text-gray-700">{String(details)}</span>;
  };

  const formatarPreco = (valor: any) => {
    const num = Number(valor);
    if (!num || num <= 0) return 'Preço sob Consulta';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  // Renderização da parte superior com imagem principal se existir
  const getImagemPrincipal = () => {
    if (!imovel?.imagens || !Array.isArray(imovel.imagens)) return null;
    const principal = imovel.imagens.find((img: any) => img.principal || img.is_principal);
    if (principal) return principal.url;
    return imovel.imagens[0]?.url || null;
  };

  const imageUrl = getImagemPrincipal();

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center space-x-2 text-sm text-gray-500 py-4">
          <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          <span>Buscando informações atuais do imóvel...</span>
        </div>
      ) : imovel ? (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-400 p-6 overflow-y-auto">
          {/* Título do Imóvel para contexto (adicionado, pois no design original ficava fora do card direito) */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h4 className="text-xl font-bold text-gray-900">
              {imovel.codigo ? `[${imovel.codigo}] ` : ''}{imovel.titulo}
            </h4>
            <div className="flex gap-2 mt-2">
               {imovel.tipo_nome && (
                 <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                   {imovel.tipo_nome}
                 </span>
               )}
               {imovel.finalidade_nome && (
                 <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                   {imovel.finalidade_nome}
                 </span>
               )}
               {imovel.status_nome && (
                 <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                   {imovel.status_nome}
                 </span>
               )}
            </div>
          </div>

          {/* Linha 1 - Preço */}
          <div className="mb-4 flex items-center bg-gray-50 p-2 rounded-lg">
            <CurrencyDollarIcon className="w-7 h-7 mr-2 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">
              {Number(imovel.preco || imovel.valor_venda || imovel.valor_aluguel) > 0
                ? formatarPreco(imovel.preco || imovel.valor_venda || imovel.valor_aluguel)
                : 'Preço sob Consulta'}
            </span>
          </div>

          {/* Linha 2 - Descrição */}
          {imovel.descricao && imovel.descricao.trim() && (
            <div className="mb-4">
              <p className="text-gray-900 leading-tight text-sm line-clamp-3" title={imovel.descricao}>
                {imovel.descricao}
              </p>
            </div>
          )}

          {/* Linha 3 - Localização */}
          <div className="mb-4 flex items-center text-sm">
            <SafeImage src="/Assets/mapa.png" alt="Mapa" width={20} height={20} className="w-5 h-5 mr-2" />
            <span className="text-gray-700">
              {imovel.estado_sigla || imovel.estado_fk} • {imovel.cidade_nome || imovel.cidade_fk} • {imovel.endereco}, {imovel.numero} • CEP: {imovel.cep}
              {imovel.complemento && ` • ${imovel.complemento}`}
            </span>
          </div>

          {/* Linha 4 - Características, Custos e Áreas em Grid de 2 Colunas */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            {/* Coluna 1 - Características Físicas */}
            <div className="space-y-1">
              {Number(imovel.quartos) > 0 && (
                <div className="flex items-center text-xs">
                  <Bed className="w-3.5 h-3.5 mr-1 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.quartos} quartos</span>
                </div>
              )}
              {Number(imovel.suites) > 0 && (
                <div className="flex items-center text-xs">
                  <BedDouble className="w-3.5 h-3.5 mr-1 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.suites} {Number(imovel.suites) > 1 ? 'suítes' : 'suíte'}</span>
                </div>
              )}
              {Number(imovel.banheiros) > 0 && (
                <div className="flex items-center text-xs">
                  <Bath className="w-3.5 h-3.5 mr-1 text-cyan-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.banheiros} banheiros</span>
                </div>
              )}
              {Number(imovel.varanda) > 0 && (
                <div className="flex items-center text-xs">
                  <Home className="w-3.5 h-3.5 mr-1 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.varanda} varanda</span>
                </div>
              )}
              {Number(imovel.vagas_garagem) > 0 && (
                <div className="flex items-center text-xs">
                  <Car className="w-3.5 h-3.5 mr-1 text-orange-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.vagas_garagem} {Number(imovel.vagas_garagem) > 1 ? 'vagas' : 'vaga'} garagem</span>
                </div>
              )}
            </div>

            {/* Coluna 2 - Custos, Áreas e Andares */}
            <div className="space-y-1">
              {/* Custos (Ocultar se 0) */}
              {Number(imovel.preco_condominio || imovel.valor_condominio) > 0 && (
                <div className="flex items-center text-xs">
                  <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">Condomínio: {formatarPreco(imovel.preco_condominio || imovel.valor_condominio)}</span>
                </div>
              )}
              {Number(imovel.preco_iptu || imovel.valor_iptu) > 0 && (
                <div className="flex items-center text-xs">
                  <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0" />
                  <span className="text-gray-700 truncate">IPTU: {formatarPreco(imovel.preco_iptu || imovel.valor_iptu)}</span>
                </div>
              )}
              {Number(imovel.taxa_extra) > 0 && (
                <div className="flex items-center text-xs">
                  <CurrencyDollarIcon className="w-3.5 h-3.5 mr-1 text-emerald-700 flex-shrink-0" />
                  <span className="text-gray-700 truncate">Taxa Extra: {formatarPreco(imovel.taxa_extra)}</span>
                </div>
              )}

              {/* Áreas (Sempre exibir se informado) */}
              {imovel.area_total !== null && imovel.area_total !== undefined && Number(imovel.area_total) > 0 && (
                <div className="flex items-center text-xs">
                  <Square className="w-3.5 h-3.5 mr-1 text-indigo-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.area_total}m² total</span>
                </div>
              )}
              {imovel.area_construida !== null && imovel.area_construida !== undefined && Number(imovel.area_construida) > 0 && (
                <div className="flex items-center text-xs">
                  <Square className="w-3.5 h-3.5 mr-1 text-indigo-600 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.area_construida}m² const.</span>
                </div>
              )}

              {/* Outros Detalhes */}
              {imovel.andar !== null && imovel.andar !== undefined && (
                <div className="flex items-center text-xs">
                  <Layers className="w-3.5 h-3.5 mr-1 text-pink-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">Andar: {imovel.andar}</span>
                </div>
              )}
              {imovel.total_andares !== null && imovel.total_andares !== undefined && Number(imovel.total_andares) > 0 && (
                <div className="flex items-center text-xs">
                  <Building className="w-3.5 h-3.5 mr-1 text-rose-500 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{imovel.total_andares} andares</span>
                </div>
              )}
            </div>
          </div>

          {/* Linha 7 - Badges com fundo discreto */}
          {(imovel.aceita_permuta || imovel.aceita_financiamento) && (
            <div className="bg-gray-50 rounded-lg p-2 flex flex-wrap gap-2">
              {imovel.aceita_permuta && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium">
                  ✓ Aceita Permuta
                </span>
              )}
              {imovel.aceita_financiamento && (
                <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium">
                  ✓ Aceita Financiamento
                </span>
              )}
            </div>
          )}
        </div>
      ) : error ? (
        <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-200 flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800 mb-1">Informações do Imóvel Indisponíveis</p>
            <p>
              {action === 'DELETE' 
                ? 'Este imóvel foi excluído e os dados completos não estão mais disponíveis no banco de dados.'
                : 'Não foi possível carregar as informações atuais deste imóvel. Ele pode ter sido permanentemente excluído.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-200 pb-2">
          Payload da Auditoria ({action})
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Os dados abaixo representam exatamente o que foi enviado/modificado durante esta ação específica.
        </p>
        {renderOriginalDetails()}
      </div>
    </div>
  );
}
