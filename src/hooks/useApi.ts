import { useCallback } from 'react'

/**
 * Hook personalizado para fazer requisições autenticadas para APIs admin
 */
export function useApi() {
  const makeRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    // Buscar token em localStorage primeiro, depois em cookies
    let token = localStorage.getItem('admin-auth-token')

    if (!token) {
      // Se não encontrou no localStorage, buscar nos cookies
      const cookies = document.cookie.split(';')
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='))
      if (tokenCookie) {
        token = tokenCookie.split('=')[1]
      }
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Adicionar token de autorização se disponível
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    // Mesclar headers padrão com headers fornecidos
    const headers = {
      ...defaultHeaders,
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      return response
    } catch (error) {
      console.error('Erro na requisição:', error)
      throw error
    }
  }, [])

  // Métodos de conveniência
  const get = useCallback((url: string, options?: RequestInit) => {
    return makeRequest(url, { ...options, method: 'GET' })
  }, [makeRequest])

  const post = useCallback((url: string, data?: any, options?: RequestInit) => {
    return makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const put = useCallback((url: string, data?: any, options?: RequestInit) => {
    return makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const patch = useCallback((url: string, data?: any, options?: RequestInit) => {
    return makeRequest(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }, [makeRequest])

  const del = useCallback((url: string, options?: RequestInit) => {
    return makeRequest(url, { ...options, method: 'DELETE' })
  }, [makeRequest])

  return {
    makeRequest,
    get,
    post,
    put,
    patch,
    delete: del,
  }
}
