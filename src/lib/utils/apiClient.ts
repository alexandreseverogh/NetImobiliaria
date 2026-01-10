class ApiClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`

    // Adicionar token do localStorage se existir
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null

    // Preparar headers mesclando default + auth + options
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Se o token expirou, tentar renovar
      if (response.status === 401) {
        // Tentar ler o corpo da resposta para verificar o código de erro
        const clone = response.clone()
        try {
          const errorBody = await clone.json()
          if (errorBody.code === 'USER_NOT_FOUND' || errorBody.code === 'INVALID_TOKEN' || errorBody.error === 'Usuário inválido ou inativo') {
            console.warn('🚫 Usuário inválido detectado na API. Limpando sessão...')
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-token')
              localStorage.removeItem('user-data')
              window.location.href = '/landpaging' // Forçar saída
            }
            return response // Retorna o 401 para encerrar o fluxo
          }
        } catch { /* ignora erro de parse */ }

        const refreshed = await this.refreshToken()
        if (refreshed) {
          // Tentar a requisição novamente
          return fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          })
        }
      }

      return response
    } catch (error) {
      console.error('Erro na requisição:', error)
      throw error
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
      })
      return response.ok
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      return false
    }
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' })
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

