/* eslint-disable */
class ApiClient {
  private baseURL: string

  constructor(baseURL: string = '') {
    this.baseURL = baseURL
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      // Se o token expirou, tentar renovar
      if (response.status === 401) {
        const refreshed = await this.refreshToken()
        if (refreshed) {
          // Tentar a requisiÃ§Ã£o novamente
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
      console.error('Erro na requisiÃ§Ã£o:', error)
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


