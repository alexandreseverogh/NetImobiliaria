/**
 * ============================================================
 * HOOK: useAuthenticatedFetch
 * ============================================================
 * 
 * OBJETIVO: Centralizar fetch com autenticação automática
 * 
 * BENEFÍCIOS:
 * - Token adicionado automaticamente
 * - Tratamento de erro padrão
 * - Reutilizável em TODAS as páginas
 * 
 * USO:
 * const { fetch } = useAuthenticatedFetch()
 * const data = await fetch('/api/admin/amenidades')
 * ============================================================
 */

import { useCallback } from 'react'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export function useAuthenticatedFetch() {
  /**
   * Fetch com autenticação automática
   */
  const authenticatedFetch = useCallback(async (
    url: string,
    options: FetchOptions = {}
  ) => {
    const { skipAuth = false, headers = {}, body, ...restOptions } = options

    // Preparar headers
    const requestHeaders = new Headers(headers as HeadersInit)

    // REGRA CRÍTICA: Adicionar Content-Type APENAS se houver body E não for FormData
    if (body) {
      if (!(body instanceof FormData)) {
        requestHeaders.set('Content-Type', 'application/json')
      }
      // Se for FormData, navegador define Content-Type automaticamente com boundary
    }

    // Adicionar token automaticamente (exceto se skipAuth = true)
    if (!skipAuth) {
      // Tentar obter token: priorizar admin, depois público
      const adminToken = localStorage.getItem('admin-auth-token')
      const publicToken = localStorage.getItem('auth-token')
      const token = adminToken || publicToken

      if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`)
      }
    }

    // Executar fetch
    // Executar fetch
    try {
      const response = await fetch(url, {
        ...restOptions,
        body,
        headers: requestHeaders
      })

      if (response.status === 401) {
        // Tentar ler o corpo do erro para debug (sem consumir o stream principal se possível, ou clonando)
        try {
          const clone = response.clone()
          const errorBody = await clone.json()
          console.error(`❌ [useAuthenticatedFetch] 401 Não Autorizado em ${url} \nDEBUG: ${JSON.stringify(errorBody.debug, null, 2)} \nERROR: ${errorBody.error}`)
        } catch (e) {
          console.warn(`⚠️ [useAuthenticatedFetch] 401 recebido de ${url}, mas não foi possível ler detalhes de debug.`)
        }
      }

      return response
    } catch (error) {
      throw error
    }
  }, [])

  /**
   * GET com autenticação
   */
  const get = useCallback(async (url: string) => {
    return authenticatedFetch(url, { method: 'GET' })
  }, [authenticatedFetch])

  /**
   * POST com autenticação
   */
  const post = useCallback(async (url: string, data: any) => {
    return authenticatedFetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }, [authenticatedFetch])

  /**
   * PUT com autenticação
   */
  const put = useCallback(async (url: string, data: any) => {
    return authenticatedFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }, [authenticatedFetch])

  /**
   * DELETE com autenticação
   */
  const del = useCallback(async (url: string) => {
    return authenticatedFetch(url, { method: 'DELETE' })
  }, [authenticatedFetch])

  return {
    fetch: authenticatedFetch,
    get,
    post,
    put,
    delete: del
  }
}

