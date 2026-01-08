/* eslint-disable */
'use client'

import { useState, useMemo, useCallback } from 'react'
import { PAGINATION_CONFIG } from '@/lib/config/constants'

export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  total?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
}

export interface UsePaginationReturn {
  // Estado da paginaÃ§Ã£o
  pagination: PaginationState
  
  // FunÃ§Ãµes para controlar paginaÃ§Ã£o
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setTotal: (total: number) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  
  // FunÃ§Ãµes utilitÃ¡rias
  getOffset: () => number
  getPageNumbers: () => number[]
  canGoNext: boolean
  canGoPrev: boolean
  
  // ConfiguraÃ§Ãµes
  pageSizeOptions: number[]
  maxPageSize: number
  minPageSize: number
}

/**
 * Hook personalizado para gerenciar paginaÃ§Ã£o
 * Centraliza toda a lÃ³gica de paginaÃ§Ã£o usando constantes configuradas
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    total = 0,
    onPageChange,
    onLimitChange
  } = options

  // Estado da paginaÃ§Ã£o
  const [page, setPageState] = useState(initialPage)
  const [limit, setLimitState] = useState(
    Math.min(initialLimit, PAGINATION_CONFIG.MAX_PAGE_SIZE)
  )
  const [totalItems, setTotalItems] = useState(total)

  // Calcular valores derivados
  const totalPages = Math.max(1, Math.ceil(totalItems / limit))
  const hasNext = page < totalPages
  const hasPrev = page > 1
  const canGoNext = hasNext
  const canGoPrev = hasPrev

  // Estado da paginaÃ§Ã£o
  const pagination: PaginationState = useMemo(() => ({
    page,
    limit,
    total: totalItems,
    totalPages,
    hasNext,
    hasPrev
  }), [page, limit, totalItems, totalPages, hasNext, hasPrev])

  // FunÃ§Ã£o para definir pÃ¡gina com validaÃ§Ã£o
  const setPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages))
    setPageState(validPage)
    onPageChange?.(validPage)
  }, [totalPages, onPageChange])

  // FunÃ§Ã£o para definir limite com validaÃ§Ã£o
  const setLimit = useCallback((newLimit: number) => {
    const validLimit = Math.max(
      PAGINATION_CONFIG.MIN_PAGE_SIZE,
      Math.min(newLimit, PAGINATION_CONFIG.MAX_PAGE_SIZE)
    )
    setLimitState(validLimit)
    
    // Recalcular pÃ¡gina atual se necessÃ¡rio
    const newTotalPages = Math.max(1, Math.ceil(totalItems / validLimit))
    if (page > newTotalPages) {
      setPageState(newTotalPages)
    }
    
    onLimitChange?.(validLimit)
  }, [totalItems, page, onLimitChange])

  // FunÃ§Ã£o para definir total
  const setTotal = useCallback((newTotal: number) => {
    setTotalItems(newTotal)
    
    // Ajustar pÃ¡gina atual se necessÃ¡rio
    const newTotalPages = Math.max(1, Math.ceil(newTotal / limit))
    if (page > newTotalPages) {
      setPageState(newTotalPages)
    }
  }, [limit, page])

  // FunÃ§Ã£o para prÃ³xima pÃ¡gina
  const nextPage = useCallback(() => {
    if (canGoNext) {
      setPage(page + 1)
    }
  }, [canGoNext, page, setPage])

  // FunÃ§Ã£o para pÃ¡gina anterior
  const prevPage = useCallback(() => {
    if (canGoPrev) {
      setPage(page - 1)
    }
  }, [canGoPrev, page, setPage])

  // FunÃ§Ã£o para ir para pÃ¡gina especÃ­fica
  const goToPage = useCallback((targetPage: number) => {
    setPage(targetPage)
  }, [setPage])

  // Calcular offset para queries
  const getOffset = useCallback(() => {
    return (page - 1) * limit
  }, [page, limit])

  // Gerar nÃºmeros das pÃ¡ginas para exibiÃ§Ã£o
  const getPageNumbers = useCallback(() => {
    const maxVisible = PAGINATION_CONFIG.MAX_VISIBLE_PAGES
    const half = Math.floor(maxVisible / 2)
    
    let start = Math.max(1, page - half)
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    // Ajustar inÃ­cio se estiver no final
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    const pages: number[] = []
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }, [page, totalPages])

  return {
    // Estado
    pagination,
    
    // FunÃ§Ãµes de controle
    setPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    
    // FunÃ§Ãµes utilitÃ¡rias
    getOffset,
    getPageNumbers,
    canGoNext,
    canGoPrev,
    
    // ConfiguraÃ§Ãµes
    pageSizeOptions: [...PAGINATION_CONFIG.PAGE_SIZE_OPTIONS],
    maxPageSize: PAGINATION_CONFIG.MAX_PAGE_SIZE,
    minPageSize: PAGINATION_CONFIG.MIN_PAGE_SIZE
  }
}

/**
 * Hook para paginaÃ§Ã£o com URL (usando searchParams)
 * Sincroniza estado da paginaÃ§Ã£o com URL
 */
export function usePaginationWithURL(
  searchParams: URLSearchParams,
  total: number = 0,
  options: Omit<UsePaginationOptions, 'initialPage' | 'initialLimit'> = {}
) {
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(
    parseInt(searchParams.get('limit') || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE.toString()),
    PAGINATION_CONFIG.MAX_PAGE_SIZE
  )

  return usePagination({
    ...options,
    initialPage: page,
    initialLimit: limit,
    total
  })
}

export default usePagination

