'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Imovel } from '@/lib/database/imoveis'

interface ImovelGridProps {
  imoveis: Imovel[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
        </button>
      </div>
      
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{startItem}</span> até <span className="font-medium">{endItem}</span> de{' '}
            <span className="font-medium">{totalItems}</span> resultados
          </p>
        </div>
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Anterior</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {getVisiblePages().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? onPageChange(page) : undefined}
                disabled={typeof page !== 'number'}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : page === '...'
                    ? 'border-gray-300 bg-white text-gray-700 cursor-default'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Próximo</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

function ImovelCard({ imovel }: { imovel: Imovel }) {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
      {/* Header do Card com Código */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-center">
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-white font-bold text-sm">{imovel.codigo || String(imovel.id).slice(-8)}</span>
            </div>
          </div>
          <Link
            href={`/admin/imoveis/${imovel.id}/edicao`}
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-6 space-y-4">
        {/* Localização */}
        <div className="flex items-center space-x-2 text-gray-600">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium">{imovel.estado_fk || 'N/A'}</span>
          <span className="text-gray-400">•</span>
          <span className="font-medium">{imovel.cidade_fk || 'N/A'}</span>
          <span className="text-gray-400">•</span>
          <span className="font-medium">{imovel.bairro || 'N/A'}</span>
        </div>

        {/* Endereço */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">{imovel.endereco || 'N/A'}</span>
          {imovel.numero && <span>, {imovel.numero}</span>}
          {imovel.cep && <span> • CEP: {imovel.cep}</span>}
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-medium uppercase tracking-wide">Preço</div>
            <div className="text-sm font-bold text-green-700">
              R$ {imovel.preco ? Number(imovel.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Condomínio</div>
            <div className="text-sm font-bold text-blue-700">
              R$ {imovel.preco_condominio ? Number(imovel.preco_condominio).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </div>
          </div>
        </div>

        {/* Características */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Quartos</div>
            <div className="text-lg font-semibold text-gray-900">{imovel.quartos || '0'}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Banheiros</div>
            <div className="text-lg font-semibold text-gray-900">{imovel.banheiros || '0'}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Suítes</div>
            <div className="text-lg font-semibold text-gray-900">{imovel.suites || '0'}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500">Garagem</div>
            <div className="text-lg font-semibold text-gray-900">{imovel.vagas_garagem || '0'}</div>
          </div>
        </div>

        {/* Detalhes Adicionais */}
        <div className="flex justify-between text-sm text-gray-600">
          <div className="flex space-x-4">
            {imovel.varanda && imovel.varanda > 0 && (
              <span>Varanda: {imovel.varanda}</span>
            )}
          </div>
          {(imovel.andar || imovel.total_andares) && (
            <div className="flex space-x-2">
              {imovel.andar && <span>Andar: {imovel.andar}</span>}
              {imovel.total_andares && <span>de {imovel.total_andares}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Footer do Card */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
        <Link
          href={`/admin/imoveis/${imovel.id}/edicao`}
          className="w-full bg-blue-400 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Editar Imóvel</span>
        </Link>
      </div>
    </div>
  )
}

export default function ImovelGrid({ imoveis, loading, error, onRetry }: ImovelGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Calcular paginação
  const totalPages = Math.ceil(imoveis.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentImoveis = imoveis.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll para o topo do grid
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-xl font-medium">Carregando imóveis...</p>
          <p className="mt-2 text-gray-500">Aguarde enquanto buscamos os dados</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl font-semibold text-red-800 mb-2">Erro ao carregar imóveis</p>
            <p className="text-red-600 mb-6">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (imoveis.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-12 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xl font-semibold text-gray-900 mb-2">Nenhum imóvel encontrado</p>
            <p className="text-gray-600">Nenhum imóvel corresponde aos filtros selecionados.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header com contador */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Imóveis Cadastrados
          </h2>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {imoveis.length} {imoveis.length === 1 ? 'imóvel' : 'imóveis'}
          </div>
        </div>
      </div>

      {/* Grid de Imóveis */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentImoveis.map((imovel) => (
            <ImovelCard key={imovel.id} imovel={imovel} />
          ))}
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={imoveis.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </div>
  )
}
