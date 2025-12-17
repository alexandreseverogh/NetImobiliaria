'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as HeroIcons from '@heroicons/react/24/outline';

interface Categoria {
  id: number;
  nome: string;
  slug: string;
  cor: string;
  icone: string;
  total_feeds: number;
}

interface FeedPost {
  id: number;
  titulo: string;
  resumo: string;
  url_original: string;
  url_imagem: string | null;
  data_publicacao: string;
  categoria_nome: string;
  categoria_cor: string;
  categoria_icone: string;
  fonte_nome: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Componente de Ícone Dinâmico
const IconRenderer = ({ iconName, className }: { iconName: string, className?: string }) => {
  const Icon = (HeroIcons as any)[iconName];
  return Icon ? <Icon className={className} /> : null;
};

export default function FeedCategoriasSection() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [feeds, setFeeds] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  // Carregar categorias ao montar o componente
  useEffect(() => {
    async function fetchCategorias() {
      try {
        console.log('🔍 [FeedCategoriasSection] Buscando categorias...');
        const res = await fetch('/api/public/feed/categorias', {
          cache: 'no-store'
        });
        
        console.log('🔍 [FeedCategoriasSection] Status da resposta:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('🔍 [FeedCategoriasSection] Dados recebidos:', data);
          if (data.success && Array.isArray(data.data)) {
            console.log('✅ [FeedCategoriasSection] Categorias recebidas:', data.data.length);
            setCategorias(data.data);
          } else {
            console.warn('⚠️ [FeedCategoriasSection] Formato de resposta inválido:', data);
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('❌ [FeedCategoriasSection] Erro na resposta:', res.status);
          console.error('❌ [FeedCategoriasSection] Detalhes do erro:', errorData);
          if (errorData.details) {
            console.error('❌ [FeedCategoriasSection] Stack trace:', errorData.details);
          }
        }
      } catch (error) {
        console.error('❌ [FeedCategoriasSection] Erro ao carregar categorias:', error);
      } finally {
        setLoadingCategorias(false);
      }
    }

    fetchCategorias();
  }, []);

  // Carregar feeds quando categoria for selecionada
  useEffect(() => {
    if (categoriaSelecionada) {
      fetchFeedsPorCategoria(categoriaSelecionada, page);
    } else {
      setFeeds([]);
      setPagination(null);
    }
  }, [categoriaSelecionada, page]);

  async function fetchFeedsPorCategoria(categoriaId: number, pageNum: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/feed/categoria/${categoriaId}?page=${pageNum}&limit=20`, {
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeeds(data.data || []);
          setPagination(data.pagination || null);
        }
      } else {
        console.error('Erro ao carregar feeds da categoria');
      }
    } catch (error) {
      console.error('Erro ao buscar feeds:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoriaClick(categoriaId: number) {
    if (categoriaSelecionada === categoriaId) {
      // Se clicar na mesma categoria, fecha
      setCategoriaSelecionada(null);
      setPage(1);
    } else {
      // Seleciona nova categoria
      setCategoriaSelecionada(categoriaId);
      setPage(1);
    }
  }

  function handleVoltar() {
    setCategoriaSelecionada(null);
    setFeeds([]);
    setPagination(null);
    setPage(1);
  }

  // Não exibir se não houver categorias (após carregar)
  if (!loadingCategorias && categorias.length === 0) {
    return null;
  }

  const categoriaAtiva = categorias.find(c => c.id === categoriaSelecionada);

  return (
    <div className="w-full py-8 mt-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-[2496px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Loading State para Categorias */}
        {loadingCategorias && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando categorias...</p>
          </div>
        )}

        {/* Botões de Categoria */}
        {!loadingCategorias && !categoriaSelecionada && categorias.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Explore feeds por categoria
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {categorias.map((categoria) => (
                <button
                  key={categoria.id}
                  onClick={() => handleCategoriaClick(categoria.id)}
                  className="inline-flex items-center px-6 py-3 rounded-lg text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: categoria.cor + '15',
                    color: categoria.cor,
                    border: `2px solid ${categoria.cor}40`
                  }}
                >
                  <IconRenderer iconName={categoria.icone} className="w-5 h-5 mr-2" />
                  {categoria.nome}
                  <span className="ml-3 px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: categoria.cor + '30' }}>
                    {categoria.total_feeds}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Feeds da Categoria Selecionada */}
        {categoriaSelecionada && (
          <div>
            {/* Cabeçalho da Categoria */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleVoltar}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  aria-label="Voltar"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <IconRenderer 
                    iconName={categoriaAtiva?.icone || 'NewspaperIcon'} 
                    className="w-6 h-6"
                    style={{ color: categoriaAtiva?.cor }}
                  />
                  <h3 className="text-2xl font-bold text-gray-900">
                    {categoriaAtiva?.nome}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({pagination?.total || 0} feeds)
                  </span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Carregando feeds...</p>
              </div>
            )}

            {/* Grid de Feeds */}
            {!loading && feeds.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {feeds.map((feed) => (
                    <Link
                      key={feed.id}
                      href={feed.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 h-full"
                    >
                      {/* Imagem */}
                      <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                        {feed.url_imagem ? (
                          <Image
                            src={feed.url_imagem}
                            alt={feed.titulo}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-300">
                            <IconRenderer iconName={feed.categoria_icone} className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="p-4 flex flex-col flex-grow">
                        {/* Metadados */}
                        <div className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                          <span className="font-medium text-blue-600">{feed.fonte_nome}</span>
                          <span>•</span>
                          <time dateTime={feed.data_publicacao}>
                            {new Date(feed.data_publicacao).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </time>
                        </div>

                        {/* Título */}
                        <h4 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {feed.titulo}
                        </h4>

                        {/* Resumo */}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">
                          {feed.resumo.replace(/<[^>]*>?/gm, '')}
                        </p>

                        {/* Link */}
                        <div className="pt-3 mt-auto border-t border-gray-50 flex items-center text-blue-600 text-xs font-medium">
                          Ler mais
                          <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Paginação */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev || loading}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={!pagination.hasNext || loading}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Estado vazio */}
            {!loading && feeds.length === 0 && (
              <div className="text-center py-12">
                <IconRenderer 
                  iconName={categoriaAtiva?.icone || 'NewspaperIcon'} 
                  className="w-16 h-16 mx-auto text-gray-300 mb-4"
                />
                <p className="text-gray-600">Nenhum feed encontrado nesta categoria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

